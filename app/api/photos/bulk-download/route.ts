import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import archiver from 'archiver';
import path from 'path';
import fs from 'fs';
import { Readable } from 'stream';

export async function POST(req: NextRequest) {
    try {
        const { photoIds } = await req.json();

        if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
            return NextResponse.json({ error: 'No photo IDs provided' }, { status: 400 });
        }

        const photos = await prisma.photo.findMany({
            where: { id: { in: photoIds } }
        });

        if (photos.length === 0) {
            return NextResponse.json({ error: 'No photos found' }, { status: 404 });
        }

        const { isS3Enabled, getObjectFromS3 } = await import('@/lib/s3-upload');

        // Create a PassThrough stream to pipe zip data to
        const archive = archiver('zip', { zlib: { level: 9 } });

        // We use a Readable.from to create the response body
        // but we need to manage the piping correctly.
        // A better way for Next.js is to use a Transform stream or similar.
        const stream = new Readable({
            read() { }
        });

        archive.on('data', (chunk) => stream.push(chunk));
        archive.on('end', () => stream.push(null));
        archive.on('error', (err) => { throw err; });

        // Build the archive
        (async () => {
            for (const photo of photos) {
                const fileName = `photo-${photo.id}.jpg`;

                if (isS3Enabled) {
                    try {
                        const s3Response = await getObjectFromS3(photo.watermarkedKey);
                        if (s3Response.Body) {
                            // S3 Body in SDK v3 can be a stream
                            archive.append(s3Response.Body as any, { name: fileName });
                        }
                    } catch (err) {
                        console.error(`Error adding S3 file ${photo.watermarkedKey} to zip:`, err);
                    }
                } else {
                    const filePath = path.join(process.cwd(), 'public', photo.watermarkedKey);
                    if (fs.existsSync(filePath)) {
                        archive.file(filePath, { name: fileName });
                    }
                }
            }
            await archive.finalize();
        })().catch(err => {
            console.error('Archive finalization error:', err);
            stream.destroy(err);
        });

        // @ts-ignore - Next.js response accepts Web streams or Node streams in some contexts
        return new NextResponse(stream as any, {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="photos.zip"`,
            },
        });

    } catch (error: any) {
        console.error('Bulk download API error:', error);
        return NextResponse.json({ error: error.message || 'Failed to create bulk download' }, { status: 500 });
    }
}
