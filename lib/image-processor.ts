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

interface ProcessImageOptions {
  buffer: Buffer;
  filename: string;
  bucketName: string;
  watermarkInput?: string | Buffer;
  frameInput?: string | Buffer;
}

export async function processAndUploadImage({
  buffer,
  filename,
  bucketName,
  watermarkInput,
  frameInput,
}: ProcessImageOptions) {
  console.log(`[ImageProcessor] Processing ${filename}`);
  const originalKey = `originals/${filename}`;
  const watermarkedKey = `previews/${filename}`;
  const thumbnailKey = `thumbnails/${filename}`;

  try {
    // 1. Upload original
    const { isS3Enabled, uploadToS3 } = await import('./s3-upload');
    console.log(`[ImageProcessor] Writing original to ${originalKey}`);
    if (isS3Enabled) {
      await uploadToS3(buffer, originalKey, 'image/jpeg');
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

    // Helper to check if string is local path and exists
    const exists = async (p: string) => await fs.stat(p).then(() => true).catch(() => false);

    if (frameInput && (typeof frameInput !== 'string' || await exists(frameInput))) {
      // Resize frame to exact photo dimensions
      const frameBuffer = await sharp(frameInput)
        .resize(mainWidth, mainHeight, { fit: 'fill' })
        .toBuffer();
      composites.push({ input: frameBuffer, blend: 'over' as sharp.Blend });
    }

    if (watermarkInput && (typeof watermarkInput !== 'string' || await exists(watermarkInput))) {
      // Ensure watermark isn't larger than image
      const watermarkBuffer = await sharp(watermarkInput)
        .resize(mainWidth, mainHeight, { fit: 'inside', withoutEnlargement: true })
        .toBuffer();
      composites.push({ input: watermarkBuffer, gravity: 'center', blend: 'over' as sharp.Blend });
    }

    const processedBuffer = composites.length > 0
      ? await sharp(buffer).composite(composites).jpeg({ quality: 80 }).toBuffer()
      : buffer;

    if (isS3Enabled) {
      await uploadToS3(processedBuffer, watermarkedKey, 'image/jpeg');
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

    if (isS3Enabled) {
      await uploadToS3(thumbnailBuffer, thumbnailKey, 'image/jpeg');
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
      fileSize: buffer.length,
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

    let watermarkInput: string | Buffer | undefined = undefined;
    let frameInput: string | Buffer | undefined = undefined;

    if (selectedWatermarkUrl) {
      if (selectedWatermarkUrl.startsWith('http')) {
        console.log(`[ImageProcessor] Fetching remote watermark: ${selectedWatermarkUrl}`);
        const res = await fetch(selectedWatermarkUrl);
        if (res.ok) watermarkInput = Buffer.from(await res.arrayBuffer());
      } else {
        watermarkInput = (selectedWatermarkUrl.startsWith('/') && !selectedWatermarkUrl.startsWith('//'))
          ? path.join(process.cwd(), 'public', selectedWatermarkUrl.slice(1))
          : path.isAbsolute(selectedWatermarkUrl)
            ? selectedWatermarkUrl
            : path.join(process.cwd(), 'public', selectedWatermarkUrl);
      }
    }

    if (selectedFrameUrl) {
      if (selectedFrameUrl.startsWith('http')) {
        console.log(`[ImageProcessor] Fetching remote frame: ${selectedFrameUrl}`);
        const res = await fetch(selectedFrameUrl);
        if (res.ok) frameInput = Buffer.from(await res.arrayBuffer());
      } else {
        frameInput = (selectedFrameUrl.startsWith('/') && !selectedFrameUrl.startsWith('//'))
          ? path.join(process.cwd(), 'public', selectedFrameUrl.slice(1))
          : path.isAbsolute(selectedFrameUrl)
            ? selectedFrameUrl
            : path.join(process.cwd(), 'public', selectedFrameUrl);
      }
    }

    // 5. Process & Upload
    const result = await processAndUploadImage({
      buffer,
      filename,
      bucketName: process.env.S3_BUCKET_NAME || 'event-photos',
      watermarkInput,
      frameInput,
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
        fileSize: result.fileSize!,
        mimeType: 'image/jpeg', // Defaulting to jpeg since we process to jpeg
      },
    });

    return photo;
  } catch (error) {
    console.error('[ImageProcessor] Error in processPhotoForEvent:', error);
    throw error;
  }
}

async function getBufferFromKey(key: string): Promise<Buffer> {
  const { isS3Enabled, getObjectFromS3 } = await import('./s3-upload');

  try {
    if (isS3Enabled) {
      console.log(`[ImageProcessor] Fetching from S3: ${key}`);
      const response = await getObjectFromS3(key);
      if (!response.Body) throw new Error('S3 Response Body is empty');

      const bytes = await (response.Body as any).transformToByteArray();
      return Buffer.from(bytes);
    } else {
      const localPath = path.join(process.cwd(), 'public', key);
      console.log(`[ImageProcessor] Reading local file: ${localPath}`);
      return await fs.readFile(localPath);
    }
  } catch (err: any) {
    console.error(`[ImageProcessor] Error in getBufferFromKey for ${key}:`, err);
    throw new Error(`Failed to read photo data: ${err.message}`);
  }
}

export async function reprocessPhoto(photoId: string) {
  try {
    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
      include: { event: { include: { template: true } } }
    });

    if (!photo) throw new Error('Photo not found');

    console.log(`[ImageProcessor] Reprocessing photo ${photoId} (${photo.originalKey})`);

    // 1. Get original buffer
    const buffer = await getBufferFromKey(photo.originalKey);
    console.log(`[ImageProcessor] Original buffer loaded: ${buffer.length} bytes`);

    // 2. Identify orientation
    const metadata = await sharp(buffer).metadata();
    console.log(`[ImageProcessor] Metadata loaded, isPortrait: ${(metadata.height || 0) > (metadata.width || 0)}`);
    const isPortrait = (metadata.height || 0) > (metadata.width || 0);

    // 3. Resolve branding inputs (using the same logic as processPhotoForEvent)
    const user = await prisma.user.findFirst();
    console.log(`[ImageProcessor] User settings loaded: ${user?.brandName}`);

    let selectedWatermarkUrl = isPortrait
      ? ((photo.event?.template as any)?.watermarkPortraitUrl || (user as any)?.watermarkPortraitUrl || (photo.event?.template as any)?.watermarkUrl || (user as any)?.watermarkUrl)
      : ((photo.event?.template as any)?.watermarkUrl || (user as any)?.watermarkUrl);

    let selectedFrameUrl = isPortrait
      ? ((photo.event?.template as any)?.framePortraitUrl || (user as any)?.framePortraitUrl || (photo.event?.template as any)?.frameUrl || (user as any)?.frameUrl)
      : ((photo.event?.template as any)?.frameUrl || (user as any)?.frameUrl);

    let watermarkInput: string | Buffer | undefined = undefined;
    let frameInput: string | Buffer | undefined = undefined;

    if (selectedWatermarkUrl) {
      if (selectedWatermarkUrl.startsWith('http')) {
        const res = await fetch(selectedWatermarkUrl);
        if (res.ok) watermarkInput = Buffer.from(await res.arrayBuffer());
      } else {
        watermarkInput = (selectedWatermarkUrl.startsWith('/') && !selectedWatermarkUrl.startsWith('//'))
          ? path.join(process.cwd(), 'public', selectedWatermarkUrl.slice(1))
          : path.isAbsolute(selectedWatermarkUrl) ? selectedWatermarkUrl : path.join(process.cwd(), 'public', selectedWatermarkUrl);
      }
    }

    if (selectedFrameUrl) {
      if (selectedFrameUrl.startsWith('http')) {
        const res = await fetch(selectedFrameUrl);
        if (res.ok) frameInput = Buffer.from(await res.arrayBuffer());
      } else {
        frameInput = (selectedFrameUrl.startsWith('/') && !selectedFrameUrl.startsWith('//'))
          ? path.join(process.cwd(), 'public', selectedFrameUrl.slice(1))
          : path.isAbsolute(selectedFrameUrl) ? selectedFrameUrl : path.join(process.cwd(), 'public', selectedFrameUrl);
      }
    }

    // 4. Process & Upload (Overwriting existing keys)
    // We use the same keys from the photo record
    const { isS3Enabled, uploadToS3 } = await import('./s3-upload');

    // Generate Watermarked/Framed Image
    const composites = [];
    const mainWidth = metadata.width || 0;
    const mainHeight = metadata.height || 0;

    const exists = async (p: string) => await fs.stat(p).then(() => true).catch(() => false);

    if (frameInput && (typeof frameInput !== 'string' || await exists(frameInput))) {
      const frameBuffer = await sharp(frameInput).resize(mainWidth, mainHeight, { fit: 'fill' }).toBuffer();
      composites.push({ input: frameBuffer, blend: 'over' as sharp.Blend });
    }

    if (watermarkInput && (typeof watermarkInput !== 'string' || await exists(watermarkInput))) {
      const watermarkBuffer = await sharp(watermarkInput).resize(mainWidth, mainHeight, { fit: 'inside', withoutEnlargement: true }).toBuffer();
      composites.push({ input: watermarkBuffer, gravity: 'center', blend: 'over' as sharp.Blend });
    }

    const processedBuffer = composites.length > 0
      ? await sharp(buffer).composite(composites).jpeg({ quality: user?.jpegQuality || 80 }).toBuffer()
      : buffer;

    if (isS3Enabled) {
      await uploadToS3(processedBuffer, photo.watermarkedKey, 'image/jpeg');
    } else {
      const localPath = path.join(process.cwd(), 'public', photo.watermarkedKey);
      await fs.writeFile(localPath, processedBuffer);
    }

    // Generate Thumbnail
    const thumbnailBuffer = await sharp(buffer).resize(400, 400, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: user?.thumbQuality || 60 }).toBuffer();

    if (isS3Enabled) {
      await uploadToS3(thumbnailBuffer, photo.thumbnailKey, 'image/jpeg');
    } else {
      const localPath = path.join(process.cwd(), 'public', photo.thumbnailKey);
      await fs.writeFile(localPath, thumbnailBuffer);
    }

    console.log(`✅ [ImageProcessor] Reprocessed photo ${photoId} successfully.`);
    return true;
  } catch (error) {
    console.error(`[ImageProcessor] Failed to reprocess photo ${photoId}:`, error);
    throw error;
  }
}
