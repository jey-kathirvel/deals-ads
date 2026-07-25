CREATE TABLE `coupons` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_fingerprint` text NOT NULL,
	`platform` text NOT NULL,
	`merchant_name` text NOT NULL,
	`category_id` integer,
	`title` text NOT NULL,
	`description` text,
	`coupon_code` text,
	`image_url` text,
	`original_url` text NOT NULL,
	`normalized_url` text NOT NULL,
	`redirect_url` text NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`quality_score` integer DEFAULT 0 NOT NULL,
	`discovery_date` text NOT NULL,
	`discovered_at` integer NOT NULL,
	`published_at` integer,
	`expires_at` integer,
	`expired_at` integer,
	`archived_at` integer,
	`metadata_json` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `deal_categories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `coupons_source_fingerprint_unique` ON `coupons` (`source_fingerprint`);--> statement-breakpoint
CREATE INDEX `coupons_discovery_date_status_idx` ON `coupons` (`discovery_date`,`status`);--> statement-breakpoint
CREATE INDEX `coupons_category_status_idx` ON `coupons` (`category_id`,`status`);--> statement-breakpoint
CREATE INDEX `coupons_platform_code_idx` ON `coupons` (`platform`,`coupon_code`);--> statement-breakpoint
CREATE INDEX `coupons_expires_at_idx` ON `coupons` (`expires_at`);--> statement-breakpoint
CREATE TABLE `deal_categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`icon` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `deal_categories_name_unique` ON `deal_categories` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `deal_categories_slug_unique` ON `deal_categories` (`slug`);--> statement-breakpoint
CREATE INDEX `deal_categories_active_sort_idx` ON `deal_categories` (`is_active`,`sort_order`);--> statement-breakpoint
CREATE TABLE `deals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`external_id` text,
	`source_fingerprint` text NOT NULL,
	`platform` text NOT NULL,
	`merchant_name` text NOT NULL,
	`category_id` integer,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`image_url` text,
	`original_url` text NOT NULL,
	`normalized_url` text NOT NULL,
	`redirect_url` text NOT NULL,
	`current_price` real NOT NULL,
	`original_price` real,
	`discount_percent` real,
	`currency` text DEFAULT 'INR' NOT NULL,
	`rating` real,
	`review_count` integer,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`quality_score` integer DEFAULT 0 NOT NULL,
	`discovery_date` text NOT NULL,
	`discovered_at` integer NOT NULL,
	`published_at` integer,
	`expires_at` integer,
	`expired_at` integer,
	`archived_at` integer,
	`metadata_json` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `deal_categories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `deals_source_fingerprint_unique` ON `deals` (`source_fingerprint`);--> statement-breakpoint
CREATE UNIQUE INDEX `deals_slug_unique` ON `deals` (`slug`);--> statement-breakpoint
CREATE INDEX `deals_status_idx` ON `deals` (`status`);--> statement-breakpoint
CREATE INDEX `deals_discovery_date_status_idx` ON `deals` (`discovery_date`,`status`);--> statement-breakpoint
CREATE INDEX `deals_category_status_idx` ON `deals` (`category_id`,`status`);--> statement-breakpoint
CREATE INDEX `deals_platform_status_idx` ON `deals` (`platform`,`status`);--> statement-breakpoint
CREATE INDEX `deals_expires_at_idx` ON `deals` (`expires_at`);--> statement-breakpoint
CREATE INDEX `deals_quality_score_idx` ON `deals` (`quality_score`);--> statement-breakpoint
CREATE TABLE `discovery_providers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`provider_key` text NOT NULL,
	`name` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`source_type` text NOT NULL,
	`health_status` text DEFAULT 'UNKNOWN' NOT NULL,
	`last_success_at` integer,
	`last_failure_at` integer,
	`last_error` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `discovery_providers_key_unique` ON `discovery_providers` (`provider_key`);--> statement-breakpoint
CREATE INDEX `discovery_providers_enabled_idx` ON `discovery_providers` (`enabled`);--> statement-breakpoint
CREATE TABLE `discovery_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`run_key` text NOT NULL,
	`trigger_type` text NOT NULL,
	`status` text DEFAULT 'RUNNING' NOT NULL,
	`providers_attempted` integer DEFAULT 0 NOT NULL,
	`providers_succeeded` integer DEFAULT 0 NOT NULL,
	`deals_discovered` integer DEFAULT 0 NOT NULL,
	`coupons_discovered` integer DEFAULT 0 NOT NULL,
	`deals_published` integer DEFAULT 0 NOT NULL,
	`coupons_published` integer DEFAULT 0 NOT NULL,
	`duplicates_rejected` integer DEFAULT 0 NOT NULL,
	`invalid_rejected` integer DEFAULT 0 NOT NULL,
	`error_message` text,
	`started_at` integer NOT NULL,
	`completed_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `discovery_runs_run_key_unique` ON `discovery_runs` (`run_key`);--> statement-breakpoint
CREATE INDEX `discovery_runs_status_started_idx` ON `discovery_runs` (`status`,`started_at`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`deal_id` integer,
	`coupon_id` integer,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`channel` text DEFAULT 'IN_APP' NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`sent_at` integer,
	`read_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`deal_id`) REFERENCES `deals`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`coupon_id`) REFERENCES `coupons`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `notifications_user_status_idx` ON `notifications` (`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `notifications_created_at_idx` ON `notifications` (`created_at`);--> statement-breakpoint
CREATE TABLE `saved_coupons` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`coupon_id` integer NOT NULL,
	`notify_before_expiry` integer DEFAULT true NOT NULL,
	`expiry_notified_at` integer,
	`expired_notified_at` integer,
	`saved_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`coupon_id`) REFERENCES `coupons`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `saved_coupons_user_coupon_unique` ON `saved_coupons` (`user_id`,`coupon_id`);--> statement-breakpoint
CREATE INDEX `saved_coupons_user_idx` ON `saved_coupons` (`user_id`);--> statement-breakpoint
CREATE INDEX `saved_coupons_coupon_idx` ON `saved_coupons` (`coupon_id`);--> statement-breakpoint
CREATE TABLE `saved_deals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`deal_id` integer NOT NULL,
	`notify_before_expiry` integer DEFAULT true NOT NULL,
	`expiry_notified_at` integer,
	`expired_notified_at` integer,
	`saved_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`deal_id`) REFERENCES `deals`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `saved_deals_user_deal_unique` ON `saved_deals` (`user_id`,`deal_id`);--> statement-breakpoint
CREATE INDEX `saved_deals_user_idx` ON `saved_deals` (`user_id`);--> statement-breakpoint
CREATE INDEX `saved_deals_deal_idx` ON `saved_deals` (`deal_id`);--> statement-breakpoint
CREATE TABLE `user_preferences` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`email_notifications` integer DEFAULT true NOT NULL,
	`in_app_notifications` integer DEFAULT true NOT NULL,
	`expiry_alerts` integer DEFAULT true NOT NULL,
	`expiry_alert_hours` integer DEFAULT 6 NOT NULL,
	`preferred_categories_json` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_preferences_user_unique` ON `user_preferences` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`email_verified_at` integer,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_status_idx` ON `users` (`status`);