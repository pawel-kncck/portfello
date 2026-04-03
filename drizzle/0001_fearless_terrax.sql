ALTER TABLE "users" ADD COLUMN "language" varchar(5) DEFAULT 'pl' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "currency" varchar(5) DEFAULT 'PLN' NOT NULL;