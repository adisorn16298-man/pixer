import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { reprocessPhoto } from '@/lib/image-processor';

export const maxDuration = 300; // 5 minutes

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;
        console.log(`[ReprocessAPI] Request for event ID: ${id}`);

        const event = await prisma.event.findUnique({
            where: { id },
            select: { id: true, name: true }
        });

        if (!event) {
            console.warn(`[ReprocessAPI] Event not found: ${id}`);
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        console.log(`[ReprocessAPI] Event found: ${event.name}. Fetching photos...`);

        const photos = await prisma.photo.findMany({
            where: { eventId: id },
            select: { id: true }
        });

        console.log(`[ReprocessAPI] Found ${photos.length} photos. Starting loop...`);

        // We reprocess photos sequentially to avoid overloading the system
        const results = [];
        for (const photo of photos) {
            try {
                console.log(`[ReprocessAPI] Processing photo ${photo.id}...`);
                await reprocessPhoto(photo.id);
                results.push({ id: photo.id, status: 'success' });
            } catch (err: any) {
                console.error(`[ReprocessAPI] Failed to reprocess photo ${photo.id}: ${err.message}`, err);
                results.push({ id: photo.id, status: 'failed', error: err.message });
            }
        }

        const successCount = results.filter(r => r.status === 'success').length;
        const failCount = results.filter(r => r.status === 'failed').length;

        return NextResponse.json({
            message: `Branding updated for ${successCount} photos. ${failCount} failed.`,
            successCount,
            failCount,
            total: photos.length
        });
    } catch (error) {
        console.error('CRITICAL Reprocess error:', error);
        return NextResponse.json({ error: 'Failed to reprocess branding' }, { status: 500 });
    }
}
