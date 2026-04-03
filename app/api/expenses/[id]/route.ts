import { NextResponse } from 'next/server'
import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { expenses, walletMembers } from '@/lib/schema'

const expenseSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  category: z.string().min(1).max(50),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  description: z.string().max(500).optional(),
})

function serializeExpense(e: { id: string; walletId: string | null; amount: string; category: string; date: Date | string; description: string | null; createdAt: Date; updatedAt: Date | null }) {
  const dateValue = e.date instanceof Date ? e.date : new Date(e.date)
  return {
    id: e.id,
    walletId: e.walletId,
    amount: Number(e.amount),
    category: e.category,
    date: dateValue.toISOString().split('T')[0],
    description: e.description,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  }
}

async function checkExpenseAccess(expenseId: string, userId: string) {
  const expense = await db.query.expenses.findFirst({
    where: eq(expenses.id, expenseId),
  })
  if (!expense) return null

  // If expense has a wallet, check membership
  if (expense.walletId) {
    const membership = await db.query.walletMembers.findFirst({
      where: and(
        eq(walletMembers.walletId, expense.walletId),
        eq(walletMembers.userId, userId),
      ),
    })
    if (!membership) return null
  } else {
    // Legacy: no wallet, check userId directly
    if (expense.userId !== userId) return null
  }

  return expense
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const existing = await checkExpenseAccess(id, session.user.id)
  if (!existing) {
    return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
  }

  const body = await request.json()
  const parsed = expenseSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  const [expense] = await db.update(expenses)
    .set({
      amount: String(parsed.data.amount),
      category: parsed.data.category,
      date: new Date(parsed.data.date),
      description: parsed.data.description || null,
    })
    .where(eq(expenses.id, id))
    .returning()

  return NextResponse.json({ expense: serializeExpense(expense) })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const existing = await checkExpenseAccess(id, session.user.id)
  if (!existing) {
    return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
  }

  await db.delete(expenses).where(eq(expenses.id, id))

  return NextResponse.json({ success: true })
}
