CREATE TABLE `push_tokens` (
	`token` text PRIMARY KEY NOT NULL,
	`platform` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
