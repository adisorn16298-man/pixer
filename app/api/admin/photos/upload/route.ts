import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { processPhotoForEvent } from '@/lib/image-processor';
import { getOrCreateFolder, uploadToDrive } from '@/lib/gdrive';

// Increase body size limit for photo uploads
export const maxDuration = 300; // 300 seconds (5 minutes)
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
            select: { id: true, slug: true, name: true }
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

        // --- GDrive Archiving (NON-BLOCKING) ---
        // We trigger this but don't 'await' it so the response can be sent back immediately
        (async () => {
            console.log(`[UploadAPI-Background] ☁️  Archiving photo ${photo.id} to Google Drive...`);
            try {
                const rootFolderId = await getOrCreateFolder('PIXER_ARCHIVE');
                const eventFolderId = await getOrCreateFolder(event.slug, rootFolderId || undefined);

                const gDriveFile = await uploadToDrive(buffer, file.name, eventFolderId || undefined);

                if (gDriveFile.id) {
                    await prisma.photo.update({
                        where: { id: photo.id },
                        data: { gDriveFileId: gDriveFile.id }
                    });
                    console.log(`[UploadAPI-Background] ✅ Archived to Google Drive: ${gDriveFile.id}`);
                }
            } catch (gdriveError) {
                console.error(`[UploadAPI-Background] ⚠️  Google Drive Archive Failed for photo ${photo.id}:`, gdriveError);
            }
        })();

        return NextResponse.json(photo);
    } catch (error) {
        console.error('CRITICAL Upload error:', error);
        return NextResponse.json({ error: 'Failed to upload photo' }, { status: 500 });
    }
}
