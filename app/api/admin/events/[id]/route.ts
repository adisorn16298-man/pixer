import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const event = await prisma.event.findUnique({
            where: { id: params.id },
            include: {
                moments: {
                    include: {
                        _count: { select: { photos: true } }
                    }
                },
                photos: {
                    orderBy: { createdAt: 'desc' }
                },
                template: true,
            },
        });

        if (!event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        return NextResponse.json(event);
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();
        const { name, slug, date, templateId, primaryColor, secondaryColor, backgroundColor, logoUrl, isFeatured } = body;

        const event = await prisma.event.update({
            where: { id: params.id },
            data: {
                name,
                slug,
                date: date ? new Date(date) : undefined,
                templateId: templateId === 'none' ? null : templateId,
                primaryColor,
                secondaryColor,
                backgroundColor,
                logoUrl,
                isFeatured
            } as any,
        });

        return NextResponse.json(event);
    } catch (error) {
        console.error('PATCH Event Error:', error);
        return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        // 1. Delete moments
        await prisma.moment.deleteMany({
            where: { eventId: params.id }
        });

        // 2. Delete photos (Note: In a real S3 setup, we should also delete files)
        // For now, metadata cleanup is primary
        await prisma.photo.deleteMany({
            where: { eventId: params.id }
        });

        // 3. Delete event
        await prisma.event.delete({
            where: { id: params.id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('DELETE Event Error:', error);
        return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
    }
}
