import { prisma } from "./prisma";
import { addMinutes, areIntervalsOverlapping, format, isBefore, isSameDay, parseISO, startOfDay, endOfDay, setHours, setMinutes } from "date-fns";

// Types
export interface AvailabilityQuery {
  branchId: string;
  serviceId: string;
  date: string; // YYYY-MM-DD
  staffId?: string; // Optional: specific staff member
}

export interface TimeSlot {
  start: string; // ISO string
  staffId?: string; // The staff member available for this slot (if relevant)
}

/**
 * Main function to get available slots.
 */
export async function listAvailableSlots({
  branchId,
  serviceId,
  date,
  staffId,
}: AvailabilityQuery): Promise<TimeSlot[]> {
  // 1. Get configuration and service duration
  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
  });
  if (!branch) throw new Error("Branch not found");

  const service = await prisma.service.findUnique({
    where: { id: serviceId },
  });
  if (!service) throw new Error("Service not found");

  const durationMin = service.durationMin;
  const slotStepMin = branch.slotStepMin;
  const bufferMin = branch.bookingBufferMin; // Minimum time from NOW
  
  // 2. Define the range for the requested day (UTC)
  // Incoming date is "YYYY-MM-DD". We assume this is in the branch's timezone?
  // Note: For MVP, let's assume the query date is the local date of the branch.
  // We need to fetch everything that OVERLAPS with this day in UTC.
  // Simple approach: fetched range = [start of day - 12h, end of day + 12h] to cover safe margins for all TZs.
  // Better approach specifically: We need to know the bounds of "YYYY-MM-DD" in the Branch's Timezone.
  // BUT the database stores specific UTC start/end for shifts.
  
  // Let's assume input date is the target DAY.
  // We want to return slots starting on that day.
  // We need to fetch shifts that cover that day.
  
  const queryDateStart = startOfDay(parseISO(date)); // 00:00 local time (system time? No, we should be careful about hydration)
  const queryDateEnd = endOfDay(parseISO(date));

  // 3. Fetch Staff candidates
  // If staffId provided, check if valid and works at branch.
  // Else, get all staff at branch who perform this service.
  const staffCandidates = await prisma.staff.findMany({
    where: {
      branchId,
      id: staffId, // if undefined, unused
      active: true,
      services: {
        some: {
          serviceId: serviceId,
          active: true,
        },
      },
    },
    select: { id: true },
  });

  const staffIds = staffCandidates.map((s) => s.id);
  if (staffIds.length === 0) return [];

  // 4. Fetch Shifts, Breaks, TimeOff, Bookings for these staff members
  // We fetch a bit wider range to be safe (e.g. shifts starting previous day and spilling over).
  // Actually, shifts are stored as absolute UTC.
  // We want slots that START between queryDateStart and queryDateEnd (in UTC? No in Branch Time?).
  // Let's stick to UTC for calculations. 
  // We'll iterate through possible start times in the day and check availability.
  
  // Fetching data covering the day:
  const dayStartUtc = queryDateStart; // simplistic, assumes server local time matches desired logic or we handle TZ elsewhere
  const dayEndUtc = queryDateEnd;

  // We need shifts that overlap with our target day
  // To keep it robust, let's fetch shifts where startAt < dayEndUtc AND endAt > dayStartUtc
  const shifts = await prisma.shift.findMany({
    where: {
      staffId: { in: staffIds },
      startAt: { lt: dayEndUtc },
      endAt: { gt: dayStartUtc },
    },
  });

  const breaks = await prisma.break.findMany({
    where: {
      staffId: { in: staffIds },
      startAt: { lt: dayEndUtc },
      endAt: { gt: dayStartUtc },
    },
  });

  const timeOffs = await prisma.timeOff.findMany({
    where: {
      staffId: { in: staffIds },
      approved: true,
      startAt: { lt: dayEndUtc },
      endAt: { gt: dayStartUtc },
    },
  });

  // Bookings: Confirmed or Hold/Pending (that are not expired)
  // We need to exclude CANCELLED, REJECTED etc. 
  // Status: HOLD, CONFIRMED, COMPLETED, NO_SHOW count as busy. 
  // CANCELLED doesn't.
  // Also check holds in BookingHold
  
  const busyStatuses = ["HOLD", "CONFIRMED", "COMPLETED", "NO_SHOW"];
  
  const bookings = await prisma.booking.findMany({
    where: {
      staffId: { in: staffIds },
      status: { in: busyStatuses as any }, 
      startAt: { lt: dayEndUtc },
      endAt: { gt: dayStartUtc },
    },
  });

  // Check Holds
  // We only care about active holds.
  const now = new Date();
  const holds = await prisma.bookingHold.findMany({
    where: {
      staffId: { in: staffIds },
      expiresAt: { gt: now }, // still valid
      startAt: { lt: dayEndUtc },
      endAt: { gt: dayStartUtc },
    },
  });

  // 5. Generate potential slots
  // We step through the day in slotStepMin intervals.
  // For each step, we define a proposed slot [t, t + durationMin].
  // We check if ANY staff member is available for this WHOLE interval.
  
  // However, shifts define when they CAN work.
  // We should iterate through SHIFTS instead of the generic day, to miss empty times?
  // Or just grid the day? Gridding the day is safer for "list all slots".
  
  // But wait, if we grid 00:00 to 23:59, we might produce A LOT of slots.
  // Usually we only care about times within shifts.
  // Optimization: Collect all unique start/end times of shifts, and only scan inside those ranges?
  // Simpler: iterate from earliest Shift Start to latest Shift End of the day?
  
  if (shifts.length === 0) return [];

  // Find overall min/max bounds from shifts (clamped to the requested day)
  let minStart = dayEndUtc.getTime();
  let maxEnd = dayStartUtc.getTime();

  for (const s of shifts) {
    if (s.startAt.getTime() < minStart) minStart = s.startAt.getTime();
    if (s.endAt.getTime() > maxEnd) maxEnd = s.endAt.getTime();
  }
  
  // Clamp to day boundaries if needed, but usually we just want to follow shifts.
  // If a shift started yesterday 22:00 and ends today 06:00, we show slots until 06:00.
  // Ideally we filter slots that START on the requested `date`.
  
  const availableSlots: TimeSlot[] = [];

  // Create grid
  // We align to slotStepMin (e.g. 00:00, 00:30, 01:00...)
  // We'll start from the beginning of the day (00:00) until end (23:59)
  // and checks validity.
  
  // Helper to round date to step
  // But actually, we should respect the Shift start?
  // Usually reservation systems have fixed grid (e.g. on the hour/half-hour).
  
  let currentCursor = queryDateStart;
  const END_LIMIT = queryDateEnd;

  while (currentCursor < END_LIMIT) {
    const slotStart = currentCursor;
    const slotEnd = addMinutes(slotStart, durationMin);

    // Business rule: buffer (cannot book 30min from now)
    if (addMinutes(now, bufferMin) > slotStart) {
        currentCursor = addMinutes(currentCursor, slotStepMin);
        continue;
    }

    // Check if ANY staff is free
    const freeStaff = staffIds.find(sId => {
      return isStaffFree(sId, slotStart, slotEnd, shifts, breaks, timeOffs, bookings, holds);
    });

    if (freeStaff) {
      availableSlots.push({
        start: slotStart.toISOString(),
        staffId: freeStaff,
      });
    }

    currentCursor = addMinutes(currentCursor, slotStepMin);
  }

  return availableSlots;
}

