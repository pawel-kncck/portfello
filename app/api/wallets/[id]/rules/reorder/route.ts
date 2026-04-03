import { NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { rules } from '@/lib/schema'
import { checkWalletMembership } from '@/lib/wallet/membership'

const reorderSchema = z.object({
  ruleIds: z.array(z.string()).min(1, 'At least one rule ID is required'),
})

export async function PUT(
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
  const parsed = reorderSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  // Update priorities based on array order
  const updates = parsed.data.ruleIds.map((ruleId, index) =>
    db.update(rules)
      .set({ priority: index })
      .where(eq(rules.id, ruleId))
  )

  await Promise.all(updates)

  return NextResponse.json({ success: true })
}
