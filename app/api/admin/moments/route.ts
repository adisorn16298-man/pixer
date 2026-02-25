import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, eventId } = body;

        const moment = await prisma.moment.create({
            data: {
                name,
                eventId,
            },
        });

        return NextResponse.json(moment);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create moment' }, { status: 500 });
    }
}
