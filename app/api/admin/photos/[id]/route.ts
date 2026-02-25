import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import fs from 'fs/promises';
import path from 'path';
import { deleteFromDrive } from '@/lib/gdrive';

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const photo = await prisma.photo.findUnique({
            where: { id: params.id }
        });

        if (!photo) {
            return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
        }

        // 1. Delete from Google Drive if exists
        if (photo.gDriveFileId) {
            console.log(`[PhotoAPI] Deleting from Google Drive: ${photo.gDriveFileId}`);
            await deleteFromDrive(photo.gDriveFileId);
        }

        // 2. Delete from Database
        await prisma.photo.delete({
            where: { id: params.id }
        });

        // 3. Delete files from storage (Local for now as per current setup)
        const keys = [photo.originalKey, photo.watermarkedKey, photo.thumbnailKey];

        for (const key of keys) {
            const filePath = path.join(process.cwd(), 'public', key);
            await fs.unlink(filePath).catch(err => console.warn(`Failed to delete file ${key}:`, err));
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('DELETE Photo Error:', error);
        return NextResponse.json({ error: 'Failed to delete photo' }, { status: 500 });
    }
}
