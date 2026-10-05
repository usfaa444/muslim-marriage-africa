CREATE TABLE "sms_dispatch" (
	"id" uuid PRIMARY KEY NOT NULL,
	"account_id" uuid,
	"template" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification_record" (
	"id" uuid PRIMARY KEY NOT NULL,
	"account_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"status" text NOT NULL,
	"vendor" text,
	"evidence_uri" text,
	"phone_e164" text,
	"hash" text,
	"expires_at" timestamp with time zone,
	CONSTRAINT "verification_record_kind_check" CHECK ("verification_record"."kind" in ('phone_otp', 'liveness', 'id_document')),
	CONSTRAINT "verification_record_status_check" CHECK ("verification_record"."status" in ('pending', 'granted', 'rejected', 'held'))
);
--> statement-breakpoint
ALTER TABLE "sms_dispatch" ADD CONSTRAINT "sms_dispatch_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_record" ADD CONSTRAINT "verification_record_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account"("id") ON DELETE no action ON UPDATE no action;