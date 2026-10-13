CREATE TABLE "strike" (
	"id" uuid PRIMARY KEY NOT NULL,
	"account_id" uuid NOT NULL,
	"case_id" uuid,
	"ladder" text NOT NULL,
	"evidence" text
);
--> statement-breakpoint
ALTER TABLE "strike" ADD CONSTRAINT "strike_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "strike_account_ladder_id" ON "strike" USING btree ("account_id","ladder","id");--> statement-breakpoint
CREATE UNIQUE INDEX "strike_photo_floor_evidence" ON "strike" USING btree ("evidence") WHERE "strike"."ladder" = 'photo_floor';