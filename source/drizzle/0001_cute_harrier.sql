CREATE TABLE `crowd_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`line_id` text NOT NULL,
	`station` text NOT NULL,
	`direction` integer,
	`level` integer NOT NULL,
	`summary` text NOT NULL,
	`reported_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`source_name` text NOT NULL,
	`source_url` text NOT NULL
);
