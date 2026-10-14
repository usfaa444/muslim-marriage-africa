CREATE TABLE "profile_visit" (
	"account_id" uuid NOT NULL,
	"target_id" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "profile_visit_account_id_target_id_created_at_pk" PRIMARY KEY("account_id","target_id","created_at")
);
--> statement-breakpoint
ALTER TABLE "profile_visit" ADD CONSTRAINT "profile_visit_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_visit" ADD CONSTRAINT "profile_visit_target_id_account_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "profile_visit_account_id_created_at" ON "profile_visit" USING btree ("account_id","created_at");