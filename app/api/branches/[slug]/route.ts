import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    const branch = await prisma.branch.findUnique({
      where: { slug },
      include: {
        services: {
          include: {
            service: true
          }
        }
      }
    });

    if (!branch) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
    }

    return NextResponse.json(branch);
  } catch (error) {
    console.error('Error fetching branch:', error);
    return NextResponse.json({ error: 'Failed to fetch branch' }, { status: 500 });
  }
}
