import { NextResponse } from 'next/server'
import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { rules } from '@/lib/schema'
import { checkWalletMembership } from '@/lib/wallet/membership'
import { conditionsSchema, actionsSchema } from '@/lib/rules/engine'

const updateRuleSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  priority: z.number().int().min(0).optional(),
  conditions: conditionsSchema.optional(),
  actions: actionsSchema.optional(),
  enabled: z.boolean().optional(),
})

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; ruleId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: walletId, ruleId } = await params

  const membership = await checkWalletMembership(walletId, session.user.id)
  if (!membership) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const existing = await db.query.rules.findFirst({
    where: and(eq(rules.id, ruleId), eq(rules.walletId, walletId)),
  })
  if (!existing) {
    return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
  }

  const body = await request.json()
  const parsed = updateRuleSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (parsed.data.name !== undefined) updates.name = parsed.data.name
  if (parsed.data.priority !== undefined) updates.priority = parsed.data.priority
  if (parsed.data.conditions !== undefined) updates.conditions = parsed.data.conditions
  if (parsed.data.actions !== undefined) updates.actions = parsed.data.actions
  if (parsed.data.enabled !== undefined) updates.enabled = parsed.data.enabled

  const [updated] = await db.update(rules)
    .set(updates)
    .where(eq(rules.id, ruleId))
    .returning()

  return NextResponse.json({ rule: updated })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; ruleId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: walletId, ruleId } = await params

  const membership = await checkWalletMembership(walletId, session.user.id)
  if (!membership) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const existing = await db.query.rules.findFirst({
    where: and(eq(rules.id, ruleId), eq(rules.walletId, walletId)),
  })
  if (!existing) {
    return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
  }

  await db.delete(rules).where(eq(rules.id, ruleId))

  return NextResponse.json({ success: true })
}
