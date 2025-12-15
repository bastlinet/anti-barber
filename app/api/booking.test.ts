/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as holdHandler } from './booking/hold/route';
import { POST as confirmHandler } from './booking/confirm/route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper to mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    service: { findUnique: vi.fn() },
    branch: { findUnique: vi.fn() },
    staff: { findMany: vi.fn() },
    shift: { findMany: vi.fn() },
    break: { findMany: vi.fn() },
    timeOff: { findMany: vi.fn() },
    booking: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
    bookingHold: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), findUnique: vi.fn(), delete: vi.fn() },
    $transaction: vi.fn((callback) => callback(prisma)),
  },
}));

// Helper to mock availability logic to avoid complex mocking of shifts
vi.mock('@/lib/availability', () => ({
    listAvailableSlots: vi.fn()
}));

import { listAvailableSlots } from '@/lib/availability';

describe('Booking API Integration', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('Scenario 1: Happy Path (Hold -> Confirm)', async () => {
        // 1. Hold
        const holdBody = {
            branchId: '123e4567-e89b-12d3-a456-426614174000',
            serviceId: '123e4567-e89b-12d3-a456-426614174001',
            staffId: '123e4567-e89b-12d3-a456-426614174002',
            startAt: '2024-01-01T10:00:00.000Z',
            date: '2024-01-01',
        };

        // Mock availability to return our slot
        vi.mocked(listAvailableSlots).mockResolvedValue([
            { start: '2024-01-01T10:00:00.000Z', staffId: '123e4567-e89b-12d3-a456-426614174002' }
        ]);

        vi.mocked(prisma.service.findUnique).mockResolvedValue({ durationMin: 60 } as any);
        
        // Mock transaction checks
        vi.mocked(prisma.bookingHold.findFirst).mockResolvedValue(null); // No conflict
        vi.mocked(prisma.booking.findFirst).mockResolvedValue(null); // No conflict
        
        vi.mocked(prisma.bookingHold.create).mockResolvedValue({
            id: '123e4567-e89b-12d3-a456-426614174003',
            expiresAt: new Date(Date.now() + 10000),
            branchId: '123e4567-e89b-12d3-a456-426614174000'
        } as any);

        const holdReq = new NextRequest('http://localhost/api/booking/hold', {
            method: 'POST',
            body: JSON.stringify(holdBody)
        });

        const holdRes = await holdHandler(holdReq);
        if (holdRes.status !== 200) {
           console.log("Hold Error:", await holdRes.json());
        }
        expect(holdRes.status).toBe(200);
        const holdData = await holdRes.json();
        expect(holdData.holdId).toBe('123e4567-e89b-12d3-a456-426614174003');

        // 2. Confirm
        const confirmBody = {
            holdId: '123e4567-e89b-12d3-a456-426614174003',
            customerName: 'John',
            customerEmail: 'john@example.com',
            customerPhone: '123456789'
        };

        // Mock findUnique for Hold
        vi.mocked(prisma.bookingHold.findUnique).mockResolvedValue({
            id: '123e4567-e89b-12d3-a456-426614174003',
            expiresAt: new Date(Date.now() + 10000), // Valid
            branchId: '123e4567-e89b-12d3-a456-426614174000',
            serviceId: '123e4567-e89b-12d3-a456-426614174001',
            staffId: '123e4567-e89b-12d3-a456-426614174002',
            startAt: new Date('2024-01-01T10:00:00.000Z'),
            endAt: new Date('2024-01-01T11:00:00.000Z'),
        } as any);

        vi.mocked(prisma.booking.create).mockResolvedValue({
            id: '123e4567-e89b-12d3-a456-426614174004',
            status: 'CONFIRMED'
        } as any);

        const confirmReq = new NextRequest('http://localhost/api/booking/confirm', {
            method: 'POST',
            body: JSON.stringify(confirmBody)
        });

        const confirmRes = await confirmHandler(confirmReq);
        expect(confirmRes.status).toBe(200);
        const confirmData = await confirmRes.json();
        expect(confirmData.bookingId).toBe('123e4567-e89b-12d3-a456-426614174004');
        expect(confirmData.status).toBe('CONFIRMED');
    });

    it('Scenario 2: Conflict (Slot taken)', async () => {
        const holdBody = {
            branchId: '123e4567-e89b-12d3-a456-426614174000',
            serviceId: '123e4567-e89b-12d3-a456-426614174001',
            staffId: '123e4567-e89b-12d3-a456-426614174002',
            startAt: '2024-01-01T10:00:00.000Z',
            date: '2024-01-01',
        };

        // Availability says NO
        vi.mocked(listAvailableSlots).mockResolvedValue([]);

        const req = new NextRequest('http://localhost/api/booking/hold', {
            method: 'POST',
            body: JSON.stringify(holdBody)
        });

        const res = await holdHandler(req);
        expect(res.status).toBe(409); // Conflict
        const data = await res.json();
        expect(data.error).toBe('Slot is no longer available');
    });

    it('Scenario 3: Expired Hold', async () => {
        const confirmBody = {
            holdId: '123e4567-e89b-12d3-a456-426614174009',
            customerName: 'John',
            customerEmail: 'john@example.com',
            customerPhone: '123456789' 
        };

        vi.mocked(prisma.bookingHold.findUnique).mockResolvedValue({
            id: '123e4567-e89b-12d3-a456-426614174009',
            expiresAt: new Date(Date.now() - 10000), // EXPIRED
        } as any);

        const req = new NextRequest('http://localhost/api/booking/confirm', {
            method: 'POST',
            body: JSON.stringify(confirmBody)
        });

        const res = await confirmHandler(req);
        // Note: The previous run asserted 400 but expected 404 because phone/email might have been invalid in previous attempt? 
        // Re-checked schema: confirmBody has email/phone. 
        // However, invalid UUID for holdId would cause 400.
        // using valid UUID for confirmBody.holdId is important.
        
        expect(res.status).toBe(404); // Or 410, code returns 404 for now
        const data = await res.json();
        expect(data.error).toBe('Hold expired');
    });
});
