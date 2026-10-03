CREATE TABLE "operator_config" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	CONSTRAINT "operator_config_sister_reach_mode_check" CHECK ("operator_config"."key" <> 'sister_reach_mode' OR "operator_config"."value" IN ('free_unlimited', 'same_quota_as_brothers'))
);
--> statement-breakpoint
INSERT INTO "operator_config" ("key", "value") VALUES
	('flag_threshold', '3'),
	('pack_prices_xof', '1=4900,3=14700,6=29400'),
	('rl_auth_per_min', '10'),
	('rl_otp_per_hour', '5'),
	('rl_invite_per_day', '30'),
	('rl_report_per_hour', '10'),
	('rl_pay_per_min', '5'),
	('rl_browse_per_min', '60'),
	('brother_invite_quota_premium', 'unlimited'),
	('min_age', '19'),
	('brother_invite_quota_free', '3'),
	('daily_message_cap', '10'),
	('free_review_sla_hours', '24'),
	('report_sla_hours', '24'),
	('photo_strike_count', '3'),
	('photo_strike_block_hours', '24'),
	('signed_url_ttl_seconds', '60'),
	('sister_reach_mode', 'free_unlimited');
