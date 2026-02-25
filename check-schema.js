const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const user = await prisma.user.findFirst();
        console.log('User keys:', Object.keys(user));
    } catch (err) {
        console.error('Error fetching user:', err);
    } finally {
        await prisma.$disconnect();
    }
}

check();
