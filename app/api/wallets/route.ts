import { NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { wallets, walletMembers } from '@/lib/schema'

const createWalletSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 chars or less'),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const memberships = await db.query.walletMembers.findMany({
    where: eq(walletMembers.userId, session.user.id),
    with: {
      wallet: true,
    },
  })

  const userWallets = memberships.map((m) => ({
    id: m.wallet.id,
    name: m.wallet.name,
    type: m.wallet.type,
    role: m.role,
    createdAt: m.wallet.createdAt,
    joinedAt: m.joinedAt,
  }))

  return NextResponse.json({ wallets: userWallets })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = createWalletSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  const [wallet] = await db.insert(wallets).values({
    name: parsed.data.name,
    type: 'shared',
  }).returning()

  await db.insert(walletMembers).values({
    walletId: wallet.id,
    userId: session.user.id,
    role: 'owner',
  })

  return NextResponse.json({
    wallet: {
      id: wallet.id,
      name: wallet.name,
      type: wallet.type,
      role: 'owner' as const,
      createdAt: wallet.createdAt,
    },
  }, { status: 201 })
}
