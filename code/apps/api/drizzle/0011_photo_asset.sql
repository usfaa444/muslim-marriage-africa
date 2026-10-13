CREATE TABLE "photo_asset" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"original_key" text NOT NULL,
	"blur_key" text,
	"moderation_state" text,
	CONSTRAINT "photo_asset_kind_check" CHECK ("photo_asset"."kind" in ('profile_photo', 'chat_photo', 'voice_note')),
	CONSTRAINT "photo_asset_moderation_state_check" CHECK ("photo_asset"."moderation_state" is null or "photo_asset"."moderation_state" in ('pending', 'live', 'blocked'))
);
--> statement-breakpoint
CREATE TABLE "derivative" (
	"id" uuid PRIMARY KEY NOT NULL,
	"photo_asset_id" uuid NOT NULL,
	"size" text NOT NULL,
	"object_key" text NOT NULL,
	CONSTRAINT "derivative_size_check" CHECK ("derivative"."size" in ('xs', 'sm', 'md', 'blur'))
);
--> statement-breakpoint
CREATE TABLE "signed_grant" (
	"id" uuid PRIMARY KEY NOT NULL,
	"photo_asset_id" uuid NOT NULL,
	"viewer_id" uuid NOT NULL,
	"derivative" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "photo_asset" ADD CONSTRAINT "photo_asset_owner_id_account_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "derivative" ADD CONSTRAINT "derivative_photo_asset_id_photo_asset_id_fk" FOREIGN KEY ("photo_asset_id") REFERENCES "public"."photo_asset"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signed_grant" ADD CONSTRAINT "signed_grant_photo_asset_id_photo_asset_id_fk" FOREIGN KEY ("photo_asset_id") REFERENCES "public"."photo_asset"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signed_grant" ADD CONSTRAINT "signed_grant_viewer_id_account_id_fk" FOREIGN KEY ("viewer_id") REFERENCES "public"."account"("id") ON DELETE no action ON UPDATE no action;