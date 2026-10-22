import type { TimerSoundSettings } from '../lib/timer-sound.ts';
import { loadTimerSound, saveTimerSound, type SoundStorage } from '../lib/timer-sound-storage.ts';
import { announce, getElement } from './dom.ts';
import { createTimerAudio } from './timer-audio.ts';

export function initializeTimerSound(storage: SoundStorage | null) {
  const loaded = loadTimerSound(storage);
  let saved = loaded.settings;
  let draft: TimerSoundSettings = { ...saved };
  let uploadRequest = 0;
  let isPreparing = false;
  let isPreviewing = false;
  let previewRequest = 0;
  const audio = createTimerAudio();
  const dialog = getElement<HTMLDialogElement>('#timer-settings');
  const select = getElement<HTMLSelectElement>('[data-timer-sound]');
  const file = getElement<HTMLInputElement>('[data-sound-file]');
  const filename = getElement<HTMLElement>('[data-sound-filename]');
  const preview = getElement<HTMLButtonElement>('[data-preview-sound]');
  const remove = getElement<HTMLButtonElement>('[data-remove-sound]');
  const saveButton = getElement<HTMLButtonElement>('[data-save-timer]');
  const message = getElement<HTMLElement>('[data-sound-message]');
  const playbackNotice = getElement<HTMLElement>('[data-sound-notice]');

  function showMessage(text: string | null): void {
    message.textContent = text ?? '';
    message.hidden = !text;
  }

  function showPlaybackError(error: unknown): void {
    console.error('PomoDash could not play the timer sound.', error);
    const text = 'Sound could not play. Try Preview in Timer settings and check your browser’s audio permissions.';
    playbackNotice.textContent = text;
    playbackNotice.hidden = false;
    if (dialog.open) showMessage(text);
  }

  function render(): void {
    select.value = draft.selected;
    getElement<HTMLOptionElement>('option[value="custom"]', select).disabled = !draft.custom;
    filename.textContent = draft.custom?.name ?? 'No custom audio selected.';
    remove.disabled = !draft.custom || isPreparing;
    preview.disabled = draft.selected === 'off' || isPreparing;
    preview.textContent = isPreviewing ? 'Stop preview' : 'Preview sound';
    preview.setAttribute('aria-pressed', String(isPreviewing));
    saveButton.disabled = isPreparing;
  }

  function stopPreview(): void {
    previewRequest++;
    if (isPreviewing) audio.stop();
    isPreviewing = false;
    render();
  }

  function cancelUpload(): void {
    uploadRequest++;
    isPreparing = false;
    file.value = '';
  }

  function open(): void {
    cancelUpload();
    stopPreview();
    draft = { ...saved };
    render();
    showMessage(loaded.notice);
  }

  dialog.addEventListener('close', () => {
    cancelUpload();
    stopPreview();
    draft = { ...saved };
    render();
    getElement<HTMLButtonElement>('[data-open-settings]').focus();
  });
  select.addEventListener('change', () => {
    const selected = select.value as TimerSoundSettings['selected'];
    stopPreview();
    draft = { ...draft, selected };
    render();
  });
  file.addEventListener('change', async () => {
    const selected = file.files?.[0];
    if (!selected) return;
    stopPreview();
    const request = ++uploadRequest;
    isPreparing = true;
    render();
    showMessage('Preparing your sound…');
    try {
      const custom = await audio.prepare(selected);
      if (request !== uploadRequest || !dialog.open) return;
      draft = { ...draft, selected: 'custom', custom };
      showMessage(null);
    } catch (error) {
      console.error('PomoDash could not prepare the custom timer sound.', error);
      if (request === uploadRequest && dialog.open) showMessage(error instanceof Error ? error.message : 'Could not read the audio file.');
    } finally {
      if (request === uploadRequest) {
        isPreparing = false;
        file.value = '';
        render();
      }
    }
  });
  remove.addEventListener('click', () => {
    stopPreview();
    cancelUpload();
    draft = { ...draft, selected: 'chime', custom: null };
    showMessage(null);
    render();
  });
  preview.addEventListener('click', () => {
    if (isPreviewing) { stopPreview(); return; }
    const request = ++previewRequest;
    isPreviewing = true;
    render();
    showMessage(null);
    void audio.play(draft, () => {
      if (request !== previewRequest) return;
      isPreviewing = false;
      render();
    }).then(() => {
      if (request === previewRequest) playbackNotice.hidden = true;
    }).catch(error => {
      if (request !== previewRequest) return;
      isPreviewing = false;
      render();
      showPlaybackError(error);
    });
  });

  function save(): boolean {
    if (isPreparing) return false;
    const error = saveTimerSound(storage, draft);
    if (error) { showMessage(error); return false; }
    saved = { ...draft };
    loaded.notice = storage ? null : 'Sound saved for this tab only. Browser storage is unavailable.';
    announce(loaded.notice ?? 'Timer settings saved.');
    return true;
  }

  function unlock(): void {
    if (saved.selected === 'off') return;
    void audio.unlock().catch(showPlaybackError);
  }

  function complete(): void {
    previewRequest++;
    isPreviewing = false;
    render();
    void audio.play(saved).then(() => { playbackNotice.hidden = true; }).catch(showPlaybackError);
  }

  if (loaded.notice) announce(loaded.notice);
  return { open, save, unlock, complete };
}
