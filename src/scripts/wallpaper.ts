import { MAX_WALLPAPER_LENGTH } from '../lib/appearance.ts';

export async function processWallpaper(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Choose a JPEG, PNG, or WebP image.');
  }
  if (file.size > 10 * 1024 * 1024) throw new Error('Choose an image smaller than 10 MB.');

  const url = URL.createObjectURL(file);
  const image = new Image();
  try {
    image.src = url;
    await image.decode();
    const scale = Math.min(1, 1920 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('This browser cannot prepare wallpapers.');
    for (let attempt = 0; attempt < 6; attempt++) {
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const result = canvas.toDataURL('image/webp', Math.max(.45, .85 - attempt * .1));
      if (result.length < MAX_WALLPAPER_LENGTH) return result;
      canvas.width = Math.max(1, Math.round(canvas.width * .8));
      canvas.height = Math.max(1, Math.round(canvas.height * .8));
    }
    throw new Error('This image is too large to save. Choose a smaller image.');
  } catch (error) {
    if (error instanceof DOMException) throw new Error('This image could not be read. Choose another image.', { cause: error });
    throw error;
  } finally {
    URL.revokeObjectURL(url);
  }
}
