CREATE TABLE "audit_event" (
	"id" uuid PRIMARY KEY NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"payload" jsonb NOT NULL,
	"prev_hash" text NOT NULL,
	"hash" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cil_ticket" (
	"id" uuid PRIMARY KEY NOT NULL,
	"subject_account_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"status" text NOT NULL,
	CONSTRAINT "cil_ticket_kind_check" CHECK ("cil_ticket"."kind" in ('export', 'erase', 'access')),
	CONSTRAINT "cil_ticket_status_check" CHECK ("cil_ticket"."status" in ('ready', 'scheduled', 'stalled', 'completed'))
);
--> statement-breakpoint
ALTER TABLE "account" DROP CONSTRAINT "account_status_check";--> statement-breakpoint
ALTER TABLE "audit_event" ADD CONSTRAINT "audit_event_actor_id_account_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cil_ticket" ADD CONSTRAINT "cil_ticket_subject_account_id_account_id_fk" FOREIGN KEY ("subject_account_id") REFERENCES "public"."account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cil_ticket_open_subject_kind" ON "cil_ticket" USING btree ("subject_account_id","kind") WHERE "cil_ticket"."status" in ('ready', 'scheduled');--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_status_check" CHECK ("account"."status" in ('Active', 'deactivated', 'held', 'pending_deletion'));--> statement-breakpoint
CREATE OR REPLACE FUNCTION "audit_event_reject_mutation"() RETURNS trigger AS $$
BEGIN
	RAISE EXCEPTION 'audit_event is append-only';
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER "audit_event_append_only" BEFORE UPDATE OR DELETE ON "audit_event" FOR EACH ROW EXECUTE FUNCTION "audit_event_reject_mutation"();