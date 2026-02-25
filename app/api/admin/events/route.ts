import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { nanoid } from 'nanoid';

export async function GET() {
    try {
        const events = await prisma.event.findMany({
            include: {
                _count: {
                    select: { photos: true, moments: true }
                }
            },
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json(events);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, date, slug, templateId } = body;

        // Hardcode a default photographer for now (first user)
        const photographer = await prisma.user.findFirst();
        if (!photographer) {
            return NextResponse.json({ error: 'No photographer found' }, { status: 400 });
        }

        const event = await prisma.event.create({
            data: {
                name,
                date: new Date(date),
                slug: slug || `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${nanoid(4)}`,
                shortHash: nanoid(7), // Generate Pixer style hash
                photographerId: photographer.id,
                templateId: (templateId && templateId !== 'none') ? templateId : null,
            },
        });

        return NextResponse.json(event);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
    }
}
