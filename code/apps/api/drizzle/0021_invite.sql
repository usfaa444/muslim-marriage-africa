CREATE TABLE "invite" (
	"id" uuid PRIMARY KEY NOT NULL,
	"from_id" uuid NOT NULL,
	"to_id" uuid NOT NULL,
	"state" text NOT NULL,
	"sister_accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "invite_state_check" CHECK ("invite"."state" in ('pending', 'accepted', 'declined')),
	CONSTRAINT "invite_not_self_check" CHECK ("invite"."from_id" <> "invite"."to_id")
);
--> statement-breakpoint
CREATE TABLE "invite_quota" (
	"account_id" uuid NOT NULL,
	"civil_day_ouaga" date NOT NULL,
	"sent_count" integer NOT NULL,
	CONSTRAINT "invite_quota_account_id_civil_day_ouaga_pk" PRIMARY KEY("account_id","civil_day_ouaga"),
	CONSTRAINT "invite_quota_sent_count_check" CHECK ("invite_quota"."sent_count" >= 0)
);
--> statement-breakpoint
ALTER TABLE "invite" ADD CONSTRAINT "invite_from_id_account_id_fk" FOREIGN KEY ("from_id") REFERENCES "public"."account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite" ADD CONSTRAINT "invite_to_id_account_id_fk" FOREIGN KEY ("to_id") REFERENCES "public"."account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite_quota" ADD CONSTRAINT "invite_quota_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "invite_one_pending_per_pair" ON "invite" USING btree ("from_id","to_id") WHERE "invite"."state" = 'pending';--> statement-breakpoint
CREATE INDEX "invite_to_id_id" ON "invite" USING btree ("to_id","id");--> statement-breakpoint
CREATE INDEX "invite_from_id_id" ON "invite" USING btree ("from_id","id");--> statement-breakpoint
-- Fay, 2026-10-23: every Free-tier limit applies the same to Sisters and Brothers; Premium lifts it for both.
-- The default reach mode becomes same_quota_as_brothers. free_unlimited stays a valid value (Story 4.7 switch).
UPDATE "operator_config" SET "value" = 'same_quota_as_brothers' WHERE "key" = 'sister_reach_mode' AND "value" = 'free_unlimited';
