import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> } // slug here acts as branchId
) {
  const { slug } = await params;
  const branchId = slug;

  try {
    const branchServices = await prisma.branchService.findMany({
      where: { 
        branchId,
        active: true 
      },
      include: { 
        service: true 
      }
    });

    const services = branchServices.map(bs => ({
      id: bs.service.id,
      name: bs.service.name,
      durationMin: bs.service.durationMin,
      category: bs.service.category,
      priceCents: bs.priceCents
    }));

    return NextResponse.json(services);
  } catch (error) {
    console.error('Error fetching services for branch:', error);
    return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 });
  }
}
