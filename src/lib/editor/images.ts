import sharp from 'sharp';
import { MAX_UPLOAD, slugify } from './shared';

export { MAX_UPLOAD };

/*
  An image dropped into the editor, made safe and light before it is stored:
  - decoded with a pixel ceiling, so a decompression bomb fails instead of filling memory;
  - turned the right way up (EXIF orientation), resized to at most 2000 px wide;
  - re-encoded as WebP, which also drops every metadata block (camera, GPS location).
  Anything that is not a real image fails to decode and is refused.
*/
const MAX_INPUT_PIXELS = 40_000_000;
const MAX_WIDTH = 2000;

export class BadImage extends Error {}

export async function prepareImage(bytes: Uint8Array, originalName: string): Promise<{ name: string; data: Buffer; width: number; height: number }> {
  const base = slugify(originalName.replace(/\.[^.]*$/, '')).slice(0, 50) || 'imagem';
  try {
    const { data, info } = await sharp(bytes, { limitInputPixels: MAX_INPUT_PIXELS, failOn: 'error' })
      .rotate()
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
    return { name: `${base}.webp`, data, width: info.width, height: info.height };
  } catch {
    throw new BadImage('not an image, or too large');
  }
}
