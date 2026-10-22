import { createTimerSound, isTimerSoundSettings, type TimerSoundSettings } from './timer-sound.ts';

export const TIMER_SOUND_STORAGE_KEY = 'pomodash.timer-sound.v1';
export type SoundStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function loadTimerSound(storage: SoundStorage | null): { settings: TimerSoundSettings; notice: string | null } {
  if (!storage) return { settings: createTimerSound(), notice: 'Browser storage is unavailable. Sound changes will last only in this tab.' };
  try {
    const raw = storage.getItem(TIMER_SOUND_STORAGE_KEY);
    if (raw === null) return { settings: createTimerSound(), notice: null };
    const settings: unknown = JSON.parse(raw);
    if (isTimerSoundSettings(settings)) return { settings, notice: null };
    console.error('PomoDash found invalid saved timer sound settings.');
  } catch (error) {
    console.error('PomoDash could not load timer sound settings.', error);
  }
  return { settings: createTimerSound(), notice: 'Saved sound could not be loaded. Chime is selected; save settings to replace it.' };
}

export function saveTimerSound(storage: SoundStorage | null, settings: TimerSoundSettings): string | null {
  if (!isTimerSoundSettings(settings)) return 'Choose a sound and a valid custom file before saving.';
  if (!storage) return null;
  try {
    storage.setItem(TIMER_SOUND_STORAGE_KEY, JSON.stringify(settings));
    return null;
  } catch (error) {
    console.error('PomoDash could not save timer sound settings.', error);
    return 'Sound could not be saved. Storage may be full; remove the custom audio or choose a smaller file and try again.';
  }
}
