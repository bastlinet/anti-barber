import { prisma } from "./prisma";
import { addMinutes, areIntervalsOverlapping, isBefore } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

// Types
export interface AvailabilityQuery {
  branchId: string;
  serviceId: string;
  date: string; // YYYY-MM-DD
  staffId?: string; // Optional: specific staff member
}

export interface TimeSlot {
  start: string; // ISO string (UTC)
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
  const timezone = branch.timezone;

  // 2. Define the range for the requested day in BRANCH timezone
  // The input `date` is "YYYY-MM-DD" e.g. "2024-01-02"
  // We identify 00:00:00 and 23:59:59 in the Branch's timezone, then convert to UTC.
  
  // NOTE: fromZonedTime takes a date string/object and treats it as being in the target timezone, returns UTC Date.
  const queryDateStartUtc = fromZonedTime(`${date} 00:00:00`, timezone);
  // We want to cover the full day.
  // Actually simpler: iterate steps starting from queryDateStartUtc until ...
  const queryDateEndUtc = fromZonedTime(`${date} 23:59:59.999`, timezone);

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

  const staffIds = staffCandidates.map((s: { id: string }) => s.id);
  if (staffIds.length === 0) return [];

  // 4. Fetch Database Records (Shifts, etc)
  // We fetch anything that overlaps with our [queryDateStartUtc, queryDateEndUtc]
  // BUT shifts might start slightly before/after. 
  // We are looking for slots that START within this day.
  // A slot starting at 23:30 is valid. It ends tomorrow.
  // We need to check availability for the duration of that slot.
  // So we need shifts covering [queryDateStartUtc, queryDateEndUtc + duration]
  // Let's broaden the fetch window slightly.
  
  const fetchStart = queryDateStartUtc; 
  const fetchEnd = addMinutes(queryDateEndUtc, durationMin); // to cover the last slot's duration

  const shifts = await prisma.shift.findMany({
    where: {
      staffId: { in: staffIds },
      // Shift overlaps with fetch window
      startAt: { lt: fetchEnd },
      endAt: { gt: fetchStart },
    },
  });

  const breaks = await prisma.break.findMany({
    where: {
      staffId: { in: staffIds },
      startAt: { lt: fetchEnd },
      endAt: { gt: fetchStart },
    },
  });

  const timeOffs = await prisma.timeOff.findMany({
    where: {
      staffId: { in: staffIds },
      approved: true,
      startAt: { lt: fetchEnd },
      endAt: { gt: fetchStart },
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
      startAt: { lt: fetchEnd },
      endAt: { gt: fetchStart },
    },
  });

  // Check Holds
  // We only care about active holds.
  const now = new Date();
  const holds = await prisma.bookingHold.findMany({
    where: {
      staffId: { in: staffIds },
      expiresAt: { gt: now }, // still valid
      startAt: { lt: fetchEnd },
      endAt: { gt: fetchStart },
    },
  });

  // 5. Generate potential slots
  // We start at 00:00 branch time (queryDateStartUtc)
  // We increment by slotStepMin
  // We stop when start >= queryDateEndUtc (or slightly before, if we strictly want start to be in the day)
  // Assuming we want all start times that belong to this calendar date.
  
  const availableSlots: TimeSlot[] = [];
  let currentCursor = queryDateStartUtc;

  // We loop until we pass the end of the "day" in branch time.
  // Comparison should be done on timestamps or strict equality logic.
  while (currentCursor <= queryDateEndUtc) { // allow 23:59 start? hardly, but sticking to logic.
    // However, usually we stop if slotStart + duration > queryDateEnd? 
    // Usually reservation systems allow booking 23:30 even if it ends 00:30 tomorrow.
    // So currentCursor < addMinutes(queryDateEndUtc, 1) is fine.
    
    // Correction: `queryDateEndUtc` is 23:59:59.999.
    // If currentCursor is 23:30 (and step 30), it fits.
    // If currentCursor becomes 00:00 (next day), we stop.
    
    // Safety check just in case infinite loop
    if (currentCursor.getTime() > queryDateEndUtc.getTime()) break;

    const slotStart = currentCursor;
    const slotEnd = addMinutes(slotStart, durationMin);

    // Business rule: buffer (cannot book 30min from now)
    if (addMinutes(now, bufferMin) > slotStart) {
        currentCursor = addMinutes(currentCursor, slotStepMin);
        continue;
    }

    // Check availability
    const freeStaff = staffIds.find((sId: string) => {
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
