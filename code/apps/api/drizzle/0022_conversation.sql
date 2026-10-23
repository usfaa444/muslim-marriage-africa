CREATE TABLE "conversation" (
	"id" uuid PRIMARY KEY NOT NULL,
	"invite_id" uuid NOT NULL,
	"stage" text NOT NULL,
	"paused_by" uuid,
	"ended_at" timestamp with time zone,
	"flash_id" uuid,
	CONSTRAINT "conversation_stage_check" CHECK ("conversation"."stage" in ('invite', 'chat', 'meeting', 'married'))
);
--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_invite_id_invite_id_fk" FOREIGN KEY ("invite_id") REFERENCES "public"."invite"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_paused_by_account_id_fk" FOREIGN KEY ("paused_by") REFERENCES "public"."account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_one_per_invite" ON "conversation" USING btree ("invite_id");