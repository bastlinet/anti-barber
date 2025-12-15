import { z } from 'zod';

export const createStaffSchema = z.object({
  branchId: z.string().uuid(),
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  active: z.boolean().default(true),
  avatarUrl: z.string().url().optional().or(z.literal('')),
});

export const createShiftSchema = z.object({
  staffId: z.string().uuid(),
  branchId: z.string().uuid(),
  startAt: z.string().datetime(), // Expect ISO string
  endAt: z.string().datetime(),
}).refine(data => new Date(data.endAt) > new Date(data.startAt), {
  message: "End time must be after start time",
  path: ["endAt"],
});

export const createTimeOffSchema = z.object({
  staffId: z.string().uuid(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  reason: z.string().optional(),
});
