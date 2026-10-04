CREATE TABLE "account" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"pseudonym" text NOT NULL,
	"gender" text NOT NULL,
	"roles" text[] NOT NULL,
	"status" text NOT NULL,
	"age_attested" boolean NOT NULL,
	"coc_version" text NOT NULL,
	CONSTRAINT "account_email_unique" UNIQUE("email"),
	CONSTRAINT "account_pseudonym_unique" UNIQUE("pseudonym"),
	CONSTRAINT "account_gender_check" CHECK ("account"."gender" in ('sister', 'brother')),
	CONSTRAINT "account_status_check" CHECK ("account"."status" in ('Active', 'deactivated', 'held'))
);
--> statement-breakpoint
CREATE TABLE "credential" (
	"id" uuid PRIMARY KEY NOT NULL,
	"account_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"secret_hash" text,
	"provider_subject" text,
	"email_verified_at" timestamp with time zone,
	CONSTRAINT "credential_kind_check" CHECK ("credential"."kind" in ('password', 'google_oidc', 'apple'))
);
--> statement-breakpoint
ALTER TABLE "credential" ADD CONSTRAINT "credential_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account"("id") ON DELETE no action ON UPDATE no action;