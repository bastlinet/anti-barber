import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { listAvailableSlots } from "@/lib/availability";

const querySchema = z.object({
  branchId: z.string().uuid(),
  serviceId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  staffId: z.string().uuid().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = {
      branchId: searchParams.get("branchId"),
      serviceId: searchParams.get("serviceId"),
      date: searchParams.get("date"),
      staffId: searchParams.get("staffId") || undefined,
    };

    const result = querySchema.safeParse(query);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: result.error.format() },
        { status: 400 }
      );
    }

    const { branchId, serviceId, date, staffId } = result.data;

    const slots = await listAvailableSlots({
      branchId,
      serviceId,
      date,
      staffId,
    });

    return NextResponse.json({ slots });
  } catch (error: any) {
    console.error("Availability API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
