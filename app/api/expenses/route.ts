import { NextResponse } from 'next/server'
import { z } from 'zod'
import { eq, and, desc } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { expenses, walletMembers } from '@/lib/schema'

const expenseSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  category: z.string().min(1).max(50),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  description: z.string().max(500).optional(),
  walletId: z.string().min(1, 'Wallet is required'),
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

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const walletId = searchParams.get('walletId')

  if (walletId) {
    // Verify wallet membership
    const membership = await db.query.walletMembers.findFirst({
      where: and(
        eq(walletMembers.walletId, walletId),
        eq(walletMembers.userId, session.user.id),
      ),
    })
    if (!membership) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const result = await db.query.expenses.findMany({
      where: eq(expenses.walletId, walletId),
      orderBy: desc(expenses.date),
    })

    return NextResponse.json({ expenses: result.map(serializeExpense) })
  }

  // Fallback: return all user's expenses (backwards compatible)
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

  // Verify wallet membership
  const membership = await db.query.walletMembers.findFirst({
    where: and(
      eq(walletMembers.walletId, parsed.data.walletId),
      eq(walletMembers.userId, session.user.id),
    ),
  })
  if (!membership) {
    return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
  }

  const [expense] = await db.insert(expenses).values({
    userId: session.user.id,
    walletId: parsed.data.walletId,
    amount: String(parsed.data.amount),
    category: parsed.data.category,
    date: new Date(parsed.data.date),
    description: parsed.data.description || null,
  }).returning()

  return NextResponse.json({ expense: serializeExpense(expense) }, { status: 201 })
}
