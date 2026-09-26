import { randomUUID } from 'crypto';
import { mkdir, unlink, writeFile } from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

dotenv.config();

export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type VehicleImageMimeType = (typeof IMAGE_MIME_TYPES)[number];

export interface StoredVehicleImage {
  imageUrl: string;
  storageKey: string;
}

export interface ImageStorageProvider {
  uploadVehicleImage(input: { buffer: Buffer; mimeType: VehicleImageMimeType; vehicleId: string }): Promise<StoredVehicleImage>;
  deleteVehicleImage(input: { storageKey?: string | null; imageUrl?: string | null }): Promise<void>;
  getPublicUrl(storageKey: string): string;
}

function envNumber(name: string, fallback: number): number {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const imageStorageConfig = {
  // Local storage is a development default only. Production must opt into a
  // durable provider explicitly so a missing secret cannot look successful.
  provider: (process.env.IMAGE_STORAGE_PROVIDER || (process.env.NODE_ENV === 'production' ? 'unconfigured' : 'local')).toLowerCase(),
  uploadDir: path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads')),
  publicBaseUrl: (process.env.PUBLIC_UPLOAD_BASE_URL || 'http://localhost:3005/uploads').replace(/\/$/, ''),
  maxBytes: envNumber('MAX_VEHICLE_IMAGE_BYTES', 8 * 1024 * 1024),
  maxImages: envNumber('MAX_VEHICLE_IMAGES', 12),
};

function extensionForMime(mimeType: VehicleImageMimeType): string {
  return mimeType === 'image/jpeg' ? 'jpg' : mimeType.slice('image/'.length);
}

function requiredEnv(names: string[]): string[] {
  return names.filter((name) => !process.env[name]);
}

class LocalImageStorageProvider implements ImageStorageProvider {
  getPublicUrl(storageKey: string) {
    return `${imageStorageConfig.publicBaseUrl}/${storageKey.split('/').map(encodeURIComponent).join('/')}`;
  }

  async uploadVehicleImage({ buffer, mimeType, vehicleId }: { buffer: Buffer; mimeType: VehicleImageMimeType; vehicleId: string }) {
    const storageKey = path.posix.join('vehicle-images', vehicleId, `${randomUUID()}.${extensionForMime(mimeType)}`);
    const target = path.join(imageStorageConfig.uploadDir, ...storageKey.split('/'));
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, buffer, { flag: 'wx' });
    return { storageKey, imageUrl: this.getPublicUrl(storageKey) };
  }

  async deleteVehicleImage({ storageKey }: { storageKey?: string | null }) {
    if (!storageKey) return;
    const root = path.resolve(imageStorageConfig.uploadDir);
    const target = path.resolve(root, ...storageKey.split('/'));
    if (target !== root && !target.startsWith(`${root}${path.sep}`)) throw new Error('Geçersiz storage anahtarı.');
    try { await unlink(target); } catch (error: any) { if (error?.code !== 'ENOENT') throw error; }
  }
}

class CloudinaryImageStorageProvider implements ImageStorageProvider {
  constructor() {
    const missing = requiredEnv(['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']);
    if (missing.length) throw new Error(`Cloudinary görsel depolama yapılandırması eksik: ${missing.join(', ')}`);
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
  }

  getPublicUrl(storageKey: string) {
    return cloudinary.url(storageKey, { secure: true, resource_type: 'image' });
  }

  async uploadVehicleImage({ buffer, mimeType, vehicleId }: { buffer: Buffer; mimeType: VehicleImageMimeType; vehicleId: string }) {
    const result = await new Promise<any>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({ folder: `ss-filo/vehicles/${vehicleId}`, resource_type: 'image' }, (error, uploaded) => error ? reject(error) : resolve(uploaded));
      stream.end(buffer);
    });
    return { storageKey: result.public_id as string, imageUrl: result.secure_url as string };
  }

  async deleteVehicleImage({ storageKey }: { storageKey?: string | null }) {
    if (storageKey) await cloudinary.uploader.destroy(storageKey, { resource_type: 'image', invalidate: true });
  }
}

class S3ImageStorageProvider implements ImageStorageProvider {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly endpoint?: string;

  constructor() {
    const missing = requiredEnv(['S3_BUCKET', 'S3_REGION', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY']);
    if (missing.length) throw new Error(`S3 görsel depolama yapılandırması eksik: ${missing.join(', ')}`);
    this.bucket = process.env.S3_BUCKET!;
    this.endpoint = process.env.S3_ENDPOINT || undefined;
    this.client = new S3Client({
      region: process.env.S3_REGION!,
      endpoint: this.endpoint,
      forcePathStyle: Boolean(this.endpoint),
      credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID!, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY! },
    });
  }

  getPublicUrl(storageKey: string) {
    return imageStorageConfig.publicBaseUrl !== 'http://localhost:3005/uploads'
      ? `${imageStorageConfig.publicBaseUrl}/${storageKey}`
      : `${this.endpoint || `https://${this.bucket}.s3.${process.env.S3_REGION}.amazonaws.com`}/${storageKey}`;
  }

  async uploadVehicleImage({ buffer, mimeType, vehicleId }: { buffer: Buffer; mimeType: VehicleImageMimeType; vehicleId: string }) {
    const storageKey = path.posix.join('vehicle-images', vehicleId, `${randomUUID()}.${extensionForMime(mimeType)}`);
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: storageKey, Body: buffer, ContentType: mimeType }));
    return { storageKey, imageUrl: this.getPublicUrl(storageKey) };
  }

  async deleteVehicleImage({ storageKey }: { storageKey?: string | null }) {
    if (storageKey) await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: storageKey }));
  }
}

let provider: ImageStorageProvider | undefined;
export function getImageStorageProvider(): ImageStorageProvider {
  if (provider) return provider;
  if (imageStorageConfig.provider === 'local') provider = new LocalImageStorageProvider();
  else if (imageStorageConfig.provider === 'cloudinary') provider = new CloudinaryImageStorageProvider();
  else if (imageStorageConfig.provider === 's3') provider = new S3ImageStorageProvider();
  else throw new Error(`Desteklenmeyen IMAGE_STORAGE_PROVIDER: ${imageStorageConfig.provider}`);
  return provider;
}

/** Dosya uzantısına değil, binary magic byte'larına göre gerçek MIME tespiti. */
export function detectImageMime(buffer: Buffer): VehicleImageMimeType | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  return null;
}

export function isLegacyDataUrl(value?: string | null): boolean {
  return Boolean(value && /^data:image\//i.test(value));
}
