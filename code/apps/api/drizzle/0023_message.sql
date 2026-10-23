CREATE TABLE "message" (
	"id" uuid PRIMARY KEY NOT NULL,
	"conversation_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"state" text NOT NULL,
	"body" jsonb NOT NULL,
	"media_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "message_kind_check" CHECK ("message"."kind" in ('text', 'photo', 'voice')),
	CONSTRAINT "message_state_check" CHECK ("message"."state" = 'delivered')
);
--> statement-breakpoint
CREATE TABLE "moderation_job" (
	"id" uuid PRIMARY KEY NOT NULL,
	"message_id" uuid,
	"asset_id" uuid,
	"flash_id" uuid,
	"scores" jsonb,
	"outcome" text,
	"vendor" text,
	"latency_ms" integer,
	CONSTRAINT "moderation_job_outcome_check" CHECK ("moderation_job"."outcome" is null or "moderation_job"."outcome" in ('flag-for-admin', 'clean', 'scan-deferred', 'scan-failed')),
	CONSTRAINT "moderation_job_one_item_check" CHECK (num_nonnulls("moderation_job"."message_id", "moderation_job"."asset_id", "moderation_job"."flash_id") = 1)
);
--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_sender_id_account_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "message_conversation_id_idx" ON "message" USING btree ("conversation_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "moderation_job_one_per_message" ON "moderation_job" USING btree ("message_id");