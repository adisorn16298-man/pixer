import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { reprocessPhoto } from '@/lib/image-processor';

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;
        console.log(`[SingleReprocessAPI] Reprocessing photo: ${id}`);

        const photo = await prisma.photo.findUnique({
            where: { id },
            select: { id: true, eventId: true }
        });

        if (!photo) {
            return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
        }

        await reprocessPhoto(id);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error(`[SingleReprocessAPI] Error reprocessing photo ${params.id}:`, error);
        return NextResponse.json({ error: error.message || 'Failed to reprocess photo' }, { status: 500 });
    }
}
