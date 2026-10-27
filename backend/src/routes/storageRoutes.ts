import { Router, type Request, type Response } from 'express';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getS3Client, resolveTarget, type StorageBucket } from '../storage/s3Client.js';
import type { Readable } from 'node:stream';

export const storageRouter = Router();

const ALLOWED_BUCKETS = new Set<string>([
  'recipe-covers',
  'cook-photos',
  'app-bundles',
  'feedback-screenshots',
  'ingredient-icons',
]);

const BUFFER_THRESHOLD_BYTES = 10 * 1024 * 1024; // 10 MB

export function clearCacheHeadersOnFailure(res: Response): void {
  if (res.headersSent) return;
  res.removeHeader('Cache-Control');
  res.removeHeader('Content-Type');
  res.removeHeader('Content-Length');
  res.removeHeader('ETag');
  res.removeHeader('Last-Modified');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
}

async function handleStream(req: Request, res: Response): Promise<void> {
  const bucket = req.params.bucket as StorageBucket;
  if (!ALLOWED_BUCKETS.has(bucket)) {
    res.status(404).send('Bucket not found or access denied');
    return;
  }

  // req.params[0] captures wildcard '*'
  const key = req.params[0];
  if (!key) {
    res.status(400).send('Missing file key');
    return;
  }

  const { s3Bucket, s3Key } = resolveTarget(bucket, key);

  try {
    const client = getS3Client();
    const ifNoneMatch = req.headers['if-none-match'];

    const s3Res = await client.send(
      new GetObjectCommand({
        Bucket: s3Bucket,
        Key: s3Key,
        IfNoneMatch: Array.isArray(ifNoneMatch) ? ifNoneMatch[0] : ifNoneMatch,
      })
    );

    if (!s3Res.Body) {
      res.status(404).send('File not found');
      return;
    }

    const contentLength = s3Res.ContentLength ?? 0;
    const isLargeFile = bucket === 'app-bundles' || contentLength > BUFFER_THRESHOLD_BYTES;

    // Fast-path: buffer small/medium files (covers, icons, photos) in memory in <10ms to eliminate Tigris connection drops
    if (!isLargeFile && typeof (s3Res.Body as any).transformToByteArray === 'function') {
      const byteArray = await (s3Res.Body as any).transformToByteArray();
      const buffer = Buffer.from(byteArray);

      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      if (s3Res.ContentType) res.setHeader('Content-Type', s3Res.ContentType);
      res.setHeader('Content-Length', buffer.length);
      if (s3Res.ETag) res.setHeader('ETag', s3Res.ETag);
      if (s3Res.LastModified) res.setHeader('Last-Modified', s3Res.LastModified.toUTCString());

      res.status(200).send(buffer);
      return;
    }

    // Streaming path for large files (e.g. app-bundles OTA zips)
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    if (s3Res.ContentType) res.setHeader('Content-Type', s3Res.ContentType);
    if (s3Res.ContentLength) res.setHeader('Content-Length', s3Res.ContentLength);
    if (s3Res.ETag) res.setHeader('ETag', s3Res.ETag);
    if (s3Res.LastModified) res.setHeader('Last-Modified', s3Res.LastModified.toUTCString());

    const stream = s3Res.Body as Readable;

    res.on('close', () => {
      if (!res.writableEnded) {
        stream.destroy();
      }
    });

    stream.on('error', (err) => {
      if (res.writableEnded || res.destroyed) return;
      console.error(`[storageRouter] Error streaming ${bucket}/${key}:`, err);
      clearCacheHeadersOnFailure(res);
      if (!res.headersSent) res.status(500).send('Streaming error');
    });

    stream.pipe(res);
  } catch (err: any) {
    if (err?.$metadata?.httpStatusCode === 304 || err?.name === '304NotModified') {
      res.status(304).end();
      return;
    }
    if (err?.name === 'NoSuchKey' || err?.$metadata?.httpStatusCode === 404) {
      res.status(404).send('File not found');
      return;
    }
    console.error(`[storageRouter] Error handling ${bucket}/${key}:`, err);
    clearCacheHeadersOnFailure(res);
    res.status(500).send('Internal Server Error');
  }
}

storageRouter.get('/storage/:bucket/*', handleStream);
storageRouter.get('/api/storage/:bucket/*', handleStream);
