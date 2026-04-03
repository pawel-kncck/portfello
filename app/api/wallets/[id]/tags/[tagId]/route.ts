import { NextResponse } from 'next/server'
import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { tags } from '@/lib/schema'
import { checkWalletMembership } from '@/lib/wallet/membership'

const updateTagSchema = z.object({
  name: z.string().min(1).max(50),
})

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; tagId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: walletId, tagId } = await params

  const membership = await checkWalletMembership(walletId, session.user.id)
  if (!membership) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const existing = await db.query.tags.findFirst({
    where: and(eq(tags.id, tagId), eq(tags.walletId, walletId)),
  })
  if (!existing) {
    return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
  }

  const body = await request.json()
  const parsed = updateTagSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  // Check uniqueness
  const duplicate = await db.query.tags.findFirst({
    where: and(eq(tags.walletId, walletId), eq(tags.name, parsed.data.name)),
  })
  if (duplicate && duplicate.id !== tagId) {
    return NextResponse.json({ error: 'Tag with this name already exists' }, { status: 409 })
  }

  const [updated] = await db.update(tags)
    .set({ name: parsed.data.name })
    .where(eq(tags.id, tagId))
    .returning()

  return NextResponse.json({ tag: updated })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; tagId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: walletId, tagId } = await params

  const membership = await checkWalletMembership(walletId, session.user.id)
  if (!membership) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const existing = await db.query.tags.findFirst({
    where: and(eq(tags.id, tagId), eq(tags.walletId, walletId)),
  })
  if (!existing) {
    return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
  }

  // Cascade delete handles expense_tags cleanup
  await db.delete(tags).where(eq(tags.id, tagId))

  return NextResponse.json({ success: true })
}
