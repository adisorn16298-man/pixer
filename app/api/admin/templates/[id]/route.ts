import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    const template = await prisma.brandingTemplate.findUnique({
        where: { id: params.id }
    });
    return NextResponse.json(template);
}

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();
        const { name, frameUrl, watermarkUrl, framePortraitUrl, watermarkPortraitUrl } = body;

        const template = await prisma.brandingTemplate.update({
            where: { id: params.id },
            data: {
                name,
                frameUrl,
                watermarkUrl,
                framePortraitUrl,
                watermarkPortraitUrl
            },
        });

        return NextResponse.json(template);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        await prisma.brandingTemplate.delete({
            where: { id: params.id }
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
    }
}
