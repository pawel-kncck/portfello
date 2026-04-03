CREATE TYPE "public"."wallet_role" AS ENUM('owner', 'member');--> statement-breakpoint
CREATE TYPE "public"."wallet_type" AS ENUM('personal', 'shared');--> statement-breakpoint
CREATE TABLE "wallet_members" (
	"id" text PRIMARY KEY NOT NULL,
	"walletId" text NOT NULL,
	"userId" text NOT NULL,
	"role" "wallet_role" DEFAULT 'member' NOT NULL,
	"joinedAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"type" "wallet_type" DEFAULT 'personal' NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "walletId" text;--> statement-breakpoint
ALTER TABLE "wallet_members" ADD CONSTRAINT "wallet_members_walletId_wallets_id_fk" FOREIGN KEY ("walletId") REFERENCES "public"."wallets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_members" ADD CONSTRAINT "wallet_members_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_members_walletId_userId_key" ON "wallet_members" USING btree ("walletId","userId");--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_walletId_wallets_id_fk" FOREIGN KEY ("walletId") REFERENCES "public"."wallets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "expenses_walletId_idx" ON "expenses" USING btree ("walletId");