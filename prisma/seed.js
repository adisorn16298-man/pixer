const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Seeding demo data...');

    // 1. Create Photographer
    const user = await prisma.user.upsert({
        where: { email: 'demo@pixer.test' },
        update: {},
        create: {
            email: 'demo@pixer.test',
            name: 'John Photographer',
            brandName: 'INFINITY VISUALS',
            brandLogoUrl: '/watermark.png',
        },
    });

    // 2. Create Event with shortHash
    const event = await prisma.event.upsert({
        where: { slug: 'wedding-night-2026' },
        update: {},
        create: {
            name: 'Wedding Night 2026',
            slug: 'wedding-night-2026',
            shortHash: 'xyz123', // Hardcoded for demo: /g/xyz123
            date: new Date('2026-06-15'),
            photographerId: user.id,
        },
    });

    // 3. Create Moments
    const m1 = await prisma.moment.create({
        data: { name: 'Morning Ceremony', eventId: event.id }
    });
    const m2 = await prisma.moment.create({
        data: { name: 'Party Night', eventId: event.id }
    });

    // 4. Create Mock Photos
    const mockConfigs = [
        { momentId: m1.id, url: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=80' },
        { momentId: m1.id, url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80' },
        { momentId: m2.id, url: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=80' },
        { momentId: m2.id, url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&q=80' },
    ];

    for (const config of mockConfigs) {
        await prisma.photo.create({
            data: {
                eventId: event.id,
                momentId: config.momentId,
                thumbnailKey: 'watermark.png', // Pointing to local existing assets for immediate preview
                watermarkedKey: 'watermark.png',
                originalKey: 'watermark.png',
                width: 800,
                height: 600,
                mimeType: 'image/jpeg'
            }
        });
    }

    console.log('Seeding complete! Access your gallery at: http://localhost:3000/g/xyz123');
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
