CREATE TABLE "liveness_challenge" (
	"account_id" uuid PRIMARY KEY NOT NULL,
	"id" uuid NOT NULL,
	"pose" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "liveness_challenge_id_unique" UNIQUE("id"),
	CONSTRAINT "liveness_challenge_pose_check" CHECK ("liveness_challenge"."pose" in ('raise_right_hand', 'touch_left_ear', 'look_left', 'hand_on_chin', 'thumbs_up', 'two_fingers'))
);
--> statement-breakpoint
ALTER TABLE "verification_record" ADD COLUMN "pose" text;--> statement-breakpoint
ALTER TABLE "verification_record" ADD COLUMN "decision_reason" text;--> statement-breakpoint
ALTER TABLE "verification_record" ADD COLUMN "decision_note" text;--> statement-breakpoint
ALTER TABLE "verification_record" ADD COLUMN "decided_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "verification_record" ADD COLUMN "decided_by" uuid;--> statement-breakpoint
ALTER TABLE "liveness_challenge" ADD CONSTRAINT "liveness_challenge_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_record" ADD CONSTRAINT "verification_record_decided_by_account_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "verification_record_account_kind_id" ON "verification_record" USING btree ("account_id","kind","id");--> statement-breakpoint
ALTER TABLE "verification_record" ADD CONSTRAINT "verification_record_pose_check" CHECK ("verification_record"."pose" is null or ("verification_record"."kind" = 'liveness' and "verification_record"."pose" in ('raise_right_hand', 'touch_left_ear', 'look_left', 'hand_on_chin', 'thumbs_up', 'two_fingers')));