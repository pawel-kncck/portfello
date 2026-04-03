import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { walletMembers } from '@/lib/schema'

export async function checkWalletMembership(walletId: string, userId: string) {
  return db.query.walletMembers.findFirst({
    where: and(
      eq(walletMembers.walletId, walletId),
      eq(walletMembers.userId, userId),
    ),
  })
}
