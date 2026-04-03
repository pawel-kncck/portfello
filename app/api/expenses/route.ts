import { NextResponse } from 'next/server'
import { z } from 'zod'
import { eq, desc } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { expenses } from '@/lib/schema'

const expenseSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  category: z.string().min(1).max(50),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  description: z.string().max(500).optional(),
})

function serializeExpense(e: { id: string; amount: string; category: string; date: Date | string; description: string | null; createdAt: Date; updatedAt: Date | null }) {
  const dateValue = e.date instanceof Date ? e.date : new Date(e.date)
  return {
    id: e.id,
    amount: Number(e.amount),
    category: e.category,
    date: dateValue.toISOString().split('T')[0],
    description: e.description,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  }
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await db.query.expenses.findMany({
    where: eq(expenses.userId, session.user.id),
    orderBy: desc(expenses.date),
  })

  return NextResponse.json({ expenses: result.map(serializeExpense) })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = expenseSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  const [expense] = await db.insert(expenses).values({
    userId: session.user.id,
    amount: String(parsed.data.amount),
    category: parsed.data.category,
    date: new Date(parsed.data.date),
    description: parsed.data.description || null,
  }).returning()

  return NextResponse.json({ expense: serializeExpense(expense) }, { status: 201 })
}
