import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

const expenseSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  category: z.string().min(1).max(50),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  description: z.string().max(500).optional(),
})

function serializeExpense(e: { id: string; amount: unknown; category: string; date: Date; description: string | null; createdAt: Date; updatedAt: Date | null }) {
  return {
    id: e.id,
    amount: Number(e.amount),
    category: e.category,
    date: e.date.toISOString().split('T')[0],
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

  const expenses = await prisma.expense.findMany({
    where: { userId: session.user.id },
    orderBy: { date: 'desc' },
  })

  return NextResponse.json({ expenses: expenses.map(serializeExpense) })
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

  const expense = await prisma.expense.create({
    data: {
      userId: session.user.id,
      amount: parsed.data.amount,
      category: parsed.data.category,
      date: new Date(parsed.data.date),
      description: parsed.data.description || null,
    },
  })

  return NextResponse.json({ expense: serializeExpense(expense) }, { status: 201 })
}
