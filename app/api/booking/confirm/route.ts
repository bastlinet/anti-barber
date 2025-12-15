import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { confirmBookingSchema } from "@/lib/validators/booking";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = confirmBookingSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid request", details: result.error.format() },
        { status: 400 }
      );
    }

    const { holdId, customerName, customerEmail, customerPhone, note } = result.data;

    // Transaction:
    // 1. Verify Hold exists and is valid (not expired)
    // 2. Create Booking
    // 3. Delete Hold
    
    const booking = await prisma.$transaction(async (tx) => {
        const hold = await tx.bookingHold.findUnique({
            where: { id: holdId }
        });

        if (!hold) {
            throw new Error("Hold not found");
        }

        if (hold.expiresAt < new Date()) {
            throw new Error("Hold expired");
        }

        const newBooking = await tx.booking.create({
            data: {
                branchId: hold.branchId,
                serviceId: hold.serviceId,
                staffId: hold.staffId,
                startAt: hold.startAt,
                endAt: hold.endAt,
                customerName,
                customerEmail,
                customerPhone,
                note,
                status: 'CONFIRMED', 
                // Payment is unused for now (M4)
            }
        });

        await tx.bookingHold.delete({
            where: { id: holdId }
        });

        return newBooking;
    });

    console.log(`[EMAIL STUB] Sending confirmation to ${customerEmail} for booking ${booking.id}`);
    // TODO: Integrate Resend here


    return NextResponse.json({ 
        bookingId: booking.id,
        status: booking.status
    });

  } catch (error: any) {
    console.error("Confirm API Error:", error);
    if (error.message === "Hold not found" || error.message === "Hold expired") {
        return NextResponse.json({ error: error.message }, { status: 404 }); // Or 410 Gone
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
