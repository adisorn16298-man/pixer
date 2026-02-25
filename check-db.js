const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const users = await prisma.user.findMany();
    const events = await prisma.event.findMany({ include: { _count: true } });
    const photos = await prisma.photo.findMany();

    console.log('--- USERS ---');
    console.log(users);
    console.log('--- EVENTS ---');
    console.log(events);
    console.log('--- PHOTOS ---');
    console.log(photos.length);
}

check();
