import { NextResponse } from 'next/server'
import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { wallets, walletMembers, users } from '@/lib/schema'

const inviteMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export async function GET(
  _request: Request,
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

  const members = await db.query.walletMembers.findMany({
    where: eq(walletMembers.walletId, id),
    with: {
      user: true,
    },
  })

  return NextResponse.json({
    members: members.map((m) => ({
      id: m.id,
      userId: m.userId,
      role: m.role,
      joinedAt: m.joinedAt,
      name: m.user.name,
      email: m.user.email,
    })),
  })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  // Only owner can invite
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
    return NextResponse.json({ error: 'Only the owner can invite members' }, { status: 403 })
  }

  // Cannot invite to personal wallet
  const wallet = await db.query.wallets.findFirst({
    where: eq(wallets.id, id),
  })
  if (wallet?.type === 'personal') {
    return NextResponse.json({ error: 'Cannot invite members to a personal wallet' }, { status: 400 })
  }

  const body = await request.json()
  const parsed = inviteMemberSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  // Find user by email
  const invitee = await db.query.users.findFirst({
    where: eq(users.email, parsed.data.email),
  })
  if (!invitee) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Check if already a member
  const existing = await db.query.walletMembers.findFirst({
    where: and(
      eq(walletMembers.walletId, id),
      eq(walletMembers.userId, invitee.id),
    ),
  })
  if (existing) {
    return NextResponse.json({ error: 'User is already a member' }, { status: 409 })
  }

  const [member] = await db.insert(walletMembers).values({
    walletId: id,
    userId: invitee.id,
    role: 'member',
  }).returning()

  return NextResponse.json({
    member: {
      id: member.id,
      userId: member.userId,
      role: member.role,
      joinedAt: member.joinedAt,
      name: invitee.name,
      email: invitee.email,
    },
  }, { status: 201 })
}
