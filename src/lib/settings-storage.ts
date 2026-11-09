import { isAppearanceSettings, type AppearanceSettings } from './appearance.ts';
import { APPEARANCE_STORAGE_KEY, saveAppearance } from './appearance-storage.ts';
import { isTimerSoundSettings, type TimerSoundSettings } from './timer-sound.ts';
import { saveTimerSound } from './timer-sound-storage.ts';

type SettingsStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function saveSettings(storage: SettingsStorage | null, appearance: AppearanceSettings, sound: TimerSoundSettings): string | null {
  if (!isAppearanceSettings(appearance) || !isTimerSoundSettings(sound)) return 'Choose valid appearance and sound settings before saving.';
  if (!storage) return null;

  let previousAppearance: string | null;
  try {
    previousAppearance = storage.getItem(APPEARANCE_STORAGE_KEY);
  } catch (error) {
    console.error('PomoDash could not read settings before saving.', error);
    return 'Settings could not be saved. Check browser storage and try again.';
  }

  const appearanceError = saveAppearance(storage, appearance);
  if (appearanceError) return appearanceError;
  const soundError = saveTimerSound(storage, sound);
  if (!soundError) return null;

  try {
    if (previousAppearance === null) storage.removeItem(APPEARANCE_STORAGE_KEY);
    else storage.setItem(APPEARANCE_STORAGE_KEY, previousAppearance);
  } catch (error) {
    console.error('PomoDash could not restore appearance after sound saving failed.', error);
    return 'Sound could not be saved, and the previous appearance could not be restored. Appearance may have been saved. Keep this dialog open and try saving again.';
  }
  return soundError;
}
