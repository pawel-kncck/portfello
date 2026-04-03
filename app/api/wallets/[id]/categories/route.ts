import { NextResponse } from 'next/server'
import { z } from 'zod'
import { eq, and, asc, isNull } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { categories } from '@/lib/schema'
import { checkWalletMembership } from '@/lib/wallet/membership'

const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  parentId: z.string().nullable().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color').optional(),
  sortOrder: z.number().int().min(0).optional(),
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

  const allCategories = await db.query.categories.findMany({
    where: eq(categories.walletId, walletId),
    orderBy: [asc(categories.sortOrder), asc(categories.name)],
  })

  // Build tree structure
  type CategoryNode = typeof allCategories[number] & { children: CategoryNode[] }
  const map = new Map<string, CategoryNode>()
  const roots: CategoryNode[] = []

  for (const cat of allCategories) {
    map.set(cat.id, { ...cat, children: [] })
  }

  for (const cat of allCategories) {
    const node = map.get(cat.id)!
    if (cat.parentId && map.has(cat.parentId)) {
      map.get(cat.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  return NextResponse.json({ categories: roots, flat: allCategories })
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
  const parsed = createCategorySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  const parentId = parsed.data.parentId || null

  // Verify parent belongs to same wallet if provided
  if (parentId) {
    const parent = await db.query.categories.findFirst({
      where: and(
        eq(categories.id, parentId),
        eq(categories.walletId, walletId),
      ),
    })
    if (!parent) {
      return NextResponse.json({ error: 'Parent category not found' }, { status: 400 })
    }
  }

  // Check uniqueness (walletId + parentId + name)
  const existing = await db.query.categories.findFirst({
    where: and(
      eq(categories.walletId, walletId),
      eq(categories.name, parsed.data.name),
      parentId ? eq(categories.parentId, parentId) : isNull(categories.parentId),
    ),
  })
  if (existing) {
    return NextResponse.json({ error: 'Category with this name already exists at this level' }, { status: 409 })
  }

  const [category] = await db.insert(categories).values({
    walletId,
    parentId,
    name: parsed.data.name,
    color: parsed.data.color || '#6B7280',
    sortOrder: parsed.data.sortOrder ?? 0,
  }).returning()

  return NextResponse.json({ category }, { status: 201 })
}
