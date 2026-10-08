import { AwsClient } from 'aws4fetch';
import { and, desc, eq, isNull } from 'drizzle-orm';

import { db } from '@/core/db';
import { aiTask } from '@/config/db/schema';
import { getUuid } from '@/lib/hash';

function storage() {
  const {
    GALLERY_R2_ACCOUNT_ID: account,
    GALLERY_R2_BUCKET: bucket,
    GALLERY_R2_ACCESS_KEY_ID: accessKeyId,
    GALLERY_R2_SECRET_ACCESS_KEY: secretAccessKey,
  } = process.env;
  if (!account || !bucket || !accessKeyId || !secretAccessKey)
    throw new Error('gallery_not_configured');
  return {
    endpoint: `https://${account}.r2.cloudflarestorage.com/${bucket}/`,
    client: new AwsClient({
      accessKeyId,
      secretAccessKey,
      region: 'auto',
      service: 's3',
    }),
  };
}
export function galleryReady() {
  try {
    storage();
    return true;
  } catch {
    return false;
  }
}
export async function saveArtwork(params: {
  userId: string;
  prompt: string;
  mode: string;
  ratio: string;
  url: string;
  transparent: boolean;
  creditId?: string;
}) {
  if (!/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(params.url))
    throw new Error('invalid_gallery_image');
  const body = Buffer.from(params.url.split(',')[1], 'base64');
  if (body.length > 10_000_000) throw new Error('image_too_large');
  const id = getUuid(),
    key = `artworks/${id}.png`,
    s = storage();
  const uploaded = await s.client.fetch(s.endpoint + key, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/png' },
    body: new Uint8Array(body),
  });
  if (!uploaded.ok) throw new Error('gallery_upload_failed');
  try {
    await db()
      .insert(aiTask)
      .values({
        id,
        userId: params.userId,
        mediaType: 'image',
        provider: 'bailian',
        model: 'qwen-image-2.1-pro',
        prompt: params.prompt,
        options: JSON.stringify({ mode: params.mode, ratio: params.ratio }),
        status: 'success',
        scene: 'studio_gallery',
        taskResult: JSON.stringify({ key, transparent: params.transparent }),
        costCredits: 1,
        creditId: params.creditId,
      });
  } catch (error) {
    await s.client
      .fetch(s.endpoint + key, { method: 'DELETE' })
      .catch(() => undefined);
    throw error;
  }
  return { id, url: `/api/gallery/${id}`, transparent: params.transparent };
}
export async function listArtworks(userId: string, page: number) {
  const items = await db()
    .select({
      id: aiTask.id,
      prompt: aiTask.prompt,
      options: aiTask.options,
      createdAt: aiTask.createdAt,
    })
    .from(aiTask)
    .where(
      and(
        eq(aiTask.userId, userId),
        eq(aiTask.scene, 'studio_gallery'),
        isNull(aiTask.deletedAt)
      )
    )
    .orderBy(desc(aiTask.createdAt), desc(aiTask.id))
    .limit(21)
    .offset((page - 1) * 20);
  return {
    items: items
      .slice(0, 20)
      .map((item) => ({ ...item, url: `/api/gallery/${item.id}` })),
    hasMore: items.length > 20,
  };
}
export async function readArtwork(userId: string, id: string) {
  const [item] = await db()
    .select()
    .from(aiTask)
    .where(
      and(
        eq(aiTask.id, id),
        eq(aiTask.userId, userId),
        eq(aiTask.scene, 'studio_gallery'),
        isNull(aiTask.deletedAt)
      )
    )
    .limit(1);
  if (!item) return null;
  const { key } = JSON.parse(item.taskResult || '{}');
  if (typeof key !== 'string' || !/^artworks\/[a-zA-Z0-9-]+\.png$/.test(key))
    throw new Error('invalid_gallery_key');
  const s = storage();
  const response = await s.client.fetch(s.endpoint + key);
  if (!response.ok) throw new Error('gallery_download_failed');
  return response;
}
