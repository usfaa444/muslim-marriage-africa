CREATE TABLE "discovery_exclusion" (
	"viewer_id" uuid NOT NULL,
	"target_id" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "discovery_exclusion_viewer_id_target_id_pk" PRIMARY KEY("viewer_id","target_id")
);
--> statement-breakpoint
ALTER TABLE "discovery_exclusion" ADD CONSTRAINT "discovery_exclusion_viewer_id_account_id_fk" FOREIGN KEY ("viewer_id") REFERENCES "public"."account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_exclusion" ADD CONSTRAINT "discovery_exclusion_target_id_account_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."account"("id") ON DELETE no action ON UPDATE no action;
