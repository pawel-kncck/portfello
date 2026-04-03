import { NextResponse } from 'next/server'
import { z } from 'zod'
import { eq, asc } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { rules } from '@/lib/schema'
import { checkWalletMembership } from '@/lib/wallet/membership'
import { conditionsSchema, actionsSchema } from '@/lib/rules/engine'

const createRuleSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  priority: z.number().int().min(0).optional(),
  conditions: conditionsSchema,
  actions: actionsSchema,
  enabled: z.boolean().optional(),
})

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: walletId } = await params

  const membership = await checkWalletMembership(walletId, session.user.id)
  if (!membership) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const walletRules = await db.query.rules.findMany({
    where: eq(rules.walletId, walletId),
    orderBy: [asc(rules.priority)],
  })

  return NextResponse.json({ rules: walletRules })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: walletId } = await params

  const membership = await checkWalletMembership(walletId, session.user.id)
  if (!membership) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await request.json()
  const parsed = createRuleSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  const [rule] = await db.insert(rules).values({
    walletId,
    name: parsed.data.name,
    priority: parsed.data.priority ?? 0,
    conditions: parsed.data.conditions,
    actions: parsed.data.actions,
    enabled: parsed.data.enabled ?? true,
    createdById: session.user.id,
  }).returning()

  return NextResponse.json({ rule }, { status: 201 })
}
