import { createAppearance, isAppearanceSettings, type AppearanceSettings } from './appearance.ts';

export const APPEARANCE_STORAGE_KEY = 'pomodash.appearance.v1';
type StorageAccess = Pick<Storage, 'getItem' | 'setItem'>;

export function loadAppearance(storage: StorageAccess | null): { settings: AppearanceSettings; notice: string | null } {
  if (!storage) return { settings: createAppearance(), notice: 'Browser storage is unavailable. Appearance changes will last only in this tab.' };
  try {
    const raw = storage.getItem(APPEARANCE_STORAGE_KEY);
    if (raw === null) return { settings: createAppearance(), notice: null };
    const parsed: unknown = JSON.parse(raw);
    if (isAppearanceSettings(parsed)) return { settings: parsed, notice: null };
    console.error('PomoDash found invalid saved appearance settings.');
  } catch (error) {
    console.error('PomoDash could not load appearance settings.', error);
  }
  return { settings: createAppearance(), notice: 'Saved appearance could not be loaded. Default appearance is shown; saving will replace it.' };
}

export function saveAppearance(storage: StorageAccess | null, settings: AppearanceSettings): string | null {
  if (!storage) return null;
  try {
    storage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(settings));
    return null;
  } catch (error) {
    console.error('PomoDash could not save appearance settings.', error);
    return 'Appearance could not be saved. Try a smaller wallpaper or free browser storage, then save again.';
  }
}
