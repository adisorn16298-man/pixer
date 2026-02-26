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
        console.log(`[ReprocessAPI] Fetching photo IDs for event: ${id}`);

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

        console.log(`[ReprocessAPI] Found ${photos.length} photos to reprocess.`);

        return NextResponse.json({
            photos: photos.map(p => p.id),
            total: photos.length
        });
    } catch (error) {
        console.error('CRITICAL Reprocess List error:', error);
        return NextResponse.json({ error: 'Failed to fetch photo list for reprocessing' }, { status: 500 });
    }
}
