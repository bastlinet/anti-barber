"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// --- Bookings ---

export async function cancelBooking(bookingId: string) {
  await prisma.booking.update({
    where: { id: bookingId },
    data: { 
        status: "CANCELLED",
        cancelledAt: new Date()
    }
  });
  revalidatePath("/admin/calendar");
}

export async function markNoShow(bookingId: string) {
    await prisma.booking.update({
      where: { id: bookingId },
      data: { status: "NO_SHOW" }
    });
    revalidatePath("/admin/calendar");
}

// --- Staff ---

export async function createStaff(data: { name: string; branchId: string; email?: string; phone?: string }) {
    await prisma.staff.create({
        data: {
            ...data,
            active: true
        }
    });
    revalidatePath("/admin/staff");
    revalidatePath("/admin/calendar");
}

export async function toggleStaffActive(id: string, active: boolean) {
    await prisma.staff.update({
        where: { id },
        data: { active }
    });
    revalidatePath("/admin/staff");
    revalidatePath("/admin/calendar");
}

// --- Services ---

export async function toggleServiceActive(id: string, active: boolean) {
    await prisma.service.update({
        where: { id },
        data: { active }
    });
    revalidatePath("/admin/services");
}

export async function updateServicePrice(branchId: string, serviceId: string, priceCents: number) {
    // Upsert BranchService
    await prisma.branchService.upsert({
        where: { branchId_serviceId: { branchId, serviceId } },
        create: { branchId, serviceId, priceCents, active: true },
        update: { priceCents }
    });
    // Also update base service if needed? No, usually per branch.
    revalidatePath("/admin/services");
}

// --- Shifts ---
// Minimal implementation for demo
export async function createShift(staffId: string, branchId: string, startAt: Date, endAt: Date) {
    await prisma.shift.create({
        data: {
            staffId,
            branchId,
            startAt,
            endAt
        }
    });
    revalidatePath("/admin/calendar");
}

export async function deleteShift(shiftId: string) {
    await prisma.shift.delete({
        where: { id: shiftId }
    });
    revalidatePath("/admin/calendar");
}
