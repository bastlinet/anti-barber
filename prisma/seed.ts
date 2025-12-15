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
    await prisma.service.create({
        data: {
            name: s.name,
            category: s.category,
            durationMin: s.durationMin,
            description: s.description,
            active: true
        }
    })
  }

  // Link services to branch
  const services = await prisma.service.findMany();
  for (const s of services) {
    const price = serviceData.find(d => d.name === s.name)?.priceCents || 0;
    await prisma.branchService.create({
        data: {
            branchId: branch.id,
            serviceId: s.id,
            priceCents: price,
            active: true
        }
    }).catch(() => {}) // Ignore if exists
  }


  // Create Staff: "Ondra - Senior Barber"
  const staff = await prisma.staff.create({
    data: {
      branchId: branch.id,
      name: 'Ondra',
      active: true,
      services: {
        create: services.map(s => ({
            serviceId: s.id,
            active: true
        }))
      },
      shifts: {
        create: [
            {
                branchId: branch.id,
                startAt: new Date(new Date().setUTCHours(8, 0, 0, 0)).toISOString(), // Today 8:00 UTC
                endAt: new Date(new Date().setUTCHours(16, 0, 0, 0)).toISOString()   // Today 16:00 UTC
            }
        ]
      }
    }
  })

  console.log(`Created staff: ${staff.name}`)
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
