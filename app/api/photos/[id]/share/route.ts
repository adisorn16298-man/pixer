import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;

        const photo = await prisma.photo.findUnique({
            where: { id },
            select: { id: true }
        });

        if (!photo) {
            return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
        }

        await prisma.photo.update({
            where: { id },
            data: { shareCount: { increment: 1 } }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Share tracking error:', error);
        return NextResponse.json({ error: 'Failed to track share' }, { status: 500 });
    }
}
