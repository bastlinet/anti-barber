import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listAvailableSlots } from './availability'
import { prisma } from './prisma'
import { addHours, parseISO } from 'date-fns'

// Mock prisma
vi.mock('./prisma', () => ({
  prisma: {
    branch: { findUnique: vi.fn() },
    service: { findUnique: vi.fn() },
    staff: { findMany: vi.fn() },
    shift: { findMany: vi.fn() },
    break: { findMany: vi.fn() },
    timeOff: { findMany: vi.fn() },
    booking: { findMany: vi.fn() },
    bookingHold: { findMany: vi.fn() },
  }
}))

describe('listAvailableSlots', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('should return slots for a simple shift', async () => {
    // Arrange
    const date = '2026-01-01';
    const startStr = '2026-01-01T10:00:00Z';
    const endStr = '2026-01-01T14:00:00Z';
    
    // Mocks
    vi.mocked(prisma.branch.findUnique).mockResolvedValue({
      id: 'branch-1',
      slotStepMin: 60,
      bookingBufferMin: 0,
      timezone: 'UTC',
    } as any)

    vi.mocked(prisma.service.findUnique).mockResolvedValue({
      id: 'service-1',
      durationMin: 60,
    } as any)

    vi.mocked(prisma.staff.findMany).mockResolvedValue([
      { id: 'staff-1' }
    ] as any)

    // Shift from 10:00 to 14:00
    vi.mocked(prisma.shift.findMany).mockResolvedValue([
      {
        staffId: 'staff-1',
        startAt: new Date(startStr),
        endAt: new Date(endStr),
      }
    ] as any)

    vi.mocked(prisma.break.findMany).mockResolvedValue([])
    vi.mocked(prisma.timeOff.findMany).mockResolvedValue([])
    vi.mocked(prisma.booking.findMany).mockResolvedValue([])
    vi.mocked(prisma.bookingHold.findMany).mockResolvedValue([])

    // Act
    const slots = await listAvailableSlots({
      branchId: 'branch-1',
      serviceId: 'service-1',
      date,
    })

    // Assert
    // Expect 10:00, 11:00, 12:00, 13:00. (14:00 is end, so last slot is 13:00-14:00)
    expect(slots).toHaveLength(4)
    expect(slots[0].start).toContain('T10:00:00')
    expect(slots[3].start).toContain('T13:00:00')
  })

  it('should subtract bookings', async () => {
    const date = '2026-01-01';
    const startStr = '2026-01-01T10:00:00Z';
    const endStr = '2026-01-01T14:00:00Z';
    
    vi.mocked(prisma.branch.findUnique).mockResolvedValue({
        id: 'branch-1',
        slotStepMin: 60,
        bookingBufferMin: 0,
        timezone: 'UTC',
      } as any)
  
      vi.mocked(prisma.service.findUnique).mockResolvedValue({
        id: 'service-1',
        durationMin: 60,
      } as any)
  
      vi.mocked(prisma.staff.findMany).mockResolvedValue([
        { id: 'staff-1' }
      ] as any)
  
      // Shift from 10:00 to 14:00
      vi.mocked(prisma.shift.findMany).mockResolvedValue([
        {
          staffId: 'staff-1',
          startAt: new Date(startStr),
          endAt: new Date(endStr),
        }
      ] as any)

    // Booking at 11:00-12:00
    vi.mocked(prisma.booking.findMany).mockResolvedValue([
      {
        staffId: 'staff-1',
        startAt: new Date('2026-01-01T11:00:00Z'),
        endAt: new Date('2026-01-01T12:00:00Z'),
      }
    ] as any)

    vi.mocked(prisma.break.findMany).mockResolvedValue([])
    vi.mocked(prisma.timeOff.findMany).mockResolvedValue([])
    vi.mocked(prisma.bookingHold.findMany).mockResolvedValue([])

    const slots = await listAvailableSlots({
      branchId: 'branch-1',
      serviceId: 'service-1',
      date,
    })

    // Expect 10:00, 12:00, 13:00 (11:00 is booked)
    expect(slots).toHaveLength(3)
    const times = slots.map(s => parseISO(s.start).toISOString())
    
    expect(times).toContain(new Date('2026-01-01T10:00:00Z').toISOString())
    expect(times).not.toContain(new Date('2026-01-01T11:00:00Z').toISOString())
    expect(times).toContain(new Date('2026-01-01T12:00:00Z').toISOString())
  })
})
