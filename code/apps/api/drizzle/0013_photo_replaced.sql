ALTER TABLE "photo_asset" DROP CONSTRAINT "photo_asset_moderation_state_check";
--> statement-breakpoint
ALTER TABLE "photo_asset" ADD CONSTRAINT "photo_asset_moderation_state_check" CHECK ("photo_asset"."moderation_state" is null or "photo_asset"."moderation_state" in ('pending', 'live', 'blocked', 'replaced'));
--> statement-breakpoint
UPDATE "photo_asset" AS older
SET "moderation_state" = 'replaced'
WHERE older."kind" = 'profile_photo'
  AND older."moderation_state" = 'live'
  AND older."id" <> (
    SELECT newest."id"
    FROM "photo_asset" AS newest
    WHERE newest."owner_id" = older."owner_id"
      AND newest."kind" = 'profile_photo'
      AND newest."moderation_state" = 'live'
    ORDER BY newest."id" DESC
    LIMIT 1
  );
--> statement-breakpoint
CREATE UNIQUE INDEX "photo_asset_one_live_profile_photo" ON "photo_asset" USING btree ("owner_id") WHERE "photo_asset"."kind" = 'profile_photo' AND "photo_asset"."moderation_state" = 'live';
