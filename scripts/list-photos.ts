import prisma from '../lib/prisma';

async function main() {
    const photos = await prisma.photo.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, watermarkedKey: true, createdAt: true }
    });
    console.log(JSON.stringify(photos, null, 2));
}

main();
