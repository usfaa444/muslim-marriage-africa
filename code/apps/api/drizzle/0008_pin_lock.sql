CREATE TABLE "pin_lock" (
	"id" uuid PRIMARY KEY NOT NULL,
	"account_id" uuid NOT NULL,
	"pin_hash" text NOT NULL,
	CONSTRAINT "pin_lock_account_id_unique" UNIQUE("account_id")
);
--> statement-breakpoint
ALTER TABLE "pin_lock" ADD CONSTRAINT "pin_lock_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account"("id") ON DELETE no action ON UPDATE no action;
