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

        // Resolve the local path to the watermarked image
        const filePath = path.join(process.cwd(), 'public', photo.watermarkedKey);

        if (!fs.existsSync(filePath)) {
            console.error(`File not found: ${filePath}`);
            return new NextResponse('File not found', { status: 404 });
        }

        const stats = fs.statSync(filePath);
        const fileName = `pixer-${photo.id}.jpg`;
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
