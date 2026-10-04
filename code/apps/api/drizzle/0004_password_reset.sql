CREATE TABLE "password_reset" (
	"id" uuid PRIMARY KEY NOT NULL,
	"account_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"superseded_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "password_reset_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "password_reset" ADD CONSTRAINT "password_reset_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
INSERT INTO "operator_config" ("key", "value") VALUES ('rl_password_reset_per_min', '5');