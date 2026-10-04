import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  HeadBucketCommand,
  CreateBucketCommand,
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

  const credentials =
    config.S3_ACCESS_KEY_ID && config.S3_SECRET_ACCESS_KEY
      ? {
          accessKeyId: config.S3_ACCESS_KEY_ID,
          secretAccessKey: config.S3_SECRET_ACCESS_KEY,
        }
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
 * Ensures a bucket exists on the S3 provider. Cached per process lifetime.
 */
export async function ensureBucketExists(bucket: StorageBucket): Promise<void> {
  if (ensuredBuckets.has(bucket)) return;

  const client = getS3Client();
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    ensuredBuckets.add(bucket);
  } catch (error: unknown) {
    // If not found, attempt creation
    try {
      await client.send(new CreateBucketCommand({ Bucket: bucket }));
      ensuredBuckets.add(bucket);
    } catch {
      // Bucket may exist or provider lacks permissions; proceed safely
      ensuredBuckets.add(bucket);
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
  const normalizedKey = key.replace(/^\/+/, '');

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: normalizedKey,
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
  const normalizedKey = key.replace(/^\/+/, '');

  const response = await client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: normalizedKey,
    })
  );

  if (!response.Body) {
    throw new Error(`Empty response body for ${bucket}/${normalizedKey}`);
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
  const normalized = keys.map((k) => k.replace(/^\/+/, ''));

  if (normalized.length === 1) {
    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: normalized[0],
      })
    );
    return;
  }

  await client.send(
    new DeleteObjectsCommand({
      Bucket: bucket,
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
  const normalizedPrefix = prefix ? prefix.replace(/^\/+/, '') : undefined;

  const response = await client.send(
    new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: normalizedPrefix,
    })
  );

  if (!response.Contents) return [];

  return response.Contents.map((item) => {
    const key = item.Key ?? '';
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
  let normalizedPrefix = prefix ? prefix.replace(/^\/+/, '') : '';
  if (normalizedPrefix && !normalizedPrefix.endsWith('/')) {
    normalizedPrefix += '/';
  }

  const response = await client.send(
    new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: normalizedPrefix || undefined,
      Delimiter: '/',
    })
  );

  if (!response.CommonPrefixes) return [];

  return response.CommonPrefixes.map((p) => {
    const raw = p.Prefix ?? '';
    const withoutPrefix = normalizedPrefix ? raw.replace(normalizedPrefix, '') : raw;
    return withoutPrefix.replace(/\/$/, '');
  }).filter(Boolean);
}

/**
 * Returns the public URL for an object.
 */
export function getPublicUrl(bucket: StorageBucket, key: string): string {
  const cleanKey = key.replace(/^\/+/, '');

  if (config.S3_PUBLIC_DOMAIN) {
    const domain = config.S3_PUBLIC_DOMAIN.replace(/^https?:\/\//, '').replace(/\/+$/, '');
    return `https://${domain}/${bucket}/${cleanKey}`;
  }

  if (config.S3_PUBLIC_URL) {
    const baseUrl = config.S3_PUBLIC_URL.replace(/\/+$/, '');
    return `${baseUrl}/${bucket}/${cleanKey}`;
  }

  const endpoint = (config.S3_ENDPOINT || 'http://localhost:9000').replace(/\/+$/, '');
  return `${endpoint}/${bucket}/${cleanKey}`;
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
  const normalizedKey = key.replace(/^\/+/, '');

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: normalizedKey,
  });

  return getAwsSignedUrl(client, command, { expiresIn: expiresInSeconds });
}
