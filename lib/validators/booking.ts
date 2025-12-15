import { z } from "zod";

export const createHoldSchema = z.object({
  branchId: z.string().uuid(),
  serviceId: z.string().uuid(),
  staffId: z.string().uuid(),
  startAt: z.string().datetime(), // ISO string UTC
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // Contextual date for getting availability if needed, or just logging
});

export const confirmBookingSchema = z.object({
  holdId: z.string().uuid(),
  customerName: z.string().min(2, "Jméno je příliš krátké"),
  customerEmail: z.string().email("Neplatný email"),
  customerPhone: z.string().min(9, "Neplatný telefon"),
  note: z.string().optional(),
});

export type CreateHoldRequest = z.infer<typeof createHoldSchema>;
export type ConfirmBookingRequest = z.infer<typeof confirmBookingSchema>;
