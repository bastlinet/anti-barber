import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Start seeding ...')

  // Create Branch: "Antigravity Barber - Centrum"
  const branch = await prisma.branch.upsert({
    where: { slug: 'centrum' },
    update: {},
    create: {
      name: 'Antigravity Barber - Centrum',
      slug: 'centrum',
      address: 'Vodičkova 12',
      city: 'Praha 1',
      phone: '+420 123 456 789',
      email: 'centrum@antigravity.cz',
      timezone: 'Europe/Prague',
    },
  })

  // Create Services
  const serviceData = [
    {
      name: 'Pánský střih',
      category: 'Vlasy',
      durationMin: 30,
      description: 'Klasický střih nůžkami a strojkem.',
      priceCents: 60000, 
    },
    {
      name: 'Úprava vousů',
      category: 'Vousy',
      durationMin: 30,
      description: 'Zarovnání, břitva, hot towel.',
      priceCents: 45000,
    },
    {
      name: 'Komplet (Vlasy + Vousy)',
      category: 'Komplet',
      durationMin: 60,
      description: 'Kompletní péče.',
      priceCents: 95000, // Discounted
    },
  ]

  for (const s of serviceData) {
    const service = await prisma.service.create({
      data: {
        name: s.name,
        category: s.category,
        durationMin: s.durationMin,
        description: s.description,
        branches: {
          create: {
            branchId: branch.id,
            priceCents: s.priceCents,
          },
        },
      },
    })
    console.log(`Created service with id: ${service.id}`)
  }

  console.log('Seeding finished.')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
