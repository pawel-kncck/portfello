import { NextResponse } from 'next/server'
import { z } from 'zod'
import { eq, and, isNull } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { categories } from '@/lib/schema'
import { checkWalletMembership } from '@/lib/wallet/membership'

const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  parentId: z.string().nullable().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color').optional(),
  sortOrder: z.number().int().min(0).optional(),
})

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; catId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: walletId, catId } = await params

  const membership = await checkWalletMembership(walletId, session.user.id)
  if (!membership) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const existing = await db.query.categories.findFirst({
    where: and(eq(categories.id, catId), eq(categories.walletId, walletId)),
  })
  if (!existing) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 })
  }

  const body = await request.json()
  const parsed = updateCategorySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}

  if (parsed.data.name !== undefined) updates.name = parsed.data.name
  if (parsed.data.color !== undefined) updates.color = parsed.data.color
  if (parsed.data.sortOrder !== undefined) updates.sortOrder = parsed.data.sortOrder

  if (parsed.data.parentId !== undefined) {
    const newParentId = parsed.data.parentId

    // Prevent setting self as parent
    if (newParentId === catId) {
      return NextResponse.json({ error: 'Category cannot be its own parent' }, { status: 400 })
    }

    // Verify parent belongs to same wallet
    if (newParentId) {
      const parent = await db.query.categories.findFirst({
        where: and(eq(categories.id, newParentId), eq(categories.walletId, walletId)),
      })
      if (!parent) {
        return NextResponse.json({ error: 'Parent category not found' }, { status: 400 })
      }
    }

    updates.parentId = newParentId
  }

  // Check name uniqueness at the new level if name or parentId changed
  const finalName = (updates.name as string) ?? existing.name
  const finalParentId = updates.parentId !== undefined ? (updates.parentId as string | null) : existing.parentId

  if (updates.name !== undefined || updates.parentId !== undefined) {
    const duplicate = await db.query.categories.findFirst({
      where: and(
        eq(categories.walletId, walletId),
        eq(categories.name, finalName),
        finalParentId ? eq(categories.parentId, finalParentId) : isNull(categories.parentId),
      ),
    })
    if (duplicate && duplicate.id !== catId) {
      return NextResponse.json({ error: 'Category with this name already exists at this level' }, { status: 409 })
    }
  }

  const [updated] = await db.update(categories)
    .set(updates)
    .where(eq(categories.id, catId))
    .returning()

  return NextResponse.json({ category: updated })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; catId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: walletId, catId } = await params

  const membership = await checkWalletMembership(walletId, session.user.id)
  if (!membership) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const existing = await db.query.categories.findFirst({
    where: and(eq(categories.id, catId), eq(categories.walletId, walletId)),
  })
  if (!existing) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 })
  }

  // Check if category has children
  const children = await db.query.categories.findFirst({
    where: and(eq(categories.parentId, catId), eq(categories.walletId, walletId)),
  })

  // Get optional reassignCategoryId from query string
  const url = new URL(request.url)
  const reassignTo = url.searchParams.get('reassignTo')

  if (children && !reassignTo) {
    return NextResponse.json(
      { error: 'Category has children. Provide reassignTo parameter to reparent them.' },
      { status: 400 }
    )
  }

  // Reparent children if needed
  if (children && reassignTo) {
    await db.update(categories)
      .set({ parentId: reassignTo === 'root' ? null : reassignTo })
      .where(and(eq(categories.parentId, catId), eq(categories.walletId, walletId)))
  }

  await db.delete(categories).where(eq(categories.id, catId))

  return NextResponse.json({ success: true })
}
