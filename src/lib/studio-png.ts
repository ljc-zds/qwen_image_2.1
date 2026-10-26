import { hasPngTransparency } from './png-transparency';

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const MAX_BYTES = 10_000_000;

export function validateStudioPng(png: Buffer): Buffer {
  if (png.length > MAX_BYTES) throw new Error('image_too_large');
  if (png.length < 33 || !png.subarray(0, 8).equals(SIGNATURE))
    throw new Error('invalid_provider_result');
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  if (!width || !height || (width * 4 + 1) * height > 20_000_000)
    throw new Error('invalid_provider_result');
  return png;
}

// Only the transparent tool promises verified transparent pixels. Ordinary image
// generation does not need to inflate and scan every pixel of an opaque image.
export function prepareStudioPng(
  png: Buffer,
  requireTransparency: boolean,
  binary: boolean
) {
  validateStudioPng(png);
  const transparent = requireTransparency && hasPngTransparency(png);
  if (requireTransparency && !transparent)
    throw new Error('transparency_unavailable');
  return binary
    ? { png, transparent }
    : { url: 'data:image/png;base64,' + png.toString('base64'), transparent };
}

export function galleryPng(input: { png?: Buffer; url?: string }): Buffer {
  if (input.png) return validateStudioPng(input.png);
  if (
    !input.url ||
    !/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(input.url)
  )
    throw new Error('invalid_gallery_image');
  return validateStudioPng(Buffer.from(input.url.split(',')[1], 'base64'));
}
