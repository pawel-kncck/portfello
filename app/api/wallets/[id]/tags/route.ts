import { NextResponse } from 'next/server'
import { z } from 'zod'
import { eq, and, asc } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { tags } from '@/lib/schema'
import { checkWalletMembership } from '@/lib/wallet/membership'

const createTagSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50),
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

  const walletTags = await db.query.tags.findMany({
    where: eq(tags.walletId, walletId),
    orderBy: [asc(tags.name)],
  })

  return NextResponse.json({ tags: walletTags })
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
  const parsed = createTagSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  // Check uniqueness
  const existing = await db.query.tags.findFirst({
    where: and(eq(tags.walletId, walletId), eq(tags.name, parsed.data.name)),
  })
  if (existing) {
    return NextResponse.json({ error: 'Tag with this name already exists' }, { status: 409 })
  }

  const [tag] = await db.insert(tags).values({
    walletId,
    name: parsed.data.name,
  }).returning()

  return NextResponse.json({ tag }, { status: 201 })
}
