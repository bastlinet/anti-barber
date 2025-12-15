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
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01T08:00:00Z')) // Set "now"
  })

  it('should return slots correctly for Europe/Prague timezone', async () => {
    // Arrange
    const date = '2024-01-02'; // Querying for Jan 2nd
    // Branch in Prague (UTC+1 in winter)
    // 10:00 local = 09:00 UTC
    // 14:00 local = 13:00 UTC
    
    // Mocks
    vi.mocked(prisma.branch.findUnique).mockResolvedValue({
      id: 'branch-cz',
      slotStepMin: 60,
      bookingBufferMin: 0,
      timezone: 'Europe/Prague',
    } as any)

    vi.mocked(prisma.service.findUnique).mockResolvedValue({
      id: 'service-1',
      durationMin: 60,
    } as any)

    vi.mocked(prisma.staff.findMany).mockResolvedValue([
      { id: 'staff-1' }
    ] as any)

    // Shift: 10:00 - 14:00 (Local Prague)
    // In UTC (Jan 2): 09:00 - 13:00
    vi.mocked(prisma.shift.findMany).mockResolvedValue([
      {
        staffId: 'staff-1',
        startAt: new Date('2024-01-02T09:00:00Z'), // 10:00 Prague
        endAt: new Date('2024-01-02T13:00:00Z'),   // 14:00 Prague
      }
    ] as any)

    // No conflicts
    vi.mocked(prisma.break.findMany).mockResolvedValue([])
    vi.mocked(prisma.timeOff.findMany).mockResolvedValue([])
    vi.mocked(prisma.booking.findMany).mockResolvedValue([])
    vi.mocked(prisma.bookingHold.findMany).mockResolvedValue([])

    // Act
    const slots = await listAvailableSlots({
      branchId: 'branch-cz',
      serviceId: 'service-1',
      date,
    })

    // Assert
    // Shift is 4 hours long: 10-14 local.
    // Slots (60m): 10:00-11:00, 11:00-12:00, 12:00-13:00, 13:00-14:00.
    // In UTC: 09:00, 10:00, 11:00, 12:00.
    
    expect(slots).toHaveLength(4)
    const startTimes = slots.map(s => s.start)
    expect(startTimes).toContain('2024-01-02T09:00:00.000Z')
    expect(startTimes).toContain('2024-01-02T12:00:00.000Z')
  })

  it('should filter out bookings', async () => {
    const date = '2024-01-02';
    
    vi.mocked(prisma.branch.findUnique).mockResolvedValue({
      id: 'branch-cz',
      slotStepMin: 60,
      bookingBufferMin: 0,
      timezone: 'Europe/Prague',
    } as any)

    vi.mocked(prisma.service.findUnique).mockResolvedValue({
      id: 'service-1',
      durationMin: 60,
    } as any)

    vi.mocked(prisma.staff.findMany).mockResolvedValue([
      { id: 'staff-1' }
    ] as any)

    // Shift: 10:00 - 14:00 Local (09:00 - 13:00 UTC)
    vi.mocked(prisma.shift.findMany).mockResolvedValue([
      {
        staffId: 'staff-1',
        startAt: new Date('2024-01-02T09:00:00Z'),
        endAt: new Date('2024-01-02T13:00:00Z'),
      }
    ] as any)

    // Booking: 11:00 - 12:00 Local (10:00 - 11:00 UTC)
    vi.mocked(prisma.booking.findMany).mockResolvedValue([
      {
        staffId: 'staff-1',
        startAt: new Date('2024-01-02T10:00:00Z'),
        endAt: new Date('2024-01-02T11:00:00Z'),
      }
    ] as any)
    
    vi.mocked(prisma.break.findMany).mockResolvedValue([])
    vi.mocked(prisma.timeOff.findMany).mockResolvedValue([])
    vi.mocked(prisma.bookingHold.findMany).mockResolvedValue([])

    const slots = await listAvailableSlots({
      branchId: 'branch-cz',
      serviceId: 'service-1',
      date,
    })

    // Expected: 10:00, [11:00 occupied], 12:00, 13:00
    // UTC: 09:00, 11:00, 12:00
    // Wait, the shift ends at 14:00 local (13:00 UTC).
    // Slots: 10-11, 11-12, 12-13, 13-14.
    // Occupied: 11-12.
    // Remaining: 10-11, 12-13, 13-14.
    // UTC Starts: 09:00, 11:00, 12:00.
    
    expect(slots).toHaveLength(3)
    expect(slots.map(s => s.start)).toContain('2024-01-02T09:00:00.000Z')
    expect(slots.map(s => s.start)).not.toContain('2024-01-02T10:00:00.000Z') // 11:00 local occupied
    expect(slots.map(s => s.start)).toContain('2024-01-02T11:00:00.000Z')
  })
})
