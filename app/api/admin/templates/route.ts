import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
    const templates = await prisma.brandingTemplate.findMany({
        orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(templates);
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, frameUrl, watermarkUrl, framePortraitUrl, watermarkPortraitUrl } = body;

        // Find the first user (default photographer)
        const user = await prisma.user.findFirst();
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const template = await prisma.brandingTemplate.create({
            data: {
                name,
                frameUrl,
                watermarkUrl,
                framePortraitUrl,
                watermarkPortraitUrl,
                photographerId: user.id,
            },
        });

        return NextResponse.json(template);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
    }
}
