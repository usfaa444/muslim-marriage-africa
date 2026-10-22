CREATE TABLE "staff_credential" (
	"account_id" uuid PRIMARY KEY NOT NULL,
	"must_change_password" boolean NOT NULL,
	"totp_sealed" text,
	"totp_pending_sealed" text,
	"totp_enrolled_at" timestamp with time zone,
	"totp_last_step" bigint,
	"failed_codes" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" DROP CONSTRAINT "account_gender_check";--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "mfa_state" text;--> statement-breakpoint
ALTER TABLE "staff_credential" ADD CONSTRAINT "staff_credential_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_gender_check" CHECK ("account"."gender" in ('sister', 'brother') or ("account"."gender" = 'none' and cardinality("account"."roles") > 0 and "account"."roles" <@ ARRAY['moderator', 'operator']::text[]));--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_mfa_state_check" CHECK (("session"."kind" = 'staff' and "session"."mfa_state" is not null and "session"."mfa_state" in ('password_change', 'enroll', 'verify', 'done')) or ("session"."kind" <> 'staff' and "session"."mfa_state" is null));