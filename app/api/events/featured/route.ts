import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const events = await prisma.event.findMany({
            where: {
                isFeatured: true
            },
            include: {
                photographer: {
                    select: {
                        name: true,
                        brandName: true,
                        brandLogoUrl: true
                    }
                },
                _count: {
                    select: { photos: true }
                }
            },
            orderBy: {
                date: 'desc'
            }
        });

        return NextResponse.json(events);
    } catch (error) {
        console.error('Featured Events API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch featured events' }, { status: 500 });
    }
}
