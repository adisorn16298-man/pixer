import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
    const user = await prisma.user.findFirst();
    return NextResponse.json(user);
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const {
            name, brandName, brandLogoUrl, watermarkUrl, frameUrl,
            watermarkPortraitUrl, framePortraitUrl,
            whiteLabel, footerText, jpegQuality, thumbQuality
        } = body;

        const user = await prisma.user.findFirst();

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: {
                name, brandName, brandLogoUrl, watermarkUrl, frameUrl,
                watermarkPortraitUrl, framePortraitUrl,
                whiteLabel, footerText, jpegQuality, thumbQuality
            },
        });

        return NextResponse.json(updatedUser);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }
}
