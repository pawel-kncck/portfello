import { NextResponse } from 'next/server'
import { eq, and } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { walletMembers } from '@/lib/schema'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id, userId } = await params

  // Check caller is owner
  const callerMembership = await db.query.walletMembers.findFirst({
    where: and(
      eq(walletMembers.walletId, id),
      eq(walletMembers.userId, session.user.id),
    ),
  })
  if (!callerMembership) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (callerMembership.role !== 'owner') {
    return NextResponse.json({ error: 'Only the owner can remove members' }, { status: 403 })
  }

  // Cannot remove the owner
  if (userId === session.user.id) {
    return NextResponse.json({ error: 'Cannot remove yourself as owner' }, { status: 400 })
  }

  // Check target is a member
  const targetMembership = await db.query.walletMembers.findFirst({
    where: and(
      eq(walletMembers.walletId, id),
      eq(walletMembers.userId, userId),
    ),
  })
  if (!targetMembership) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }

  await db.delete(walletMembers).where(eq(walletMembers.id, targetMembership.id))

  return NextResponse.json({ success: true })
}
