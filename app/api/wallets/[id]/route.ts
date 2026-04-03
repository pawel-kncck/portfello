import { NextResponse } from 'next/server'
import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { wallets, walletMembers } from '@/lib/schema'

const updateWalletSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 chars or less'),
})

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  // Check membership
  const membership = await db.query.walletMembers.findFirst({
    where: and(
      eq(walletMembers.walletId, id),
      eq(walletMembers.userId, session.user.id),
    ),
  })
  if (!membership) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await request.json()
  const parsed = updateWalletSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  const [updated] = await db.update(wallets)
    .set({ name: parsed.data.name })
    .where(eq(wallets.id, id))
    .returning()

  return NextResponse.json({
    wallet: {
      id: updated.id,
      name: updated.name,
      type: updated.type,
      role: membership.role,
      createdAt: updated.createdAt,
    },
  })
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

  // Only owner can delete
  const membership = await db.query.walletMembers.findFirst({
    where: and(
      eq(walletMembers.walletId, id),
      eq(walletMembers.userId, session.user.id),
    ),
  })
  if (!membership) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (membership.role !== 'owner') {
    return NextResponse.json({ error: 'Only the owner can delete a wallet' }, { status: 403 })
  }

  // Check if it's a personal wallet
  const wallet = await db.query.wallets.findFirst({
    where: eq(wallets.id, id),
  })
  if (wallet?.type === 'personal') {
    return NextResponse.json({ error: 'Cannot delete personal wallet' }, { status: 400 })
  }

  await db.delete(wallets).where(eq(wallets.id, id))

  return NextResponse.json({ success: true })
}
