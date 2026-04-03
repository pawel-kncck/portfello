import { z } from 'zod'

// ─── Schema for rule conditions and actions ───

const descriptionConditionSchema = z.object({
  contains: z.string().optional(),
  regex: z.string().optional(),
  startsWith: z.string().optional(),
  endsWith: z.string().optional(),
}).refine(obj => Object.values(obj).some(v => v !== undefined), {
  message: 'At least one description condition is required',
})

const amountConditionSchema = z.object({
  equals: z.number().optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  between: z.tuple([z.number(), z.number()]).optional(),
}).refine(obj => Object.values(obj).some(v => v !== undefined), {
  message: 'At least one amount condition is required',
})

const directionConditionSchema = z.object({
  equals: z.enum(['inflow', 'outflow']),
})

const bankAccountConditionSchema = z.object({
  equals: z.string(),
})

const dateConditionSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  between: z.tuple([z.string(), z.string()]).optional(),
}).refine(obj => Object.values(obj).some(v => v !== undefined), {
  message: 'At least one date condition is required',
})

export const conditionsSchema = z.object({
  description: descriptionConditionSchema.optional(),
  amount: amountConditionSchema.optional(),
  direction: directionConditionSchema.optional(),
  bankAccount: bankAccountConditionSchema.optional(),
  date: dateConditionSchema.optional(),
}).refine(obj => Object.values(obj).some(v => v !== undefined), {
  message: 'At least one condition is required',
})

export const actionsSchema = z.object({
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  type: z.enum(['expense', 'income', 'cost_reduction']).optional(),
}).refine(obj => Object.values(obj).some(v => v !== undefined), {
  message: 'At least one action is required',
})

// ─── Types ───

export type RuleConditions = z.infer<typeof conditionsSchema>
export type RuleActions = z.infer<typeof actionsSchema>

export interface RuleDefinition {
  id: string
  name: string
  priority: number
  conditions: RuleConditions
  actions: RuleActions
  enabled: boolean
}

export interface ExpenseData {
  description?: string | null
  amount: number
  direction?: 'inflow' | 'outflow'
  bankAccount?: string | null
  date: Date | string
}

export interface RuleResult {
  category?: string
  tags: string[]
  type?: 'expense' | 'income' | 'cost_reduction'
  matchedRules: string[]
}

// ─── Condition matchers ───

function matchDescription(
  value: string | null | undefined,
  condition: z.infer<typeof descriptionConditionSchema>
): boolean {
  if (!value) return false
  const lower = value.toLowerCase()

  if (condition.contains && !lower.includes(condition.contains.toLowerCase())) return false
  if (condition.startsWith && !lower.startsWith(condition.startsWith.toLowerCase())) return false
  if (condition.endsWith && !lower.endsWith(condition.endsWith.toLowerCase())) return false
  if (condition.regex) {
    try {
      const re = new RegExp(condition.regex, 'i')
      if (!re.test(value)) return false
    } catch {
      return false
    }
  }

  return true
}

function matchAmount(
  value: number,
  condition: z.infer<typeof amountConditionSchema>
): boolean {
  if (condition.equals !== undefined && value !== condition.equals) return false
  if (condition.gt !== undefined && value <= condition.gt) return false
  if (condition.gte !== undefined && value < condition.gte) return false
  if (condition.lt !== undefined && value >= condition.lt) return false
  if (condition.lte !== undefined && value > condition.lte) return false
  if (condition.between) {
    const [min, max] = condition.between
    if (value < min || value > max) return false
  }
  return true
}

function matchDate(
  value: Date | string,
  condition: z.infer<typeof dateConditionSchema>
): boolean {
  const d = value instanceof Date ? value : new Date(value)

  if (condition.dayOfWeek !== undefined && d.getDay() !== condition.dayOfWeek) return false
  if (condition.between) {
    const [start, end] = condition.between
    const startDate = new Date(start)
    const endDate = new Date(end)
    if (d < startDate || d > endDate) return false
  }
  return true
}

function matchesRule(expense: ExpenseData, conditions: RuleConditions): boolean {
  if (conditions.description && !matchDescription(expense.description, conditions.description)) return false
  if (conditions.amount && !matchAmount(expense.amount, conditions.amount)) return false
  if (conditions.direction && expense.direction !== conditions.direction.equals) return false
  if (conditions.bankAccount && expense.bankAccount !== conditions.bankAccount.equals) return false
  if (conditions.date && !matchDate(expense.date, conditions.date)) return false
  return true
}

// ─── Rule evaluation engine ───

export function evaluateRules(expense: ExpenseData, rules: RuleDefinition[]): RuleResult {
  const result: RuleResult = {
    tags: [],
    matchedRules: [],
  }

  // Rules should already be sorted by priority (lower = higher priority)
  const sorted = [...rules].sort((a, b) => a.priority - b.priority)

  for (const rule of sorted) {
    if (!rule.enabled) continue

    const conditions = conditionsSchema.safeParse(rule.conditions)
    const actions = actionsSchema.safeParse(rule.actions)

    if (!conditions.success || !actions.success) continue

    if (!matchesRule(expense, conditions.data)) continue

    result.matchedRules.push(rule.id)

    // Category: first match wins
    if (!result.category && actions.data.category) {
      result.category = actions.data.category
    }

    // Tags: all matching rules accumulate
    if (actions.data.tags) {
      for (const tag of actions.data.tags) {
        if (!result.tags.includes(tag)) {
          result.tags.push(tag)
        }
      }
    }

    // Type: first match wins
    if (!result.type && actions.data.type) {
      result.type = actions.data.type
    }
  }

  return result
}
