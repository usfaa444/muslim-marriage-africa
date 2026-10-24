CREATE TABLE "chat_presence" (
	"account_id" uuid PRIMARY KEY NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"last_seen_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat_presence" ADD CONSTRAINT "chat_presence_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account"("id") ON DELETE no action ON UPDATE no action;