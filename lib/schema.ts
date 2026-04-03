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
  boolean,
  jsonb,
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

// ─── Categories ───

export const categories = pgTable('categories', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  walletId: text('walletId').notNull().references(() => wallets.id, { onDelete: 'cascade' }),
  parentId: text('parentId'),
  name: varchar('name', { length: 100 }).notNull(),
  color: varchar('color', { length: 7 }).notNull().default('#6B7280'),
  sortOrder: integer('sortOrder').notNull().default(0),
  createdAt: timestamp('createdAt', { precision: 3, mode: 'date' }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('categories_walletId_parentId_name_key').on(table.walletId, table.parentId, table.name),
  index('categories_walletId_idx').on(table.walletId),
])

// ─── Tags ───

export const tags = pgTable('tags', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  walletId: text('walletId').notNull().references(() => wallets.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 50 }).notNull(),
  createdAt: timestamp('createdAt', { precision: 3, mode: 'date' }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('tags_walletId_name_key').on(table.walletId, table.name),
  index('tags_walletId_idx').on(table.walletId),
])

// ─── Expense Tags (join table) ───

export const expenseTags = pgTable('expense_tags', {
  expenseId: text('expenseId').notNull().references(() => expenses.id, { onDelete: 'cascade' }),
  tagId: text('tagId').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (table) => [
  primaryKey({ columns: [table.expenseId, table.tagId] }),
])

// ─── Categorization Rules ───

export const rules = pgTable('rules', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  walletId: text('walletId').notNull().references(() => wallets.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 200 }).notNull(),
  priority: integer('priority').notNull().default(0),
  conditions: jsonb('conditions').notNull().$type<Record<string, unknown>>(),
  actions: jsonb('actions').notNull().$type<Record<string, unknown>>(),
  enabled: boolean('enabled').notNull().default(true),
  createdById: text('createdById').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('createdAt', { precision: 3, mode: 'date' }).notNull().defaultNow(),
}, (table) => [
  index('rules_walletId_idx').on(table.walletId),
  index('rules_walletId_priority_idx').on(table.walletId, table.priority),
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
  categories: many(categories),
  tags: many(tags),
  rules: many(rules),
}))

export const walletMembersRelations = relations(walletMembers, ({ one }) => ({
  wallet: one(wallets, { fields: [walletMembers.walletId], references: [wallets.id] }),
  user: one(users, { fields: [walletMembers.userId], references: [users.id] }),
}))

export const expensesRelations = relations(expenses, ({ one, many }) => ({
  user: one(users, { fields: [expenses.userId], references: [users.id] }),
  wallet: one(wallets, { fields: [expenses.walletId], references: [wallets.id] }),
  expenseTags: many(expenseTags),
}))

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  wallet: one(wallets, { fields: [categories.walletId], references: [wallets.id] }),
  parent: one(categories, { fields: [categories.parentId], references: [categories.id], relationName: 'parentChild' }),
  children: many(categories, { relationName: 'parentChild' }),
}))

export const tagsRelations = relations(tags, ({ one, many }) => ({
  wallet: one(wallets, { fields: [tags.walletId], references: [wallets.id] }),
  expenseTags: many(expenseTags),
}))

export const expenseTagsRelations = relations(expenseTags, ({ one }) => ({
  expense: one(expenses, { fields: [expenseTags.expenseId], references: [expenses.id] }),
  tag: one(tags, { fields: [expenseTags.tagId], references: [tags.id] }),
}))

export const rulesRelations = relations(rules, ({ one }) => ({
  wallet: one(wallets, { fields: [rules.walletId], references: [wallets.id] }),
  createdBy: one(users, { fields: [rules.createdById], references: [users.id] }),
}))
