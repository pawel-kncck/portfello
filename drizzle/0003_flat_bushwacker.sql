CREATE TABLE "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"walletId" text NOT NULL,
	"parentId" text,
	"name" varchar(100) NOT NULL,
	"color" varchar(7) DEFAULT '#6B7280' NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expense_tags" (
	"expenseId" text NOT NULL,
	"tagId" text NOT NULL,
	CONSTRAINT "expense_tags_expenseId_tagId_pk" PRIMARY KEY("expenseId","tagId")
);
--> statement-breakpoint
CREATE TABLE "rules" (
	"id" text PRIMARY KEY NOT NULL,
	"walletId" text NOT NULL,
	"name" varchar(200) NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"conditions" jsonb NOT NULL,
	"actions" jsonb NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"createdById" text NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" text PRIMARY KEY NOT NULL,
	"walletId" text NOT NULL,
	"name" varchar(50) NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_walletId_wallets_id_fk" FOREIGN KEY ("walletId") REFERENCES "public"."wallets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_tags" ADD CONSTRAINT "expense_tags_expenseId_expenses_id_fk" FOREIGN KEY ("expenseId") REFERENCES "public"."expenses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_tags" ADD CONSTRAINT "expense_tags_tagId_tags_id_fk" FOREIGN KEY ("tagId") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rules" ADD CONSTRAINT "rules_walletId_wallets_id_fk" FOREIGN KEY ("walletId") REFERENCES "public"."wallets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rules" ADD CONSTRAINT "rules_createdById_users_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_walletId_wallets_id_fk" FOREIGN KEY ("walletId") REFERENCES "public"."wallets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "categories_walletId_parentId_name_key" ON "categories" USING btree ("walletId","parentId","name");--> statement-breakpoint
CREATE INDEX "categories_walletId_idx" ON "categories" USING btree ("walletId");--> statement-breakpoint
CREATE INDEX "rules_walletId_idx" ON "rules" USING btree ("walletId");--> statement-breakpoint
CREATE INDEX "rules_walletId_priority_idx" ON "rules" USING btree ("walletId","priority");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_walletId_name_key" ON "tags" USING btree ("walletId","name");--> statement-breakpoint
CREATE INDEX "tags_walletId_idx" ON "tags" USING btree ("walletId");