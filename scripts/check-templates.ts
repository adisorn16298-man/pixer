import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const events = await prisma.event.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { template: true }
    });

    console.log('--- LATEST EVENTS ---');
    events.forEach(e => {
        console.log(`Event: ${e.name} (Hash: ${e.shortHash})`);
        console.log(`- Template: ${e.template?.name || 'NONE'}`);
        console.log(`- Watermark: ${e.template?.watermarkUrl || 'N/A'}`);
        console.log(`- Frame: ${e.template?.frameUrl || 'N/A'}`);
        console.log('-------------------');
    });

    const users = await prisma.user.findMany();
    console.log('--- USERS ---');
    users.forEach(u => {
        console.log(`User: ${u.name} (${u.email})`);
        console.log(`- Base Watermark: ${u.watermarkUrl || 'N/A'}`);
        console.log(`- Base Frame: ${u.frameUrl || 'N/A'}`);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
