import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const QUOTA_GB = 10;
const QUOTA_BYTES = QUOTA_GB * 1024 * 1024 * 1024;

export async function GET() {
    try {
        const stats = await prisma.photo.aggregate({
            _sum: {
                fileSize: true
            },
            _count: {
                id: true
            }
        });

        const usedBytes = stats._sum.fileSize || 0;
        const photoCount = stats._count.id || 0;

        return NextResponse.json({
            usedBytes,
            totalBytes: QUOTA_BYTES,
            percentage: Math.min(100, (usedBytes / QUOTA_BYTES) * 100),
            photoCount,
            quotaGb: QUOTA_GB
        });
    } catch (error) {
        console.error('Storage Stats API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch storage stats' }, { status: 500 });
    }
}
