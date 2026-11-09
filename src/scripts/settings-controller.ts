import { createAppearance, type AppearanceSettings } from '../lib/appearance.ts';
import { loadAppearance } from '../lib/appearance-storage.ts';
import { saveSettings } from '../lib/settings-storage.ts';
import { applyAppearance } from './appearance-view.ts';
import { announce, getElement } from './dom.ts';
import { processWallpaper } from './wallpaper.ts';
import { initializeAppearanceTabs } from './appearance-tabs.ts';
import { initializeTimerSound } from './timer-sound-controller.ts';

export function initializeSettings(storage: Storage | null) {
  const loaded = loadAppearance(storage);
  let saved = loaded.settings;
  let draft: AppearanceSettings = { ...saved };
  let uploadRequest = 0;
  let isPreparingWallpaper = false;
  let isPreparingSound = false;
  const dialog = getElement<HTMLDialogElement>('#appearance-settings');
  const form = getElement<HTMLFormElement>('#appearance-form');
  const trigger = getElement<HTMLButtonElement>('[data-open-appearance]');
  const fileInput = getElement<HTMLInputElement>('[data-wallpaper-file]');
  const saveButton = getElement<HTMLButtonElement>('[data-save-appearance]');
  const removeButton = getElement<HTMLButtonElement>('[data-remove-wallpaper]');
  const preview = getElement<HTMLElement>('[data-wallpaper-preview]');
  const message = getElement<HTMLElement>('[data-appearance-message]');
  const uploadButton = getElement<HTMLButtonElement>('[data-upload-wallpaper]');
  let notice = loaded.notice;
  const sound = initializeTimerSound(storage, isPreparing => {
    isPreparingSound = isPreparing;
    updateSaveButton();
  });
  initializeAppearanceTabs(dialog);

  function updateSaveButton(): void {
    saveButton.disabled = isPreparingWallpaper || isPreparingSound;
  }

  function showMessage(text: string | null): void {
    message.textContent = text ?? '';
    message.hidden = text === null;
  }

  function renderDraft(): void {
    applyAppearance(draft);
    form.querySelectorAll<HTMLInputElement>('input[type="radio"]').forEach(input => {
      input.checked = input.value === draft[input.name as 'fontPreset' | 'accentPreset'];
    });
    preview.style.backgroundImage = draft.wallpaper ? `url("${draft.wallpaper}")` : 'none';
    getElement<HTMLElement>('[data-wallpaper-empty]').hidden = draft.wallpaper !== null;
    preview.setAttribute('role', 'img');
    preview.setAttribute('aria-label', draft.wallpaper ? 'Selected wallpaper preview' : 'Plain canvas preview');
    removeButton.disabled = draft.wallpaper === null;
  }

  function cancelUpload(): void {
    uploadRequest++;
    isPreparingWallpaper = false;
    updateSaveButton();
    uploadButton.textContent = 'Upload image';
    fileInput.value = '';
  }

  applyAppearance(saved);
  if (notice) announce(notice);

  trigger.addEventListener('click', () => {
    draft = { ...saved };
    cancelUpload();
    renderDraft();
    showMessage(notice);
    sound.open();
    dialog.showModal();
  });
  dialog.addEventListener('close', () => {
    cancelUpload();
    applyAppearance(saved);
    trigger.focus();
  });
  form.addEventListener('change', event => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.type !== 'radio') return;
    if (input.name === 'fontPreset') draft = { ...draft, fontPreset: input.value as AppearanceSettings['fontPreset'] };
    if (input.name === 'accentPreset') draft = { ...draft, accentPreset: input.value as AppearanceSettings['accentPreset'] };
    renderDraft();
  });
  uploadButton.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const request = ++uploadRequest;
    isPreparingWallpaper = true;
    updateSaveButton();
    uploadButton.textContent = 'Choose another image';
    showMessage('Preparing your wallpaper…');
    try {
      const wallpaper = await processWallpaper(file);
      if (request !== uploadRequest || !dialog.open) return;
      draft = { ...draft, wallpaper };
      renderDraft();
      showMessage(null);
    } catch (error) {
      console.error('PomoDash could not prepare the wallpaper.', error);
      if (request !== uploadRequest || !dialog.open) return;
      showMessage(error instanceof Error ? error.message : 'Wallpaper could not be prepared. Choose another image.');
    } finally {
      if (request === uploadRequest) {
        isPreparingWallpaper = false;
        updateSaveButton();
        uploadButton.textContent = 'Upload image';
        fileInput.value = '';
      }
    }
  });
  removeButton.addEventListener('click', () => {
    cancelUpload();
    draft = { ...draft, wallpaper: null };
    renderDraft();
    showMessage(null);
  });
  getElement<HTMLButtonElement>('[data-reset-appearance]').addEventListener('click', () => {
    cancelUpload();
    draft = createAppearance();
    renderDraft();
    showMessage('Default appearance previewed. Save changes to keep it.');
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (saveButton.disabled) return;
    const error = saveSettings(storage, draft, sound.getDraft());
    if (error) {
      showMessage(error);
      return;
    }
    saved = { ...draft };
    sound.commit();
    notice = storage ? null : 'Settings saved for this tab only. Browser storage is unavailable.';
    announce(notice ?? 'Settings saved.');
    dialog.close();
  });
  return sound;
}
