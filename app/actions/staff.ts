'use server'

import { PrismaClient } from '@prisma/client'
import { createStaffSchema, createShiftSchema } from '@/lib/zod'
import { revalidatePath } from 'next/cache'

const prisma = new PrismaClient()

export async function getStaff(branchId: string) {
  return await prisma.staff.findMany({
    where: { branchId },
    include: {
      services: true,
    },
    orderBy: { name: 'asc' }
  })
}

export async function createStaff(data: unknown) {
  const result = createStaffSchema.safeParse(data)
  
  if (!result.success) {
    return { error: result.error.flatten() }
  }

  try {
    const staff = await prisma.staff.create({
      data: {
        branchId: result.data.branchId,
        name: result.data.name,
        email: result.data.email || null,
        phone: result.data.phone || null,
        active: result.data.active,
        avatarUrl: result.data.avatarUrl || null,
      }
    })
    
    revalidatePath('/admin/staff')
    return { success: true, staff }
  } catch (error) {
    console.error('Failed to create staff:', error)
    return { error: 'Failed to create staff' }
  }
}

export async function createShift(data: unknown) {
  const result = createShiftSchema.safeParse(data)

  if (!result.success) {
      return { error: result.error.flatten() }
  }

  try {
      const shift = await prisma.shift.create({
          data: {
              staffId: result.data.staffId,
              branchId: result.data.branchId,
              startAt: result.data.startAt,
              endAt: result.data.endAt
          }
      })
      return { success: true, shift }
  } catch (error) {
      console.error('Failed to create shift:', error)
      return { error: 'Failed to create shift' }
  }
}
