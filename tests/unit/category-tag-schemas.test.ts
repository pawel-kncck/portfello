import { describe, it, expect } from 'vitest'
import { z } from 'zod'

// Replicate validation schemas from API routes
const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  parentId: z.string().nullable().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color').optional(),
  sortOrder: z.number().int().min(0).optional(),
})

const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  parentId: z.string().nullable().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color').optional(),
  sortOrder: z.number().int().min(0).optional(),
})

const createTagSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50),
})

const updateTagSchema = z.object({
  name: z.string().min(1).max(50),
})

describe('Category Schema Validation', () => {
  describe('createCategorySchema', () => {
    it('accepts valid category with just name', () => {
      const result = createCategorySchema.safeParse({ name: 'Food' })
      expect(result.success).toBe(true)
    })

    it('accepts category with all fields', () => {
      const result = createCategorySchema.safeParse({
        name: 'Groceries',
        parentId: 'parent-123',
        color: '#FF5733',
        sortOrder: 5,
      })
      expect(result.success).toBe(true)
    })

    it('accepts category with null parentId (root)', () => {
      const result = createCategorySchema.safeParse({
        name: 'Root Category',
        parentId: null,
      })
      expect(result.success).toBe(true)
    })

    it('rejects empty name', () => {
      const result = createCategorySchema.safeParse({ name: '' })
      expect(result.success).toBe(false)
    })

    it('rejects name over 100 chars', () => {
      const result = createCategorySchema.safeParse({ name: 'a'.repeat(101) })
      expect(result.success).toBe(false)
    })

    it('rejects invalid color format', () => {
      const result = createCategorySchema.safeParse({
        name: 'Test',
        color: 'red',
      })
      expect(result.success).toBe(false)
    })

    it('rejects color without hash', () => {
      const result = createCategorySchema.safeParse({
        name: 'Test',
        color: 'FF5733',
      })
      expect(result.success).toBe(false)
    })

    it('accepts valid hex colors', () => {
      const colors = ['#000000', '#FFFFFF', '#ff5733', '#abcdef']
      for (const color of colors) {
        const result = createCategorySchema.safeParse({ name: 'Test', color })
        expect(result.success).toBe(true)
      }
    })

    it('rejects negative sortOrder', () => {
      const result = createCategorySchema.safeParse({
        name: 'Test',
        sortOrder: -1,
      })
      expect(result.success).toBe(false)
    })

    it('rejects non-integer sortOrder', () => {
      const result = createCategorySchema.safeParse({
        name: 'Test',
        sortOrder: 1.5,
      })
      expect(result.success).toBe(false)
    })
  })

  describe('updateCategorySchema', () => {
    it('accepts partial update with just name', () => {
      const result = updateCategorySchema.safeParse({ name: 'New Name' })
      expect(result.success).toBe(true)
    })

    it('accepts partial update with just color', () => {
      const result = updateCategorySchema.safeParse({ color: '#FF0000' })
      expect(result.success).toBe(true)
    })

    it('accepts empty object (no-op update)', () => {
      const result = updateCategorySchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('allows setting parentId to null (move to root)', () => {
      const result = updateCategorySchema.safeParse({ parentId: null })
      expect(result.success).toBe(true)
    })
  })
})

describe('Tag Schema Validation', () => {
  describe('createTagSchema', () => {
    it('accepts valid tag name', () => {
      const result = createTagSchema.safeParse({ name: 'children' })
      expect(result.success).toBe(true)
    })

    it('rejects empty name', () => {
      const result = createTagSchema.safeParse({ name: '' })
      expect(result.success).toBe(false)
    })

    it('rejects name over 50 chars', () => {
      const result = createTagSchema.safeParse({ name: 'a'.repeat(51) })
      expect(result.success).toBe(false)
    })

    it('accepts name at max length', () => {
      const result = createTagSchema.safeParse({ name: 'a'.repeat(50) })
      expect(result.success).toBe(true)
    })
  })

  describe('updateTagSchema', () => {
    it('accepts valid rename', () => {
      const result = updateTagSchema.safeParse({ name: 'new-name' })
      expect(result.success).toBe(true)
    })

    it('rejects empty name', () => {
      const result = updateTagSchema.safeParse({ name: '' })
      expect(result.success).toBe(false)
    })
  })
})
