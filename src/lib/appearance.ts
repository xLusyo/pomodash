export const FONT_PRESETS = [
  { id: 'original', name: 'Original', description: 'Familiar controls, editorial headings', body: "'Avenir Next', Avenir, 'Segoe UI', sans-serif", heading: "'Iowan Old Style', Georgia, serif" },
  { id: 'modern', name: 'Modern', description: 'Clean and simple throughout', body: 'system-ui, sans-serif', heading: 'system-ui, sans-serif' },
  { id: 'bookish', name: 'Bookish', description: 'A quieter, literary workspace', body: 'Georgia, serif', heading: 'Georgia, serif' },
] as const;

export const ACCENT_PRESETS = [
  { id: 'terracotta', name: 'Terracotta', color: '#b75c43' },
  { id: 'sage', name: 'Sage', color: '#526448' },
  { id: 'ocean', name: 'Ocean', color: '#2f6475' },
  { id: 'plum', name: 'Plum', color: '#75516c' },
  { id: 'slate', name: 'Slate', color: '#4b6075' },
] as const;

export const MAX_WALLPAPER_LENGTH = 1_000_000;

export interface AppearanceSettings {
  version: 1;
  wallpaper: string | null;
  fontPreset: typeof FONT_PRESETS[number]['id'];
  accentPreset: typeof ACCENT_PRESETS[number]['id'];
}

export function createAppearance(): AppearanceSettings {
  return { version: 1, wallpaper: null, fontPreset: 'original', accentPreset: 'terracotta' };
}

export function isAppearanceSettings(value: unknown): value is AppearanceSettings {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const settings = value as Record<string, unknown>;
  return settings.version === 1 &&
    FONT_PRESETS.some(font => font.id === settings.fontPreset) &&
    ACCENT_PRESETS.some(accent => accent.id === settings.accentPreset) &&
    (settings.wallpaper === null || (typeof settings.wallpaper === 'string' &&
      settings.wallpaper.length < MAX_WALLPAPER_LENGTH &&
      /^data:image\/(?:webp|png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(settings.wallpaper)));
}
