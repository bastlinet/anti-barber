import { describe, it, expect } from 'vitest'
import { createHoldSchema, confirmBookingSchema } from './booking'

describe('createHoldSchema', () => {
  it('should validate correct payload', () => {
    const valid = {
      branchId: '123e4567-e89b-12d3-a456-426614174000',
      serviceId: '123e4567-e89b-12d3-a456-426614174001',
      staffId: '123e4567-e89b-12d3-a456-426614174002',
      startAt: '2024-01-01T10:00:00.000Z',
      date: '2024-01-01'
    }
    const result = createHoldSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it('should fail on invalid UUID', () => {
    const invalid = {
      branchId: 'invalid-id',
      serviceId: '123e4567-e89b-12d3-a456-426614174001',
      staffId: '123e4567-e89b-12d3-a456-426614174002',
      startAt: '2024-01-01T10:00:00.000Z',
      date: '2024-01-01'
    }
    const result = createHoldSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('should fail on invalid date format', () => {
    const invalid = {
      branchId: '123e4567-e89b-12d3-a456-426614174000',
      serviceId: '123e4567-e89b-12d3-a456-426614174001',
      staffId: '123e4567-e89b-12d3-a456-426614174002',
      startAt: 'not-a-date',
      date: '2024-01-01'
    }
    const result = createHoldSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })
})

describe('confirmBookingSchema', () => {
  it('should validate correct payload', () => {
    const valid = {
      holdId: '123e4567-e89b-12d3-a456-426614174000',
      customerName: 'John Doe',
      customerEmail: 'john@example.com',
      customerPhone: '123456789',
      note: 'Hello'
    }
    const result = confirmBookingSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it('should fail on invalid email', () => {
    const invalid = {
      holdId: '123e4567-e89b-12d3-a456-426614174000',
      customerName: 'John Doe',
      customerEmail: 'not-an-email',
      customerPhone: '123456789'
    }
    const result = confirmBookingSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })
})
