export const SOUND_PRESETS = [
  { id: 'chime', label: 'Chime' },
  { id: 'bell', label: 'Bell' },
  { id: 'digital', label: 'Digital' },
  { id: 'custom', label: 'Custom' },
  { id: 'off', label: 'Off' },
] as const;

export type TimerSoundId = typeof SOUND_PRESETS[number]['id'];
export interface CustomSound { name: string; dataUrl: string }
export interface TimerSoundSettings {
  version: 1;
  selected: TimerSoundId;
  custom: CustomSound | null;
}

export const MAX_SOUND_BYTES = 1024 * 1024;
export const MAX_SOUND_SECONDS = 10;
export const AUDIO_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/ogg'];

export function createTimerSound(): TimerSoundSettings {
  return { version: 1, selected: 'chime', custom: null };
}

export function isTimerSoundSettings(value: unknown): value is TimerSoundSettings {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const sound = value as Record<string, unknown>;
  if (sound.version !== 1 || !SOUND_PRESETS.some(preset => preset.id === sound.selected)) return false;
  if (sound.custom === null) return sound.selected !== 'custom';
  if (typeof sound.custom !== 'object' || Array.isArray(sound.custom)) return false;
  const custom = sound.custom as Record<string, unknown>;
  if (custom === null || typeof custom.name !== 'string' || custom.name.length === 0 || custom.name.length > 255 ||
    typeof custom.dataUrl !== 'string') return false;
  const match = /^data:audio\/(?:mpeg|mp3|wav|x-wav|wave|ogg);base64,([A-Za-z0-9+/]+={0,2})$/.exec(custom.dataUrl);
  if (!match) return false;
  const encoded = match[1];
  const padding = encoded.endsWith('==') ? 2 : encoded.endsWith('=') ? 1 : 0;
  return encoded.length % 4 === 0 && encoded.length / 4 * 3 - padding <= MAX_SOUND_BYTES;
}

export function validateSoundFile(file: Pick<File, 'type' | 'size'>): void {
  if (!AUDIO_TYPES.includes(file.type)) throw new Error('Choose an MP3, WAV, or OGG audio file.');
  if (file.size === 0 || file.size > MAX_SOUND_BYTES) throw new Error('Choose a non-empty audio file up to 1 MB.');
}
