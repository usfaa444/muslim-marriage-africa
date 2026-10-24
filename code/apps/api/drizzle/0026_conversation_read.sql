CREATE TABLE "conversation_read" (
	"conversation_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"last_read_message_id" uuid NOT NULL,
	"read_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_read_conversation_id_account_id_pk" PRIMARY KEY("conversation_id","account_id")
);
--> statement-breakpoint
ALTER TABLE "conversation_read" ADD CONSTRAINT "conversation_read_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_read" ADD CONSTRAINT "conversation_read_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_read" ADD CONSTRAINT "conversation_read_last_read_message_id_message_id_fk" FOREIGN KEY ("last_read_message_id") REFERENCES "public"."message"("id") ON DELETE no action ON UPDATE no action;