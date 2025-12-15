import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createHoldSchema } from "@/lib/validators/booking";
import { addMinutes, parseISO } from "date-fns";
import { listAvailableSlots } from "@/lib/availability";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = createHoldSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid request", details: result.error.format() },
        { status: 400 }
      );
    }

    const { branchId, serviceId, staffId, startAt, date } = result.data;
    const holdDurationMinutes = 10;
    const startAtDate = parseISO(startAt);

    // 1. Re-check availability strictly for this specific slot
    // We can reuse listAvailableSlots but filter for the specific time.
    // Or we can write a dedicated check function. Reusing is safer for consistency.
    
    // We get ALL slots for that day/staff/service
    const slots = await listAvailableSlots({
        branchId,
        serviceId,
        staffId,
        date
    });

    // Check if the requested startAt is in the list
    const isAvailable = slots.some(s => s.start === startAt);

    if (!isAvailable) {
        return NextResponse.json(
            { error: "Slot is no longer available" },
            { status: 409 } // Conflict
        );
    }

    // 2. Create Hold in Transaction
    // We need to fetch service duration to calculate endAt
    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) throw new Error("Service not found"); // Should be caught by listAvailableSlots but double check

    const endAtDate = addMinutes(startAtDate, service.durationMin);
    const expiresAt = addMinutes(new Date(), holdDurationMinutes);

    // Use transaction to ensure we don't double book if called in parallel
    // Although listAvailableSlots checks DB, a race condition exists between check and write.
    // Ideally we lock or use a conditional insert.
    // Prisma doesn't support "INSERT IF NOT EXISTS" elegantly without raw SQL or constraints.
    // But since we checked availability (which checks overlaps), we are mostly fine.
    // To be perfectly safe, we should check for overlaps INSIDE the transaction.
    
    const hold = await prisma.$transaction(async (tx) => {
        // Double check inside transaction for robustness
        const conflictingHold = await tx.bookingHold.findFirst({
            where: {
                staffId,
                expiresAt: { gt: new Date() }, // Active hold
                OR: [
                    { startAt: { lt: endAtDate }, endAt: { gt: startAtDate } } // Overlap
                ]
            }
        });

        const conflictingBooking = await tx.booking.findFirst({
            where: {
                staffId,
                status: { in: ['CONFIRMED', 'HOLD'] }, // Active statuses
                startAt: { lt: endAtDate },
                endAt: { gt: startAtDate }
            }
        });

        if (conflictingHold || conflictingBooking) {
            throw new Error("Slot taken during transaction");
        }

        return await tx.bookingHold.create({
            data: {
                branchId,
                serviceId,
                staffId,
                startAt: startAtDate,
                endAt: endAtDate,
                expiresAt: expiresAt,
            }
        });
    });

    return NextResponse.json({ 
        holdId: hold.id, 
        expiresAt: hold.expiresAt 
    });

  } catch (error: any) {
    console.error("Hold API Error:", error);
    if (error.message === "Slot taken during transaction") {
        return NextResponse.json({ error: "Slot is no longer available" }, { status: 409 });
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
