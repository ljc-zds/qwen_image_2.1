import assert from 'node:assert/strict';
import { test } from 'node:test';
import { deflateSync } from 'node:zlib';

import { galleryPng, prepareStudioPng, validateStudioPng } from './studio-png';

// Tiny deterministic RGBA fixtures exercise pixel transparency rather than merely
// the presence of an alpha channel. PNG CRCs are irrelevant to the pixel parser.
function png(alpha: number) {
  const chunk = (kind: string, data: Buffer) => {
    const result = Buffer.alloc(data.length + 12);
    result.writeUInt32BE(data.length);
    result.write(kind, 4);
    data.copy(result, 8);
    return result;
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(1);
  header.writeUInt32BE(1, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(Buffer.from([0, 128, 64, 32, alpha]))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

test('binary gallery path preserves PNG bytes without a base64 round trip', () => {
  const opaque = png(255);
  const binary = prepareStudioPng(opaque, false, true);
  assert.equal(binary.png, opaque);
  assert.equal(binary.transparent, false);
  assert.equal('url' in binary, false);
  assert.equal(galleryPng(binary), opaque);
  const inline = prepareStudioPng(opaque, false, false);
  assert(inline.url);
  assert.deepEqual(galleryPng(inline), opaque);
});

test('transparent tool still requires an actually transparent pixel', () => {
  assert.throws(
    () => prepareStudioPng(png(255), true, true),
    /transparency_unavailable/
  );
  const transparent = png(0);
  assert.equal(prepareStudioPng(transparent, true, true).transparent, true);
  assert.equal(prepareStudioPng(transparent, true, false).transparent, true);
});

test('invalid signature, excessive dimensions, size and non-PNG gallery input are rejected', () => {
  assert.throws(() => validateStudioPng(Buffer.from('not a PNG')));
  assert.throws(
    () => validateStudioPng(Buffer.alloc(10_000_001)),
    /image_too_large/
  );
  const huge = png(0);
  huge.writeUInt32BE(10_000_000, 16);
  assert.throws(
    () => prepareStudioPng(huge, false, true),
    /invalid_provider_result/
  );
  assert.throws(() => galleryPng({ url: 'https://untrusted.test/image.png' }));
  assert.throws(() => galleryPng({ url: 'data:image/jpeg;base64,aGVsbG8=' }));
  assert.throws(() => galleryPng({ url: 'data:image/png;base64,aGVsbG8=' }));
});

test('corrupt deflate cannot satisfy transparent output even with an alpha-channel header', () => {
  const corrupt = png(0);
  corrupt.fill(255, 41, corrupt.length - 12);
  assert.throws(() => prepareStudioPng(corrupt, true, true));
});
