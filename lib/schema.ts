import {
  pgTable,
  text,
  timestamp,
  integer,
  decimal,
  varchar,
  date,
  uniqueIndex,
  index,
  primaryKey,
  pgEnum,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ─── Enums ───

export const walletTypeEnum = pgEnum('wallet_type', ['personal', 'shared'])
export const walletRoleEnum = pgEnum('wallet_role', ['owner', 'member'])

// ─── Auth.js models ───

export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('emailVerified', { precision: 3, mode: 'date' }),
  name: text('name'),
  image: text('image'),
  passwordHash: text('passwordHash'),
  language: varchar('language', { length: 5 }).notNull().default('pl'),
  currency: varchar('currency', { length: 5 }).notNull().default('PLN'),
  createdAt: timestamp('createdAt', { precision: 3, mode: 'date' }).notNull().defaultNow(),
})

export const accounts = pgTable('accounts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('providerAccountId').notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: text('token_type'),
  scope: text('scope'),
  id_token: text('id_token'),
  session_state: text('session_state'),
}, (table) => [
  uniqueIndex('accounts_provider_providerAccountId_key').on(table.provider, table.providerAccountId),
])

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  sessionToken: text('sessionToken').notNull().unique(),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { precision: 3, mode: 'date' }).notNull(),
})

export const verificationTokens = pgTable('verification_tokens', {
  identifier: text('identifier').notNull(),
  token: text('token').notNull().unique(),
  expires: timestamp('expires', { precision: 3, mode: 'date' }).notNull(),
}, (table) => [
  primaryKey({ columns: [table.identifier, table.token] }),
])

// ─── App models ───

export const wallets = pgTable('wallets', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: varchar('name', { length: 100 }).notNull(),
  type: walletTypeEnum('type').notNull().default('personal'),
  createdAt: timestamp('createdAt', { precision: 3, mode: 'date' }).notNull().defaultNow(),
})

export const walletMembers = pgTable('wallet_members', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  walletId: text('walletId').notNull().references(() => wallets.id, { onDelete: 'cascade' }),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: walletRoleEnum('role').notNull().default('member'),
  joinedAt: timestamp('joinedAt', { precision: 3, mode: 'date' }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('wallet_members_walletId_userId_key').on(table.walletId, table.userId),
])

export const expenses = pgTable('expenses', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  walletId: text('walletId').references(() => wallets.id, { onDelete: 'cascade' }),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  category: varchar('category', { length: 50 }).notNull(),
  description: text('description'),
  date: date('date', { mode: 'date' }).notNull(),
  createdAt: timestamp('createdAt', { precision: 3, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { precision: 3, mode: 'date' }).$onUpdate(() => new Date()),
}, (table) => [
  index('expenses_userId_idx').on(table.userId),
  index('expenses_walletId_idx').on(table.walletId),
  index('expenses_date_idx').on(table.date),
])

// ─── Relations ───

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  expenses: many(expenses),
  walletMemberships: many(walletMembers),
}))

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}))

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}))

export const walletsRelations = relations(wallets, ({ many }) => ({
  members: many(walletMembers),
  expenses: many(expenses),
}))

export const walletMembersRelations = relations(walletMembers, ({ one }) => ({
  wallet: one(wallets, { fields: [walletMembers.walletId], references: [wallets.id] }),
  user: one(users, { fields: [walletMembers.userId], references: [users.id] }),
}))

export const expensesRelations = relations(expenses, ({ one }) => ({
  user: one(users, { fields: [expenses.userId], references: [users.id] }),
  wallet: one(wallets, { fields: [expenses.walletId], references: [wallets.id] }),
}))
