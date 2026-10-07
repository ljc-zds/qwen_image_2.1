import { z } from 'zod';

import { envConfigs } from '@/config';
import { hasPngTransparency } from '@/lib/png-transparency';

export const studioInput = z
  .object({
    prompt: z.string().trim().min(5).max(2000),
    mode: z.enum(['generate', 'edit', 'transparent']),
    ratio: z.enum(['1:1', '16:9', '9:16', '4:3', '3:4']),
    images: z
      .array(
        z
          .string()
          .max(7_000_000)
          .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/)
      )
      .max(1)
      .default([]),
  })
  .refine((input) => input.mode !== 'edit' || input.images.length > 0, {
    message: 'reference_required',
  });

const studioResult = z.object({
  url: z
    .string()
    .max(15_000_000)
    .refine((value) => {
      if (/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(value)) return true;
      try {
        return new URL(value).protocol === 'https:';
      } catch {
        return false;
      }
    }),
  transparent: z.boolean(),
});

export function isStudioReady() {
  return Boolean(
    envConfigs.studio_image_endpoint && envConfigs.studio_image_api_key
  );
}

// Stable bridge contract; provider-specific payload mapping belongs behind this endpoint.
export async function createStudioImage(input: z.infer<typeof studioInput>) {
  if (!isStudioReady()) throw new Error('not_configured');
  const endpoint = new URL(envConfigs.studio_image_endpoint);
  if (
    endpoint.protocol !== 'https:' &&
    !(
      endpoint.protocol === 'http:' &&
      ['localhost', '127.0.0.1', '[::1]'].includes(endpoint.hostname)
    )
  ) {
    throw new Error('invalid_configuration');
  }
  const prompt =
    input.mode === 'transparent'
      ? 'This is an RGBA image with transparency. ' +
        input.prompt +
        ' The image has alpha channel and the background is transparent.'
      : input.prompt;
  const bailian = envConfigs.studio_image_provider === 'bailian';
  if (
    bailian &&
    (endpoint.protocol !== 'https:' ||
      !endpoint.hostname.endsWith('.aliyuncs.com'))
  )
    throw new Error('invalid_configuration');
  const sizes = {
    '1:1': '1024*1024',
    '16:9': '1536*864',
    '9:16': '864*1536',
    '4:3': '1152*864',
    '3:4': '864*1152',
  };
  const body = bailian
    ? {
        model: envConfigs.studio_image_model,
        input: {
          messages: [
            {
              role: 'user',
              content: [
                ...input.images.map((image) => ({ image })),
                { text: prompt },
              ],
            },
          ],
        },
        parameters: {
          size: sizes[input.ratio],
          n: 1,
          prompt_extend: false,
          watermark: false,
        },
      }
    : { ...input, prompt, model: 'Qwen-Image-2.1' };
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + envConfigs.studio_image_api_key,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(180_000),
    redirect: 'error',
  });
  if (!response.ok) throw new Error('provider_error');
  const payload = await response.json();
  if (bailian) {
    const raw = payload.output?.choices?.[0]?.message?.content?.find(
      (item: { image?: string }) => item.image
    )?.image;
    if (typeof raw !== 'string') throw new Error('invalid_provider_result');
    const imageUrl = new URL(raw);
    if (
      imageUrl.protocol !== 'https:' ||
      !imageUrl.hostname.endsWith('.aliyuncs.com')
    )
      throw new Error('invalid_provider_result');
    const imageResponse = await fetch(imageUrl, {
      signal: AbortSignal.timeout(60_000),
      redirect: 'error',
    });
    if (!imageResponse.ok || !imageResponse.body)
      throw new Error('image_download_failed');
    const reader = imageResponse.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 10_000_000) {
        await reader.cancel();
        throw new Error('image_too_large');
      }
      chunks.push(value);
    }
    const png = Buffer.concat(chunks);
    if (
      !png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    )
      throw new Error('invalid_provider_result');
    const transparent = hasPngTransparency(png);
    if (input.mode === 'transparent' && !transparent)
      throw new Error('transparency_unavailable');
    return studioResult.parse({
      url: 'data:image/png;base64,' + png.toString('base64'),
      transparent,
    });
  }
  const result = studioResult.parse(payload);
  if (input.mode === 'transparent' && !result.transparent)
    throw new Error('transparency_unavailable');
  return result;
}