function isStaffFree(
  staffId: string,
  start: Date,
  end: Date,
  shifts: any[],
  breaks: any[],
  timeOffs: any[],
  bookings: any[],
  holds: any[]
): boolean {
  // 1. Must be covered by at least one Shift
  // (Assuming shifts don't overlap for the same person, or if they do, we just need to be inside UNION of shifts. 
  // Usually shifts are disjoint. Let's find ONE shift that fully covers [start, end].)
  const coveringShift = shifts.find(s => 
    s.staffId === staffId && 
    s.startAt <= start && 
    s.endAt >= end
  );
  if (!coveringShift) return false;

  // 2. Must NOT overlap with any Break
  const hitBreak = breaks.some(b => 
    b.staffId === staffId && 
    areIntervalsOverlapping({ start, end }, { start: b.startAt, end: b.endAt })
  );
  if (hitBreak) return false;

  // 3. Must NOT overlap with TimeOff
  const hitTimeOff = timeOffs.some(t => 
    t.staffId === staffId && 
    areIntervalsOverlapping({ start, end }, { start: t.startAt, end: t.endAt })
  );
  if (hitTimeOff) return false;

  // 4. Must NOT overlap with Booking
  const hitBooking = bookings.some(b => 
    b.staffId === staffId && 
    areIntervalsOverlapping({ start, end }, { start: b.startAt, end: b.endAt })
  );
  if (hitBooking) return false;

  // 5. Must NOT overlap with Hold
  const hitHold = holds.some(h => 
    h.staffId === staffId && 
    areIntervalsOverlapping({ start, end }, { start: h.startAt, end: h.endAt })
  );
  if (hitHold) return false;

  return true;
}
