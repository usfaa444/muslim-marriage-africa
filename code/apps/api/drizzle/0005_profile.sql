CREATE TABLE "profile" (
	"account_id" uuid PRIMARY KEY NOT NULL,
	"dob" date NOT NULL,
	"city" text,
	"country" text,
	"origin" text,
	"marital_status" text,
	"polygamy_intent" text,
	"education" text,
	"profession" text,
	"madhhab" text,
	"practice" text,
	"life_plans" text,
	"bio_live" text,
	"bio_pending" text,
	"visibility" text,
	CONSTRAINT "profile_visibility_check" CHECK ("profile"."visibility" is null or "profile"."visibility" in ('unpublished', 'public', 'held', 'emergency_hidden'))
);
--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account"("id") ON DELETE no action ON UPDATE no action;