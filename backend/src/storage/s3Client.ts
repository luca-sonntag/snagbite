import {
  S3Client, PutObjectCommand, GetObjectCommand,
  DeleteObjectCommand, DeleteObjectsCommand, ListObjectsV2Command,
  HeadBucketCommand, CreateBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl as getAwsSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config.js';

export type StorageBucket =
  | 'recipe-covers'
  | 'app-bundles'
  | 'feedback-screenshots'
  | 'recipe-photos'
  | 'cook-photos'
  | (string & {});

export interface StorageFileItem {
  key: string;
  name: string;
  size?: number;
  lastModified?: Date;
}

let s3Instance: S3Client | null = null;
const ensuredBuckets = new Set<string>();

/**
 * Returns true if S3 credentials/endpoint are configured in environment.
 */
export function isS3Configured(): boolean {
  return Boolean(
    config.S3_ENDPOINT ||
    (config.S3_ACCESS_KEY_ID && config.S3_SECRET_ACCESS_KEY)
  );
}

/**
 * Lazily initialises and returns the shared AWS S3 client instance.
 */
export function getS3Client(): S3Client {
  if (s3Instance) return s3Instance;

  const credentials = (config.S3_ACCESS_KEY_ID && config.S3_SECRET_ACCESS_KEY)
    ? { accessKeyId: config.S3_ACCESS_KEY_ID, secretAccessKey: config.S3_SECRET_ACCESS_KEY }
    : undefined;

  s3Instance = new S3Client({
    endpoint: config.S3_ENDPOINT,
    region: config.S3_REGION || 'auto',
    forcePathStyle: config.S3_FORCE_PATH_STYLE,
    credentials,
  });

  return s3Instance;
}

/**
 * Resolves the effective S3 bucket and object key.
 * If config.S3_BUCKET_NAME is configured (Single-Bucket mode, standard for Tigris),
 * the logical bucket name is treated as a top-level folder prefix.
 */
export function resolveTarget(bucket: StorageBucket, key = ''): { s3Bucket: string; s3Key: string } {
  const cleanKey = key.replace(/^\/+/, '');
  if (config.S3_BUCKET_NAME) {
    const cleanBucket = bucket.replace(/^\/+|\/+$/g, '');
    const combinedKey = cleanKey ? `${cleanBucket}/${cleanKey}` : cleanBucket;
    return {
      s3Bucket: config.S3_BUCKET_NAME,
      s3Key: combinedKey,
    };
  }
  return {
    s3Bucket: bucket,
    s3Key: cleanKey,
  };
}

/**
 * Ensures a bucket exists on the S3 provider. Cached per process lifetime.
 */
export async function ensureBucketExists(bucket: StorageBucket): Promise<void> {
  const { s3Bucket } = resolveTarget(bucket);
  if (ensuredBuckets.has(s3Bucket)) return;

  const client = getS3Client();
  try {
    await client.send(new HeadBucketCommand({ Bucket: s3Bucket }));
    ensuredBuckets.add(s3Bucket);
  } catch (error: unknown) {
    // If not found, attempt creation
    try {
      await client.send(new CreateBucketCommand({ Bucket: s3Bucket }));
      ensuredBuckets.add(s3Bucket);
    } catch {
      // Bucket may exist or provider lacks permissions; proceed safely
      ensuredBuckets.add(s3Bucket);
    }
  }
}

/**
 * Uploads a buffer or byte array to S3.
 */
export async function uploadFile(
  bucket: StorageBucket,
  key: string,
  body: Buffer | Uint8Array,
  contentType = 'application/octet-stream'
): Promise<void> {
  const client = getS3Client();
  const { s3Bucket, s3Key } = resolveTarget(bucket, key);

  await client.send(
    new PutObjectCommand({
      Bucket: s3Bucket,
      Key: s3Key,
      Body: body,
      ContentType: contentType,
    })
  );
}

/**
 * Downloads a file from S3 as a Buffer.
 */
export async function downloadFile(
  bucket: StorageBucket,
  key: string
): Promise<Buffer> {
  const client = getS3Client();
  const { s3Bucket, s3Key } = resolveTarget(bucket, key);

  const response = await client.send(
    new GetObjectCommand({
      Bucket: s3Bucket,
      Key: s3Key,
    })
  );

  if (!response.Body) {
    throw new Error(`Empty response body for ${s3Bucket}/${s3Key}`);
  }

  const byteArray = await response.Body.transformToByteArray();
  return Buffer.from(byteArray);
}

/**
 * Deletes one or more files from S3.
 */
export async function deleteFiles(
  bucket: StorageBucket,
  keys: string[]
): Promise<void> {
  if (keys.length === 0) return;
  const client = getS3Client();
  const { s3Bucket } = resolveTarget(bucket);
  const normalized = keys.map((k) => resolveTarget(bucket, k).s3Key);

  if (normalized.length === 1) {
    await client.send(
      new DeleteObjectCommand({
        Bucket: s3Bucket,
        Key: normalized[0],
      })
    );
    return;
  }

  await client.send(
    new DeleteObjectsCommand({
      Bucket: s3Bucket,
      Delete: {
        Objects: normalized.map((Key) => ({ Key })),
        Quiet: true,
      },
    })
  );
}

/**
 * Lists files in an S3 bucket matching an optional prefix.
 */
export async function listFiles(
  bucket: StorageBucket,
  prefix = ''
): Promise<StorageFileItem[]> {
  const client = getS3Client();
  const { s3Bucket, s3Key } = resolveTarget(bucket, prefix);
  const effectivePrefix = config.S3_BUCKET_NAME
    ? (s3Key.endsWith('/') ? s3Key : `${s3Key}/`)
    : (prefix ? prefix.replace(/^\/+/, '') : undefined);

  const response = await client.send(
    new ListObjectsV2Command({
      Bucket: s3Bucket,
      Prefix: effectivePrefix,
    })
  );

  if (!response.Contents) return [];
  const stripPrefix = config.S3_BUCKET_NAME ? `${bucket.replace(/^\/+|\/+$/g, '')}/` : '';

  return response.Contents.map((item) => {
    const rawKey = item.Key ?? '';
    const key = stripPrefix && rawKey.startsWith(stripPrefix)
      ? rawKey.slice(stripPrefix.length)
      : rawKey;
    const name = key.includes('/') ? key.substring(key.lastIndexOf('/') + 1) : key;
    return {
      key,
      name,
      size: item.Size,
      lastModified: item.LastModified,
    };
  });
}

/**
 * Lists top-level folders / common prefixes under a prefix.
 */
export async function listFolders(
  bucket: StorageBucket,
  prefix = ''
): Promise<string[]> {
  const client = getS3Client();
  const { s3Bucket, s3Key } = resolveTarget(bucket, prefix);
  let normalizedPrefix = config.S3_BUCKET_NAME
    ? (s3Key.endsWith('/') ? s3Key : `${s3Key}/`)
    : (prefix ? prefix.replace(/^\/+/, '') : '');

  if (normalizedPrefix && !normalizedPrefix.endsWith('/')) {
    normalizedPrefix += '/';
  }

  const response = await client.send(
    new ListObjectsV2Command({
      Bucket: s3Bucket,
      Prefix: normalizedPrefix || undefined,
      Delimiter: '/',
    })
  );

  if (!response.CommonPrefixes) return [];
  const stripPrefix = config.S3_BUCKET_NAME ? `${bucket.replace(/^\/+|\/+$/g, '')}/` : '';

  return response.CommonPrefixes.map((p) => {
    const raw = p.Prefix ?? '';
    const relative = stripPrefix && raw.startsWith(stripPrefix) ? raw.slice(stripPrefix.length) : raw;
    const withoutPrefix = prefix ? relative.replace(new RegExp(`^${prefix.replace(/^\/+/, '')}/?`), '') : relative;
    return withoutPrefix.replace(/\/$/, '');
  }).filter(Boolean);
}

/**
 * Returns the public URL for an object.
 */
export function getPublicUrl(bucket: StorageBucket, key: string): string {
  const cleanKey = key.replace(/^\/+/, '');
  const cleanBucket = bucket.replace(/^\/+|\/+$/g, '');

  if (config.STORAGE_STREAMING_URL) {
    return `${config.STORAGE_STREAMING_URL.replace(/\/+$/, '')}/storage/${cleanBucket}/${cleanKey}`;
  }
  if (config.APP_URL) {
    return `${config.APP_URL.replace(/\/+$/, '')}/storage/${cleanBucket}/${cleanKey}`;
  }
  if (config.S3_PUBLIC_DOMAIN) {
    const domain = config.S3_PUBLIC_DOMAIN.replace(/^https?:\/\//, '').replace(/\/+$/, '');
    const { s3Bucket, s3Key } = resolveTarget(bucket, key);
    return `https://${domain}/${s3Bucket}/${s3Key}`;
  }
  if (config.S3_PUBLIC_URL) {
    const baseUrl = config.S3_PUBLIC_URL.replace(/\/+$/, '');
    const { s3Bucket, s3Key } = resolveTarget(bucket, key);
    return `${baseUrl}/${s3Bucket}/${s3Key}`;
  }
  return `/storage/${cleanBucket}/${cleanKey}`;
}

/**
 * Generates a presigned GET URL for an object in S3.
 */
export async function getSignedUrl(
  bucket: StorageBucket,
  key: string,
  expiresInSeconds = 3600
): Promise<string> {
  const client = getS3Client();
  const { s3Bucket, s3Key } = resolveTarget(bucket, key);

  const command = new GetObjectCommand({
    Bucket: s3Bucket,
    Key: s3Key,
  });

  return getAwsSignedUrl(client, command, { expiresIn: expiresInSeconds });
}
