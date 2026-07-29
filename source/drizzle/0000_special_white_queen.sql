CREATE TABLE `service_alerts` (
	`line_id` text PRIMARY KEY NOT NULL,
	`affected_area` text NOT NULL,
	`summary` text NOT NULL,
	`delay_min` integer,
	`delay_max` integer,
	`updated_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`source_name` text NOT NULL,
	`source_url` text NOT NULL
);
