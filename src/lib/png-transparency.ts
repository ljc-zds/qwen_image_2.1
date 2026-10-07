import { inflateSync } from 'node:zlib';

// Qwen returns 8-bit RGBA PNGs for transparent output. Check used pixels rather
// than treating the mere presence of an alpha channel as transparency.
export function hasPngTransparency(png: Buffer): boolean {
  if (png.length < 33 || png[24] !== 8 || png[25] !== 6 || png[28] !== 0)
    return false;
  const width = png.readUInt32BE(16),
    height = png.readUInt32BE(20);
  const stride = width * 4;
  if (!width || !height || (stride + 1) * height > 20_000_000) return false;
  const parts: Buffer[] = [];
  for (let offset = 8; offset + 12 <= png.length; ) {
    const length = png.readUInt32BE(offset);
    if (offset + length + 12 > png.length) return false;
    if (png.toString('ascii', offset + 4, offset + 8) === 'IDAT')
      parts.push(png.subarray(offset + 8, offset + 8 + length));
    offset += length + 12;
  }
  if (!parts.length) return false;
  const raw = inflateSync(Buffer.concat(parts), {
    maxOutputLength: 20_000_000,
  });
  if (raw.length !== (stride + 1) * height) return false;
  let previous = new Uint8Array(stride);
  for (let row = 0; row < height; row++) {
    const start = row * (stride + 1),
      filter = raw[start];
    if (filter > 4) return false;
    const current = new Uint8Array(stride);
    for (let i = 0; i < stride; i++) {
      const left = i >= 4 ? current[i - 4] : 0;
      const up = previous[i],
        corner = i >= 4 ? previous[i - 4] : 0;
      let predictor = 0;
      if (filter === 1) predictor = left;
      if (filter === 2) predictor = up;
      if (filter === 3) predictor = Math.floor((left + up) / 2);
      if (filter === 4) {
        const p = left + up - corner;
        const a = Math.abs(p - left),
          b = Math.abs(p - up),
          c = Math.abs(p - corner);
        predictor = a <= b && a <= c ? left : b <= c ? up : corner;
      }
      current[i] = (raw[start + 1 + i] + predictor) & 255;
      if (i % 4 === 3 && current[i] < 255) return true;
    }
    previous = current;
  }
  return false;
}
