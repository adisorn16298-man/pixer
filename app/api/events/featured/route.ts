import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const event = await prisma.event.findFirst({
            where: {
                isFeatured: true
            },
            include: {
                photographer: true,
                moments: true,
                photos: {
                    orderBy: {
                        createdAt: 'desc'
                    }
                },
            },
        });

        return NextResponse.json(event);
    } catch (error) {
        console.error('Featured Events API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch featured events' }, { status: 500 });
    }
}
