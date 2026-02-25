import sharp from 'sharp';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs/promises';
import path from 'path';
import { nanoid } from 'nanoid';
import prisma from './prisma';

const s3Enabled =
  !!process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_ACCESS_KEY_ID !== 'your-access-key' &&
  !process.env.S3_ENDPOINT?.includes('<accountid>');

const s3Client = s3Enabled ? new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
  endpoint: process.env.S3_ENDPOINT,
}) : null;

interface ProcessImageOptions {
  buffer: Buffer;
  filename: string;
  bucketName: string;
  watermarkPath?: string;
  framePath?: string;
}

export async function processAndUploadImage({
  buffer,
  filename,
  bucketName,
  watermarkPath,
  framePath,
}: ProcessImageOptions) {
  console.log(`[ImageProcessor] Processing ${filename}`);
  const originalKey = `originals/${filename}`;
  const watermarkedKey = `previews/${filename}`;
  const thumbnailKey = `thumbnails/${filename}`;

  try {
    // 1. Upload original
    console.log(`[ImageProcessor] Writing original to ${originalKey}`);
    if (s3Client) {
      await s3Client.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: originalKey,
        Body: buffer,
        ContentType: 'image/jpeg',
      }));
    } else {
      const localPath = path.join(process.cwd(), 'public', originalKey);
      await fs.mkdir(path.dirname(localPath), { recursive: true });
      await fs.writeFile(localPath, buffer);
    }

    // 2. Generate Watermarked/Framed Image
    const composites = [];
    const mainMetadata = await sharp(buffer).metadata();
    const mainWidth = mainMetadata.width || 0;
    const mainHeight = mainMetadata.height || 0;

    if (framePath && (await fs.stat(framePath).catch(() => null))) {
      // Resize frame to exact photo dimensions
      const frameBuffer = await sharp(framePath)
        .resize(mainWidth, mainHeight, { fit: 'fill' })
        .toBuffer();
      composites.push({ input: frameBuffer, blend: 'over' as sharp.Blend });
    }

    if (watermarkPath && (await fs.stat(watermarkPath).catch(() => null))) {
      // Ensure watermark isn't larger than image
      const watermarkBuffer = await sharp(watermarkPath)
        .resize(mainWidth, mainHeight, { fit: 'inside', withoutEnlargement: true })
        .toBuffer();
      composites.push({ input: watermarkBuffer, gravity: 'center', blend: 'over' as sharp.Blend });
    }

    const processedBuffer = composites.length > 0
      ? await sharp(buffer).composite(composites).jpeg({ quality: 80 }).toBuffer()
      : buffer;

    if (s3Client) {
      await s3Client.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: watermarkedKey,
        Body: processedBuffer,
        ContentType: 'image/jpeg',
      }));
    } else {
      const localPath = path.join(process.cwd(), 'public', watermarkedKey);
      await fs.mkdir(path.dirname(localPath), { recursive: true });
      await fs.writeFile(localPath, processedBuffer);
    }

    // 3. Generate Thumbnail
    const thumbnailBuffer = await sharp(buffer)
      .resize(400, 400, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 60 })
      .toBuffer();

    if (s3Client) {
      await s3Client.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: thumbnailKey,
        Body: thumbnailBuffer,
        ContentType: 'image/jpeg',
      }));
    } else {
      const localPath = path.join(process.cwd(), 'public', thumbnailKey);
      await fs.mkdir(path.dirname(localPath), { recursive: true });
      await fs.writeFile(localPath, thumbnailBuffer);
    }

    const metadata = await sharp(buffer).metadata();

    return {
      originalKey,
      watermarkedKey,
      thumbnailKey,
      width: metadata.width,
      height: metadata.height,
    };
  } catch (err) {
    console.error(`[ImageProcessor] CRITICAL FAILURE:`, err);
    throw err;
  }
}

export async function processPhotoForEvent(buffer: Buffer, originalFilename: string, eventId: string, momentId?: string | null) {
  try {
    const filename = `${nanoid(10)}${path.extname(originalFilename)}`;

    // 1. Get metadata for orientation
    const metadata = await sharp(buffer).metadata();
    const isPortrait = (metadata.height || 0) > (metadata.width || 0);

    // 2. Get event & template
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { template: true },
    });

    if (!event) throw new Error('Event not found');

    // 3. Get user for fallbacks and quality settings
    const user = await prisma.user.findFirst();

    const jpegQuality = user?.jpegQuality || 80;
    const thumbQuality = user?.thumbQuality || 60;

    // 4. Resolve paths
    let selectedWatermarkUrl = isPortrait
      ? ((event?.template as any)?.watermarkPortraitUrl || (user as any)?.watermarkPortraitUrl || (event?.template as any)?.watermarkUrl || (user as any)?.watermarkUrl)
      : ((event?.template as any)?.watermarkUrl || (user as any)?.watermarkUrl);

    let selectedFrameUrl = isPortrait
      ? ((event?.template as any)?.framePortraitUrl || (user as any)?.framePortraitUrl || (event?.template as any)?.frameUrl || (user as any)?.frameUrl)
      : ((event?.template as any)?.frameUrl || (user as any)?.frameUrl);

    let watermarkPath = undefined;
    let framePath = undefined;

    if (selectedWatermarkUrl) {
      watermarkPath = (selectedWatermarkUrl.startsWith('/') && !selectedWatermarkUrl.startsWith('//'))
        ? path.join(process.cwd(), 'public', selectedWatermarkUrl.slice(1))
        : path.isAbsolute(selectedWatermarkUrl)
          ? selectedWatermarkUrl
          : path.join(process.cwd(), 'public', selectedWatermarkUrl);
    }

    if (selectedFrameUrl) {
      framePath = (selectedFrameUrl.startsWith('/') && !selectedFrameUrl.startsWith('//'))
        ? path.join(process.cwd(), 'public', selectedFrameUrl.slice(1))
        : path.isAbsolute(selectedFrameUrl)
          ? selectedFrameUrl
          : path.join(process.cwd(), 'public', selectedFrameUrl);
    }

    // 5. Process & Upload
    const result = await processAndUploadImage({
      buffer,
      filename,
      bucketName: 'event-photos',
      watermarkPath,
      framePath,
    });

    // 6. DB Entry
    const photo = await prisma.photo.create({
      data: {
        eventId,
        momentId: (momentId && momentId !== 'all') ? momentId : null,
        originalKey: result.originalKey,
        watermarkedKey: result.watermarkedKey,
        thumbnailKey: result.thumbnailKey,
        width: result.width!,
        height: result.height!,
        mimeType: 'image/jpeg', // Defaulting to jpeg since we process to jpeg
      },
    });

    return photo;
  } catch (error) {
    console.error('[ImageProcessor] Error in processPhotoForEvent:', error);
    throw error;
  }
}
