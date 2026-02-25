import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const photoId = searchParams.get('photoId');

    if (!photoId) {
        return new NextResponse('Missing photoId', { status: 400 });
    }

    try {
        const photo = await prisma.photo.findUnique({
            where: { id: photoId }
        });

        if (!photo) {
            return new NextResponse('Photo not found', { status: 404 });
        }

        const { isS3Enabled, getObjectFromS3 } = await import('@/lib/s3-upload');
        const fileName = `pixer-${photo.id}.jpg`;

        if (isS3Enabled) {
            console.log(`[DownloadAPI] Fetching from S3: ${photo.watermarkedKey}`);
            const s3Response = await getObjectFromS3(photo.watermarkedKey);

            if (!s3Response.Body) {
                return new NextResponse('File body empty', { status: 404 });
            }

            // In Node.js environment, Body is a IncomingMessage/Readable, but SDK v3 provides transformToWebStream
            // @ts-ignore - transformToWebStream exists on the Node.js SDK stream response
            const webStream = s3Response.Body.transformToWebStream();

            return new NextResponse(webStream, {
                headers: {
                    'Content-Type': s3Response.ContentType || 'image/jpeg',
                    'Content-Disposition': `attachment; filename="${fileName}"`,
                    'Content-Length': s3Response.ContentLength?.toString() || '',
                },
            });
        }

        // Fallback to local the path to the watermarked image
        const filePath = path.join(process.cwd(), 'public', photo.watermarkedKey);

        if (!fs.existsSync(filePath)) {
            console.error(`File not found: ${filePath}`);
            return new NextResponse('File not found', { status: 404 });
        }

        const stats = fs.statSync(filePath);
        const fileStream = fs.createReadStream(filePath);

        // Convert Node.js ReadStream to Web ReadableStream for Next.js
        const webStream = new ReadableStream({
            start(controller) {
                fileStream.on('data', (chunk) => controller.enqueue(chunk));
                fileStream.on('end', () => controller.close());
                fileStream.on('error', (err) => controller.error(err));
            },
            cancel() {
                fileStream.destroy();
            }
        });

        return new NextResponse(webStream, {
            headers: {
                'Content-Type': 'image/jpeg',
                'Content-Disposition': `attachment; filename="${fileName}"`,
                'Content-Length': stats.size.toString(),
            },
        });
    } catch (error) {
        console.error('Download API error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
