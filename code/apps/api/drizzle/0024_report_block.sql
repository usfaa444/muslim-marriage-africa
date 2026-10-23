CREATE TABLE "block" (
	"id" uuid PRIMARY KEY NOT NULL,
	"blocker_id" uuid NOT NULL,
	"blocked_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "block_not_self_check" CHECK ("block"."blocker_id" <> "block"."blocked_id")
);
--> statement-breakpoint
CREATE TABLE "moderation_case" (
	"id" uuid PRIMARY KEY NOT NULL,
	"report_id" uuid,
	"flag_queue_id" uuid,
	"sla_started_at" timestamp with time zone NOT NULL,
	"first_human_at" timestamp with time zone,
	CONSTRAINT "moderation_case_origin_check" CHECK (num_nonnulls("moderation_case"."report_id", "moderation_case"."flag_queue_id") >= 1)
);
--> statement-breakpoint
CREATE TABLE "report" (
	"id" uuid PRIMARY KEY NOT NULL,
	"reporter_id" uuid NOT NULL,
	"target_kind" text NOT NULL,
	"target_id" uuid NOT NULL,
	"reported_account_id" uuid NOT NULL,
	"conversation_id" uuid,
	"reason" text NOT NULL,
	"details" text,
	"sla_started_at" timestamp with time zone NOT NULL,
	"first_human_at" timestamp with time zone,
	CONSTRAINT "report_target_kind_check" CHECK ("report"."target_kind" in ('profile', 'message')),
	CONSTRAINT "report_reason_check" CHECK ("report"."reason" in ('indecency', 'sexual_content', 'impersonation', 'multiple_accounts', 'harassment', 'money_scam', 'hateful', 'non_matrimonial', 'misrepresented_marital_status')),
	CONSTRAINT "report_target_shape_check" CHECK (("report"."target_kind" = 'profile' and "report"."target_id" = "report"."reported_account_id" and "report"."conversation_id" is null) or ("report"."target_kind" = 'message' and "report"."conversation_id" is not null)),
	CONSTRAINT "report_not_self_check" CHECK ("report"."reporter_id" <> "report"."reported_account_id"),
	CONSTRAINT "report_details_length_check" CHECK ("report"."details" is null or char_length("report"."details") <= 1000)
);
--> statement-breakpoint
ALTER TABLE "block" ADD CONSTRAINT "block_blocker_id_account_id_fk" FOREIGN KEY ("blocker_id") REFERENCES "public"."account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "block" ADD CONSTRAINT "block_blocked_id_account_id_fk" FOREIGN KEY ("blocked_id") REFERENCES "public"."account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_case" ADD CONSTRAINT "moderation_case_report_id_report_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."report"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_reporter_id_account_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_reported_account_id_account_id_fk" FOREIGN KEY ("reported_account_id") REFERENCES "public"."account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "block_one_per_pair" ON "block" USING btree ("blocker_id","blocked_id");--> statement-breakpoint
CREATE INDEX "block_blocked_id_idx" ON "block" USING btree ("blocked_id");--> statement-breakpoint
CREATE UNIQUE INDEX "moderation_case_one_per_report" ON "moderation_case" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX "moderation_case_open_idx" ON "moderation_case" USING btree ("sla_started_at") WHERE "moderation_case"."first_human_at" is null;--> statement-breakpoint
CREATE INDEX "report_reporter_id_idx" ON "report" USING btree ("reporter_id","id");