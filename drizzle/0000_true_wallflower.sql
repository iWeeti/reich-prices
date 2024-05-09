CREATE TABLE `price_row_admin` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`price_row_id` integer NOT NULL,
	`user_id` text NOT NULL,
	FOREIGN KEY (`price_row_id`) REFERENCES `price_row`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `price_row_item` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`price_row_id` integer NOT NULL,
	`item_id` integer NOT NULL,
	FOREIGN KEY (`price_row_id`) REFERENCES `price_row`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `price_row` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text
);
--> statement-breakpoint
CREATE TABLE `price` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`price_row_item_id` integer NOT NULL,
	`min_count` integer NOT NULL,
	`max_count` integer,
	`min_wls` integer NOT NULL,
	`max_wls` integer,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`price_row_item_id`) REFERENCES `price_row_item`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`is_admin` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `price_row_id_item_id_unique` ON `price_row_item` (`item_id`,`price_row_id`);