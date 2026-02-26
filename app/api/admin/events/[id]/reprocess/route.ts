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

        const event = await prisma.event.findUnique({
            where: { id },
            select: { id: true, name: true }
        });

        if (!event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        const photos = await prisma.photo.findMany({
            where: { eventId: id },
            select: { id: true }
        });

        console.log(`[ReprocessAPI] Starting branding update for ${photos.length} photos in event "${event.name}"`);

        // We reprocess photos sequentially to avoid overloading the system
        const results = [];
        for (const photo of photos) {
            try {
                await reprocessPhoto(photo.id);
                results.push({ id: photo.id, status: 'success' });
            } catch (err) {
                console.error(`[ReprocessAPI] Failed to reprocess photo ${photo.id}:`, err);
                results.push({ id: photo.id, status: 'failed' });
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
