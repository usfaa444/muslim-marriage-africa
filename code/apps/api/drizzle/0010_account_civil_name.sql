ALTER TABLE "account" ADD COLUMN "civil_given_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "account" ADD COLUMN "civil_family_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "civil_given_name" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "civil_family_name" DROP DEFAULT;
