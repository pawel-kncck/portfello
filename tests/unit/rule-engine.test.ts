import { describe, it, expect } from 'vitest'
import {
  evaluateRules,
  conditionsSchema,
  actionsSchema,
  type RuleDefinition,
  type ExpenseData,
} from '../../lib/rules/engine'

describe('Rule Engine', () => {
  describe('conditionsSchema', () => {
    it('accepts valid description condition', () => {
      const result = conditionsSchema.safeParse({
        description: { contains: 'allegro' },
      })
      expect(result.success).toBe(true)
    })

    it('accepts valid amount condition', () => {
      const result = conditionsSchema.safeParse({
        amount: { gte: 100, lte: 500 },
      })
      expect(result.success).toBe(true)
    })

    it('accepts valid direction condition', () => {
      const result = conditionsSchema.safeParse({
        direction: { equals: 'inflow' },
      })
      expect(result.success).toBe(true)
    })

    it('accepts multiple conditions', () => {
      const result = conditionsSchema.safeParse({
        description: { contains: 'zwrot' },
        amount: { lte: 500 },
        direction: { equals: 'inflow' },
      })
      expect(result.success).toBe(true)
    })

    it('rejects empty conditions object', () => {
      const result = conditionsSchema.safeParse({})
      expect(result.success).toBe(false)
    })

    it('rejects invalid direction value', () => {
      const result = conditionsSchema.safeParse({
        direction: { equals: 'invalid' },
      })
      expect(result.success).toBe(false)
    })

    it('accepts between amount condition', () => {
      const result = conditionsSchema.safeParse({
        amount: { between: [10, 100] },
      })
      expect(result.success).toBe(true)
    })

    it('accepts regex description condition', () => {
      const result = conditionsSchema.safeParse({
        description: { regex: 'smyk|h&m kids' },
      })
      expect(result.success).toBe(true)
    })

    it('accepts date condition with dayOfWeek', () => {
      const result = conditionsSchema.safeParse({
        date: { dayOfWeek: 1 },
      })
      expect(result.success).toBe(true)
    })

    it('rejects date condition with invalid dayOfWeek', () => {
      const result = conditionsSchema.safeParse({
        date: { dayOfWeek: 7 },
      })
      expect(result.success).toBe(false)
    })
  })

  describe('actionsSchema', () => {
    it('accepts valid category action', () => {
      const result = actionsSchema.safeParse({
        category: 'Shopping > E-commerce',
      })
      expect(result.success).toBe(true)
    })

    it('accepts valid tags action', () => {
      const result = actionsSchema.safeParse({
        tags: ['online', 'children'],
      })
      expect(result.success).toBe(true)
    })

    it('accepts valid type action', () => {
      const result = actionsSchema.safeParse({
        type: 'cost_reduction',
      })
      expect(result.success).toBe(true)
    })

    it('accepts multiple actions', () => {
      const result = actionsSchema.safeParse({
        category: 'Shopping',
        tags: ['online'],
        type: 'expense',
      })
      expect(result.success).toBe(true)
    })

    it('rejects empty actions object', () => {
      const result = actionsSchema.safeParse({})
      expect(result.success).toBe(false)
    })

    it('rejects invalid type value', () => {
      const result = actionsSchema.safeParse({
        type: 'invalid',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('evaluateRules', () => {
    const makeRule = (
      overrides: Partial<RuleDefinition> = {}
    ): RuleDefinition => ({
      id: 'rule-1',
      name: 'Test Rule',
      priority: 0,
      conditions: { description: { contains: 'test' } },
      actions: { category: 'Test Category' },
      enabled: true,
      ...overrides,
    })

    const makeExpense = (
      overrides: Partial<ExpenseData> = {}
    ): ExpenseData => ({
      description: 'Test purchase',
      amount: 100,
      direction: 'outflow',
      date: new Date('2026-01-15'),
      ...overrides,
    })

    it('matches a description contains condition', () => {
      const rules = [makeRule()]
      const expense = makeExpense({ description: 'Test item from store' })
      const result = evaluateRules(expense, rules)

      expect(result.category).toBe('Test Category')
      expect(result.matchedRules).toContain('rule-1')
    })

    it('does not match when description does not contain text', () => {
      const rules = [makeRule()]
      const expense = makeExpense({ description: 'Grocery shopping' })
      const result = evaluateRules(expense, rules)

      expect(result.category).toBeUndefined()
      expect(result.matchedRules).toHaveLength(0)
    })

    it('matches case-insensitively for description contains', () => {
      const rules = [makeRule({
        conditions: { description: { contains: 'ALLEGRO' } },
      })]
      const expense = makeExpense({ description: 'allegro order #123' })
      const result = evaluateRules(expense, rules)

      expect(result.category).toBe('Test Category')
    })

    it('matches regex condition', () => {
      const rules = [makeRule({
        conditions: { description: { regex: 'smyk|h&m kids' } },
      })]
      const expense = makeExpense({ description: 'SMYK Centrum' })
      const result = evaluateRules(expense, rules)

      expect(result.matchedRules).toHaveLength(1)
    })

    it('matches startsWith condition', () => {
      const rules = [makeRule({
        conditions: { description: { startsWith: 'uber' } },
      })]
      const expense = makeExpense({ description: 'Uber trip downtown' })
      const result = evaluateRules(expense, rules)

      expect(result.matchedRules).toHaveLength(1)
    })

    it('matches endsWith condition', () => {
      const rules = [makeRule({
        conditions: { description: { endsWith: 'sp. z o.o.' } },
      })]
      const expense = makeExpense({ description: 'Firma ABC sp. z o.o.' })
      const result = evaluateRules(expense, rules)

      expect(result.matchedRules).toHaveLength(1)
    })

    it('matches amount condition', () => {
      const rules = [makeRule({
        conditions: { amount: { gte: 50, lte: 200 } },
        actions: { category: 'Medium Purchase' },
      })]
      const expense = makeExpense({ amount: 100 })
      const result = evaluateRules(expense, rules)

      expect(result.category).toBe('Medium Purchase')
    })

    it('does not match amount outside range', () => {
      const rules = [makeRule({
        conditions: { amount: { gte: 50, lte: 200 } },
      })]
      const expense = makeExpense({ amount: 300 })
      const result = evaluateRules(expense, rules)

      expect(result.matchedRules).toHaveLength(0)
    })

    it('matches amount between condition', () => {
      const rules = [makeRule({
        conditions: { amount: { between: [10, 50] } },
      })]
      const expense = makeExpense({ amount: 30 })
      const result = evaluateRules(expense, rules)

      expect(result.matchedRules).toHaveLength(1)
    })

    it('matches direction condition', () => {
      const rules = [makeRule({
        conditions: { direction: { equals: 'inflow' } },
        actions: { type: 'income' },
      })]
      const expense = makeExpense({ direction: 'inflow' })
      const result = evaluateRules(expense, rules)

      expect(result.type).toBe('income')
    })

    it('matches multiple conditions (AND logic)', () => {
      const rules = [makeRule({
        conditions: {
          description: { contains: 'zwrot' },
          amount: { lte: 500 },
          direction: { equals: 'inflow' },
        },
        actions: { type: 'cost_reduction' },
      })]
      const expense = makeExpense({
        description: 'Zwrot za buty',
        amount: 200,
        direction: 'inflow',
      })
      const result = evaluateRules(expense, rules)

      expect(result.type).toBe('cost_reduction')
    })

    it('fails when one of multiple conditions does not match', () => {
      const rules = [makeRule({
        conditions: {
          description: { contains: 'zwrot' },
          amount: { lte: 500 },
          direction: { equals: 'inflow' },
        },
      })]
      const expense = makeExpense({
        description: 'Zwrot za buty',
        amount: 200,
        direction: 'outflow', // does not match
      })
      const result = evaluateRules(expense, rules)

      expect(result.matchedRules).toHaveLength(0)
    })

    it('first matching rule wins for category', () => {
      const rules = [
        makeRule({
          id: 'rule-1',
          priority: 0,
          conditions: { description: { contains: 'allegro' } },
          actions: { category: 'Shopping > E-commerce' },
        }),
        makeRule({
          id: 'rule-2',
          priority: 1,
          conditions: { description: { contains: 'allegro' } },
          actions: { category: 'Shopping > Online' },
        }),
      ]
      const expense = makeExpense({ description: 'Allegro purchase' })
      const result = evaluateRules(expense, rules)

      expect(result.category).toBe('Shopping > E-commerce')
      expect(result.matchedRules).toEqual(['rule-1', 'rule-2'])
    })

    it('accumulates tags from all matching rules', () => {
      const rules = [
        makeRule({
          id: 'rule-1',
          priority: 0,
          conditions: { description: { contains: 'smyk' } },
          actions: { tags: ['children'] },
        }),
        makeRule({
          id: 'rule-2',
          priority: 1,
          conditions: { description: { contains: 'smyk' } },
          actions: { tags: ['shopping', 'children'] },
        }),
      ]
      const expense = makeExpense({ description: 'SMYK store' })
      const result = evaluateRules(expense, rules)

      expect(result.tags).toEqual(['children', 'shopping'])
    })

    it('skips disabled rules', () => {
      const rules = [makeRule({ enabled: false })]
      const expense = makeExpense()
      const result = evaluateRules(expense, rules)

      expect(result.matchedRules).toHaveLength(0)
    })

    it('handles null description gracefully', () => {
      const rules = [makeRule({
        conditions: { description: { contains: 'test' } },
      })]
      const expense = makeExpense({ description: null })
      const result = evaluateRules(expense, rules)

      expect(result.matchedRules).toHaveLength(0)
    })

    it('handles undefined description gracefully', () => {
      const rules = [makeRule({
        conditions: { description: { contains: 'test' } },
      })]
      const expense = makeExpense({ description: undefined })
      const result = evaluateRules(expense, rules)

      expect(result.matchedRules).toHaveLength(0)
    })

    it('handles invalid regex gracefully', () => {
      const rules = [makeRule({
        conditions: { description: { regex: '[invalid' } },
      })]
      const expense = makeExpense({ description: 'anything' })
      const result = evaluateRules(expense, rules)

      expect(result.matchedRules).toHaveLength(0)
    })

    it('respects priority ordering', () => {
      const rules = [
        makeRule({
          id: 'low-priority',
          priority: 10,
          conditions: { description: { contains: 'shop' } },
          actions: { category: 'General Shopping' },
        }),
        makeRule({
          id: 'high-priority',
          priority: 0,
          conditions: { description: { contains: 'shop' } },
          actions: { category: 'Specific Shopping' },
        }),
      ]
      const expense = makeExpense({ description: 'Shopping trip' })
      const result = evaluateRules(expense, rules)

      expect(result.category).toBe('Specific Shopping')
    })

    it('returns empty result when no rules match', () => {
      const rules = [makeRule({
        conditions: { description: { contains: 'nonexistent' } },
      })]
      const expense = makeExpense({ description: 'Something else' })
      const result = evaluateRules(expense, rules)

      expect(result.category).toBeUndefined()
      expect(result.tags).toEqual([])
      expect(result.type).toBeUndefined()
      expect(result.matchedRules).toEqual([])
    })

    it('handles date string input', () => {
      const rules = [makeRule({
        conditions: { amount: { gt: 0 } },
      })]
      const expense = makeExpense({ date: '2026-01-15' })
      const result = evaluateRules(expense, rules)

      expect(result.matchedRules).toHaveLength(1)
    })

    it('matches date dayOfWeek condition', () => {
      // 2026-01-15 is a Thursday (day 4)
      const rules = [makeRule({
        conditions: { date: { dayOfWeek: 4 } },
      })]
      const expense = makeExpense({ date: new Date('2026-01-15') })
      const result = evaluateRules(expense, rules)

      expect(result.matchedRules).toHaveLength(1)
    })
  })
})
