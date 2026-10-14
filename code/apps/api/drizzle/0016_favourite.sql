CREATE TABLE "favourite" (
	"account_id" uuid NOT NULL,
	"target_id" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "favourite_account_id_target_id_pk" PRIMARY KEY("account_id","target_id")
);
--> statement-breakpoint
ALTER TABLE "favourite" ADD CONSTRAINT "favourite_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favourite" ADD CONSTRAINT "favourite_target_id_account_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."account"("id") ON DELETE no action ON UPDATE no action;