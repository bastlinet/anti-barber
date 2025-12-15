/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createStaff, createShift } from './staff'
import { prisma } from '@/lib/prisma'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    staff: { create: vi.fn(), findMany: vi.fn() },
    shift: { create: vi.fn() },
  },
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

describe('Server Actions: Staff', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('createStaff should create staff on valid input', async () => {
    const validData = {
      branchId: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Alice',
      email: 'alice@example.com',
      active: true,
    }

    vi.mocked(prisma.staff.create).mockResolvedValue({
      id: 'staff-1',
      ...validData,
      phone: null,
      avatarUrl: null
    } as any)

    const result = await createStaff(validData)
    expect(result).toHaveProperty('success', true)
    expect(result.staff?.name).toBe('Alice')
    expect(prisma.staff.create).toHaveBeenCalled()
  })

  it('createStaff should return error on invalid input', async () => {
    const invalidData = {
      branchId: 'short-id', // Invalid UUID
      name: 'A', // Too short
    }
    const result = await createStaff(invalidData)
    expect(result).toHaveProperty('error')
    expect(prisma.staff.create).not.toHaveBeenCalled()
  })

  it('createShift should create shift on valid input', async () => {
    const validData = {
      staffId: '123e4567-e89b-12d3-a456-426614174000',
      branchId: '123e4567-e89b-12d3-a456-426614174001',
      startAt: '2024-01-01T09:00:00.000Z',
      endAt: '2024-01-01T17:00:00.000Z',
    }
    
    vi.mocked(prisma.shift.create).mockResolvedValue({
        id: 'shift-1',
        ...validData,
        startAt: new Date(validData.startAt),
        endAt: new Date(validData.endAt)
    } as any)

    const result = await createShift(validData)
    expect(result).toHaveProperty('success', true)
    expect(prisma.shift.create).toHaveBeenCalled()
  })
})
