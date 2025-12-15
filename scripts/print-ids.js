
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const branch = await prisma.branch.findFirst();
    const service = await prisma.service.findFirst();
    const staff = await prisma.staff.findFirst();

    console.log(`Branch ID: ${branch?.id}`);
    console.log(`Service ID: ${service?.id}`);
    console.log(`Staff ID: ${staff?.id}`);
    console.log(`Date: ${new Date().toISOString().split('T')[0]}`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
