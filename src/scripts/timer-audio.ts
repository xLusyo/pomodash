import { MAX_SOUND_SECONDS, validateSoundFile, type CustomSound, type TimerSoundSettings } from '../lib/timer-sound.ts';

export function createTimerAudio() {
  let context: AudioContext | null = null;
  let generation = 0;
  let sources: AudioScheduledSourceNode[] = [];
  let cached: { dataUrl: string; buffer: AudioBuffer } | null = null;

  function getContext(): AudioContext {
    context ??= new AudioContext();
    return context;
  }

  async function unlock(): Promise<void> {
    const audio = getContext();
    if (audio.state === 'suspended') await audio.resume();
    if (audio.state !== 'running') throw new Error('Sound is blocked. Use Start or Preview to enable audio.');
  }

  function stop(): void {
    generation++;
    sources.forEach(source => source.stop());
    sources = [];
  }

  async function decode(dataUrl: string): Promise<AudioBuffer> {
    if (cached?.dataUrl === dataUrl) return cached.buffer;
    const encoded = dataUrl.slice(dataUrl.indexOf(',') + 1);
    const bytes = Uint8Array.from(atob(encoded), character => character.charCodeAt(0));
    const buffer = await getContext().decodeAudioData(bytes.buffer);
    if (!Number.isFinite(buffer.duration) || buffer.duration <= 0) throw new Error('The audio file is empty or unreadable.');
    cached = { dataUrl, buffer };
    return buffer;
  }

  async function prepare(file: File): Promise<CustomSound> {
    validateSoundFile(file);
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('The audio file could not be read.', { cause: reader.error }));
      reader.readAsDataURL(file);
    });
    try {
      await decode(dataUrl);
    } catch (error) {
      throw new Error('This browser could not decode the audio. Choose another MP3, WAV, or OGG file.', { cause: error });
    }
    return { name: file.name.slice(0, 255), dataUrl };
  }

  async function play(settings: TimerSoundSettings, onEnded = () => {}): Promise<void> {
    stop();
    if (settings.selected === 'off') { onEnded(); return; }
    const request = generation;
    await unlock();
    const audio = getContext();
    const buffer = settings.selected === 'custom' && settings.custom ? await decode(settings.custom.dataUrl) : null;
    if (request !== generation) return;
    const gain = audio.createGain();
    gain.connect(audio.destination);
    const now = audio.currentTime;
    if (buffer) {
      gain.gain.value = .65;
      const source = audio.createBufferSource();
      source.buffer = buffer;
      source.connect(gain);
      sources = [source];
      source.onended = () => {
        source.disconnect();
        gain.disconnect();
        if (request === generation) { sources = []; onEnded(); }
      };
      source.start(now, 0, Math.min(buffer.duration, MAX_SOUND_SECONDS));
      return;
    }
    const notes = settings.selected === 'digital' ? [880, 880, 1174.66] : settings.selected === 'bell' ? [523.25, 1046.5] : [659.25, 830.61, 987.77];
    const spacing = settings.selected === 'digital' ? .18 : .22;
    const length = settings.selected === 'digital' ? .12 : .8;
    gain.gain.value = .18;
    notes.forEach((frequency, index) => {
      const oscillator = audio.createOscillator();
      const envelope = audio.createGain();
      const start = now + index * spacing;
      oscillator.type = settings.selected === 'digital' ? 'square' : 'sine';
      oscillator.frequency.value = frequency;
      envelope.gain.setValueAtTime(0, start);
      envelope.gain.linearRampToValueAtTime(1, start + .01);
      envelope.gain.exponentialRampToValueAtTime(.001, start + length);
      oscillator.connect(envelope);
      envelope.connect(gain);
      sources.push(oscillator);
      oscillator.onended = () => {
        oscillator.disconnect();
        envelope.disconnect();
        if (index === notes.length - 1) {
          gain.disconnect();
          if (request === generation) { sources = []; onEnded(); }
        }
      };
      oscillator.start(start);
      oscillator.stop(start + length);
    });
  }

  return { unlock, stop, prepare, play };
}
