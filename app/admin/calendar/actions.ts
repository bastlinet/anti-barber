"use server";

import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, parseISO } from "date-fns";

export async function getCalendarData(dateStr: string) {
  const date = parseISO(dateStr);
  const start = startOfDay(date);
  const end = endOfDay(date);

  // 1. Fetch ALL active staff (columns)
  const staff = await prisma.staff.findMany({
    where: { active: true },
    include: {
      shifts: {
        where: {
          startAt: { lt: end },
          endAt: { gt: start },
        }
      }
    }
  });

  // 2. Fetch Bookings for this day
  const bookings = await prisma.booking.findMany({
    where: {
      startAt: { lt: end },
      endAt: { gt: start },
      status: { not: 'CANCELLED' } 
    },
    include: {
        service: true,
    }
  });
  
  // Note: customerName is a string field in Booking model, not a relation.
  // We don't need include { customerName: true } for scalars.

  // Serialize dates to strings to avoid "Date objects being passed to parseISO" issues
  const safeStaff = staff.map(s => ({
    ...s,
    shifts: s.shifts.map(shift => ({
        ...shift,
        startAt: shift.startAt.toISOString(),
        endAt: shift.endAt.toISOString()
    }))
  }));

  const safeBookings = bookings.map(b => ({
      ...b,
      startAt: b.startAt.toISOString(),
      endAt: b.endAt.toISOString()
  }));

  return {
    staff: safeStaff,
    bookings: safeBookings,
  };
}
