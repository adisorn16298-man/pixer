import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();
        const { name } = body;

        const moment = await prisma.moment.update({
            where: { id: params.id },
            data: { name },
        });

        return NextResponse.json(moment);
    } catch (error) {
        console.error('PATCH Moment Error:', error);
        return NextResponse.json({ error: 'Failed to update moment' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        // We don't delete photos, we just unassign them from this moment
        await prisma.photo.updateMany({
            where: { momentId: params.id },
            data: { momentId: null }
        });

        await prisma.moment.delete({
            where: { id: params.id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('DELETE Moment Error:', error);
        return NextResponse.json({ error: 'Failed to delete moment' }, { status: 500 });
    }
}
