CREATE TABLE `session` (
	`id` integer PRIMARY KEY NOT NULL,
	`test_type` text NOT NULL,
	`meta` text,
	`user_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` integer PRIMARY KEY NOT NULL,
	`age` integer,
	`length` integer
);
--> statement-breakpoint
CREATE TABLE `campimetry_attempt` (
	`id` integer PRIMARY KEY NOT NULL,
	`attempt` integer NOT NULL,
	`stage` integer NOT NULL,
	`silhouette` text NOT NULL,
	`channel` text NOT NULL,
	`op` text NOT NULL,
	`color` text NOT NULL,
	`delta` integer NOT NULL,
	`time` integer NOT NULL,
	`session_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `session`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "channel_check" CHECK("campimetry_attempt"."channel" in ('a', 'b')),
	CONSTRAINT "op_check" CHECK("campimetry_attempt"."op" in ('+', '-'))
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text
);
