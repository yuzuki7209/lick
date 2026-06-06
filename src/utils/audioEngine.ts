import * as Tone from 'tone';
import type { Lick, Measure } from '../types/music';
import { noteToToneName, durationToTone, DURATION_VALUES } from '../types/music';

type PositionCallback = (measureIdx: number, noteIdx: number) => void;

interface ScheduledNote { time: string; note: string; duration: string; measureIdx: number; noteIdx: number; }

class AudioEngine {
  private piano: Tone.PolySynth | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parts: any[] = [];
  private initialized = false;
  private onPosition: PositionCallback | null = null;

  private async ensureInit() {
    if (this.initialized) return;
    await Tone.start();
    this.piano = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.015, decay: 0.5, sustain: 0.45, release: 2.0 },
      volume: -4,
    }).toDestination();
    this.initialized = true;
  }

  setPositionCallback(cb: PositionCallback | null) { this.onPosition = cb; }

  async play(lick: Lick) {
    await this.ensureInit();
    this.stop();
    const t = Tone.getTransport();
    t.bpm.value = lick.bpm;
    t.swing = 0; // no swing for clean piano playback

    const events = this.buildEvents(lick.measures);
    if (events.length === 0) return;

    const part = new Tone.Part((time: number, ev: ScheduledNote) => {
      this.piano?.triggerAttackRelease(ev.note, ev.duration, time);
      if (this.onPosition) {
        Tone.getDraw().schedule(() => this.onPosition?.(ev.measureIdx, ev.noteIdx), time);
      }
    }, events);

    part.start(0);
    part.loop = false;
    this.parts.push(part);

    t.loopStart = 0;
    t.loopEnd = `${lick.bars}m`;
    t.loop = true;
    t.start('+0.05');
  }

  // Play without looping (for practice backing)
  async playOnce(lick: Lick) {
    await this.ensureInit();
    this.stop();
    const t = Tone.getTransport();
    t.bpm.value = lick.bpm;
    t.swing = 0;
    t.loop = false;

    const events = this.buildEvents(lick.measures);
    if (events.length === 0) { t.start('+0.05'); return; }

    const part = new Tone.Part((time: number, ev: ScheduledNote) => {
      this.piano?.triggerAttackRelease(ev.note, ev.duration, time);
      if (this.onPosition) {
        Tone.getDraw().schedule(() => this.onPosition?.(ev.measureIdx, ev.noteIdx), time);
      }
    }, events);

    part.start(0);
    part.loop = false;
    this.parts.push(part);
    t.start('+0.05');
  }

  private buildEvents(measures: Measure[]): ScheduledNote[] {
    const events: ScheduledNote[] = [];
    for (let mIdx = 0; mIdx < measures.length; mIdx++) {
      let beat = 0;
      const nonRest = measures[mIdx].notes.filter(n => !n.isRest);
      for (let nIdx = 0; nIdx < measures[mIdx].notes.length; nIdx++) {
        const note = measures[mIdx].notes[nIdx];
        const beatVal = DURATION_VALUES[note.duration] * (note.isDotted ? 1.5 : 1);
        if (!note.isRest) {
          const realIdx = nonRest.indexOf(note);
          events.push({
            time: `${mIdx}:${beat}:0`,
            note: noteToToneName(note),
            duration: durationToTone(note.duration, note.isDotted),
            measureIdx: mIdx,
            noteIdx: realIdx,
          });
        }
        beat += beatVal;
      }
    }
    return events;
  }

  stop() {
    const t = Tone.getTransport();
    t.stop(); t.cancel(); t.loop = false;
    for (const p of this.parts) { try { p.stop(); p.dispose(); } catch { /**/ } }
    this.parts = [];
  }

  async previewNote(toneName: string) {
    await this.ensureInit();
    this.piano?.triggerAttackRelease(toneName, '8n');
  }

  get isPlaying() { return Tone.getTransport().state === 'started'; }
}

export const audioEngine = new AudioEngine();
