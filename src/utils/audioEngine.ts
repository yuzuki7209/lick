import * as Tone from 'tone';
import type { Lick, Measure, PlaybackOptions } from '../types/music';
import { noteToToneName, durationToTone, DURATION_VALUES } from '../types/music';
import { getDrumPattern } from './drumPatterns';
import { generateWalkingBass } from './walkingBass';

type PositionCallback = (measureIdx: number, beatIdx: number) => void;

type PartEvent = { time: string; note?: string; duration?: string; measureIdx?: number; beatIdx?: number };

class AudioEngine {
  private piano: Tone.PolySynth | null = null;
  private kick: Tone.MembraneSynth | null = null;
  private snare: Tone.NoiseSynth | null = null;
  private hihat: Tone.MetalSynth | null = null;
  private ride: Tone.MetalSynth | null = null;
  private rimshot: Tone.MembraneSynth | null = null;
  private bass: Tone.Synth | null = null;
  private bassFilter: Tone.Filter | null = null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private sequences: any[] = [];
  private initialized = false;
  private onPosition: PositionCallback | null = null;

  private async ensureInit() {
    if (this.initialized) return;
    await Tone.start();

    this.piano = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.02, decay: 0.4, sustain: 0.5, release: 1.5 },
      volume: -6,
    }).toDestination();

    this.kick = new Tone.MembraneSynth({
      pitchDecay: 0.06,
      octaves: 7,
      envelope: { attack: 0.001, decay: 0.35, sustain: 0, release: 0.1 },
      volume: -4,
    }).toDestination();

    this.snare = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.05 },
      volume: -6,
    }).toDestination();

    this.hihat = new Tone.MetalSynth({
      harmonicity: 5.1,
      modulationIndex: 32,
      resonance: 5000,
      octaves: 1,
      envelope: { attack: 0.001, decay: 0.06, release: 0.01 },
      volume: -14,
    }).toDestination();

    this.ride = new Tone.MetalSynth({
      harmonicity: 5.1,
      modulationIndex: 12,
      resonance: 3200,
      octaves: 1.5,
      envelope: { attack: 0.001, decay: 0.35, release: 0.25 },
      volume: -12,
    }).toDestination();

    this.rimshot = new Tone.MembraneSynth({
      pitchDecay: 0.008,
      octaves: 2,
      envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.04 },
      volume: -10,
    }).toDestination();

    this.bassFilter = new Tone.Filter(500, 'lowpass').toDestination();
    this.bass = new Tone.Synth({
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.5 },
      volume: -8,
    }).connect(this.bassFilter);

    this.initialized = true;
  }

  setPositionCallback(cb: PositionCallback | null) {
    this.onPosition = cb;
  }

  async play(lick: Lick, options: PlaybackOptions = {}) {
    await this.ensureInit();
    this.stop();

    const transport = Tone.getTransport();
    transport.bpm.value = lick.bpm;

    if (lick.rhythmPattern === 'swing') {
      transport.swing = 0.5;
      transport.swingSubdivision = '8n';
    } else {
      transport.swing = 0;
    }

    if (options.melody !== false) {
      this.scheduleMelody(lick.measures);
    }

    if (options.drums !== false) {
      this.scheduleDrums(lick);
    }

    if (options.bass !== false) {
      this.scheduleWalkingBass(lick.measures);
    }

    transport.loopStart = 0;
    transport.loopEnd = `${lick.bars}m`;
    transport.loop = true;
    transport.start('+0.1');
  }

  stop() {
    const transport = Tone.getTransport();
    transport.stop();
    transport.cancel();
    transport.loop = false;

    for (const seq of this.sequences) {
      try { seq.stop(); seq.dispose(); } catch { /* ignore */ }
    }
    this.sequences = [];
  }

  dispose() {
    this.stop();
    this.piano?.dispose();
    this.kick?.dispose();
    this.snare?.dispose();
    this.hihat?.dispose();
    this.ride?.dispose();
    this.rimshot?.dispose();
    this.bass?.dispose();
    this.bassFilter?.dispose();
    this.initialized = false;
  }

  private scheduleMelody(measures: Measure[]) {
    const events: PartEvent[] = [];

    for (let mIdx = 0; mIdx < measures.length; mIdx++) {
      let beatInMeasure = 0;
      for (const note of measures[mIdx].notes) {
        const beatValue = DURATION_VALUES[note.duration] * (note.isDotted ? 1.5 : 1);
        if (!note.isRest) {
          events.push({
            time: `${mIdx}:${beatInMeasure}:0`,
            note: noteToToneName(note),
            duration: durationToTone(note.duration, note.isDotted),
            measureIdx: mIdx,
            beatIdx: Math.floor(beatInMeasure),
          });
        }
        beatInMeasure += beatValue;
      }
    }

    if (events.length === 0) return;

    const part = new Tone.Part((time: number, ev: PartEvent) => {
      if (ev.note && ev.duration) {
        this.piano?.triggerAttackRelease(ev.note, ev.duration, time);
      }
      if (this.onPosition && ev.measureIdx !== undefined && ev.beatIdx !== undefined) {
        Tone.getDraw().schedule(() => {
          this.onPosition?.(ev.measureIdx!, ev.beatIdx!);
        }, time);
      }
    }, events);

    part.start(0);
    part.loop = false;
    this.sequences.push(part);
  }

  private scheduleDrums(lick: Lick) {
    const pattern = getDrumPattern(lick.rhythmPattern);
    const totalSteps = pattern.stepSize === '8t' ? 12 : 16;

    const kickArr = Array(totalSteps).fill(0);
    const snareArr = Array(totalSteps).fill(0);
    const hihatArr = Array(totalSteps).fill(0);
    const rideArr = Array(totalSteps).fill(0);
    const rimshotArr = Array(totalSteps).fill(0);

    for (const h of pattern.kick) kickArr[h.step % totalSteps] = h.velocity;
    for (const h of pattern.snare) snareArr[h.step % totalSteps] = h.velocity;
    for (const h of pattern.hihat) hihatArr[h.step % totalSteps] = h.velocity;
    for (const h of pattern.ride) rideArr[h.step % totalSteps] = h.velocity;
    for (const h of pattern.rimshot) rimshotArr[h.step % totalSteps] = h.velocity;

    const makeSeq = (arr: number[], cb: (time: number, vel: number) => void) => {
      const seq = new Tone.Sequence<number>((time, vel) => {
        if (vel > 0) cb(time, vel);
      }, arr, pattern.stepSize);
      seq.start(0);
      this.sequences.push(seq);
    };

    makeSeq(kickArr, (t, v) => this.kick?.triggerAttackRelease('C1', '8n', t, v));
    makeSeq(snareArr, (t, v) => this.snare?.triggerAttackRelease('8n', t, v));
    makeSeq(hihatArr, (t, v) => this.hihat?.triggerAttackRelease('16n', t, v));
    makeSeq(rideArr, (t, v) => this.ride?.triggerAttackRelease('8n', t, v));
    makeSeq(rimshotArr, (t, v) => {
      this.rimshot?.frequency.setValueAtTime(440, t);
      this.rimshot?.triggerAttackRelease('A2', '8n', t, v);
    });
  }

  private scheduleWalkingBass(measures: Measure[]) {
    const bassEvents = generateWalkingBass(measures);
    if (bassEvents.length === 0) return;

    const events: PartEvent[] = bassEvents.map(e => ({
      time: e.time,
      note: e.note,
      duration: e.duration,
    }));

    const part = new Tone.Part((time: number, ev: PartEvent) => {
      if (ev.note && ev.duration) {
        this.bass?.triggerAttackRelease(ev.note, ev.duration, time);
      }
    }, events);

    part.start(0);
    part.loop = false;
    this.sequences.push(part);
  }

  async previewNote(toneName: string, duration = '8n') {
    await this.ensureInit();
    this.piano?.triggerAttackRelease(toneName, duration);
  }

  get isPlaying(): boolean {
    return Tone.getTransport().state === 'started';
  }
}

export const audioEngine = new AudioEngine();
