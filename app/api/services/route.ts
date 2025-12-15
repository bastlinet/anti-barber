import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const branchId = searchParams.get('branchId');

  try {
    const whereClause = {
      active: true,
      ...(branchId
        ? {
            branches: {
              some: {
                branchId: branchId,
                active: true,
              },
            },
          }
        : {}),
    };

    const services = await prisma.service.findMany({
      where: whereClause,
      include: {
        branches: branchId
          ? {
              where: { branchId },
              select: { priceCents: true },
            }
          : false,
      },
    });

    return NextResponse.json(services);
  } catch (error) {
    console.error('Error fetching services:', error);
    return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 });
  }
}
