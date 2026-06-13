CREATE TABLE `books` (
	`id` text PRIMARY KEY NOT NULL,
	`ean` text,
	`isbn10` text,
	`title` text NOT NULL,
	`subtitle` text,
	`authors` text,
	`publisher` text,
	`published_year` integer,
	`page_count` integer,
	`language` text,
	`description` text,
	`cover_url` text,
	`metadata_source` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `books_ean_unq` ON `books` (`ean`);--> statement-breakpoint
CREATE TABLE `compartments` (
	`id` text PRIMARY KEY NOT NULL,
	`shelf_id` text NOT NULL,
	`row` integer DEFAULT 0 NOT NULL,
	`col` integer DEFAULT 0 NOT NULL,
	`width_units` real,
	`height_units` real,
	`label` text,
	`sort_index` real DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`shelf_id`) REFERENCES `shelves`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `compartments_shelf_idx` ON `compartments` (`shelf_id`);--> statement-breakpoint
CREATE TABLE `copies` (
	`id` text PRIMARY KEY NOT NULL,
	`book_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`room_id` text,
	`compartment_id` text,
	`position` real DEFAULT 0 NOT NULL,
	`condition` text,
	`status` text DEFAULT 'available' NOT NULL,
	`purchase_price_cents` integer,
	`purchase_date` integer,
	`notes` text,
	`spine_color` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`compartment_id`) REFERENCES `compartments`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `copies_book_idx` ON `copies` (`book_id`);--> statement-breakpoint
CREATE INDEX `copies_owner_idx` ON `copies` (`owner_id`);--> statement-breakpoint
CREATE INDEX `copies_room_idx` ON `copies` (`room_id`);--> statement-breakpoint
CREATE INDEX `copies_compartment_idx` ON `copies` (`compartment_id`);--> statement-breakpoint
CREATE TABLE `copy_tags` (
	`copy_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`copy_id`, `tag_id`),
	FOREIGN KEY (`copy_id`) REFERENCES `copies`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `loans` (
	`id` text PRIMARY KEY NOT NULL,
	`copy_id` text NOT NULL,
	`borrower_name` text NOT NULL,
	`lent_at` integer DEFAULT (unixepoch()) NOT NULL,
	`due_at` integer,
	`returned_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`copy_id`) REFERENCES `copies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `loans_copy_idx` ON `loans` (`copy_id`);--> statement-breakpoint
CREATE TABLE `persons` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`user_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `persons_user_id_unique` ON `persons` (`user_id`);--> statement-breakpoint
CREATE TABLE `rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`sort_index` real DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `shelves` (
	`id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`name` text NOT NULL,
	`kind` text,
	`color` text,
	`columns` integer,
	`rows` integer,
	`sort_index` real DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `shelves_room_idx` ON `shelves` (`room_id`);--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`color` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_unique` ON `tags` (`name`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'viewer' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);