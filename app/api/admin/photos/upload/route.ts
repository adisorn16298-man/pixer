import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { processPhotoForEvent } from '@/lib/image-processor';
import { getOrCreateFolder, uploadToDrive } from '@/lib/gdrive';

// Increase body size limit for photo uploads
export const maxDuration = 60; // 60 seconds
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const eventId = formData.get('eventId') as string;
        const momentId = formData.get('momentId') as string;

        if (!file) {
            console.log('Upload failed: No file found in FormData');
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const event = await prisma.event.findUnique({
            where: { id: eventId },
            select: { slug: true, name: true }
        });

        if (!event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        console.log(`Processing upload for event ${event.name}, moment ${momentId}. File: ${file.name}`);

        const buffer = Buffer.from(await file.arrayBuffer());

        console.log('Starting image processing via shared logic...');
        const photo = await processPhotoForEvent(
            buffer,
            file.name,
            eventId,
            momentId
        );
        console.log('Upload and processing successful:', photo.id);

        // --- GDrive Archiving ---
        console.log(`[UploadAPI] ☁️  Archiving to Google Drive...`);
        try {
            const rootFolderId = await getOrCreateFolder('PIXER_ARCHIVE');
            const eventFolderId = await getOrCreateFolder(event.slug, rootFolderId || undefined);

            const gDriveFile = await uploadToDrive(buffer, file.name, eventFolderId || undefined);

            if (gDriveFile.id) {
                await prisma.photo.update({
                    where: { id: photo.id },
                    data: { gDriveFileId: gDriveFile.id }
                });
                console.log(`[UploadAPI] ✅ Archived to Google Drive: ${gDriveFile.id}`);
            }
        } catch (gdriveError) {
            console.error(`[UploadAPI] ⚠️  Google Drive Archive Failed:`, gdriveError);
            // We don't fail the whole request just because archive failed
        }

        return NextResponse.json(photo);
    } catch (error) {
        console.error('CRITICAL Upload error:', error);
        return NextResponse.json({ error: 'Failed to upload photo' }, { status: 500 });
    }
}
