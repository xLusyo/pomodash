import { ACCENT_PRESETS, FONT_PRESETS, type AppearanceSettings } from '../lib/appearance.ts';

export function applyAppearance(settings: AppearanceSettings): void {
  const font = FONT_PRESETS.find(preset => preset.id === settings.fontPreset)!;
  const accent = ACCENT_PRESETS.find(preset => preset.id === settings.accentPreset)!;
  const style = document.documentElement.style;
  style.setProperty('--font-body', font.body);
  style.setProperty('--font-heading', font.heading);
  style.setProperty('--accent', accent.color);
  style.setProperty('--accent-hover', settings.accentPreset === 'terracotta' ? '#9e4b35' : `color-mix(in srgb, ${accent.color}, black 15%)`);
  style.setProperty('--accent-soft', settings.accentPreset === 'terracotta' ? '#f4e9e2' : `color-mix(in srgb, ${accent.color} 12%, var(--surface))`);
  style.setProperty('--wallpaper', settings.wallpaper ? `url("${settings.wallpaper}")` : 'none');
}
