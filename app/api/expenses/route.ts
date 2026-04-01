import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const expenses = await prisma.expense.findMany({
    where: { userId: session.user.id },
    orderBy: { date: 'desc' },
  })

  const serialized = expenses.map(e => ({
    ...e,
    amount: Number(e.amount),
    date: e.date.toISOString().split('T')[0],
  }))

  return NextResponse.json({ expenses: serialized })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { amount, category, date, description } = await request.json()

  const expense = await prisma.expense.create({
    data: {
      userId: session.user.id,
      amount,
      category,
      date: new Date(date),
      description: description || null,
    },
  })

  return NextResponse.json({
    expense: {
      ...expense,
      amount: Number(expense.amount),
      date: expense.date.toISOString().split('T')[0],
    },
  }, { status: 201 })
}
