ALTER TABLE "profile" ADD COLUMN "photo_blur" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "photo_asset" ADD COLUMN "is_main" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
UPDATE "photo_asset" SET "is_main" = true WHERE "kind" = 'profile_photo' AND "moderation_state" = 'live';
--> statement-breakpoint
ALTER TABLE "photo_asset" ADD CONSTRAINT "photo_asset_is_main_check" CHECK (not "photo_asset"."is_main" or ("photo_asset"."kind" = 'profile_photo' and "photo_asset"."moderation_state" = 'live'));
--> statement-breakpoint
DROP INDEX "photo_asset_one_live_profile_photo";
--> statement-breakpoint
CREATE UNIQUE INDEX "photo_asset_one_main_profile_photo" ON "photo_asset" USING btree ("owner_id") WHERE "photo_asset"."kind" = 'profile_photo' and "photo_asset"."moderation_state" = 'live' and "photo_asset"."is_main";
