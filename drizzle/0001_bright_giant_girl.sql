CREATE TABLE `math_attempt` (
	`id` text PRIMARY KEY DEFAULT '0e8c77ed-8361-4867-af8f-a31d86e793f3' NOT NULL,
	`attempt` integer NOT NULL,
	`stage` integer NOT NULL,
	`time` integer NOT NULL,
	`left` text NOT NULL,
	`sign` text NOT NULL,
	`right` text NOT NULL,
	`correct_answer` integer NOT NULL,
	`user_answer` integer,
	`is_correct` integer DEFAULT false NOT NULL,
	`session_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `session`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "sign_check" CHECK("math_attempt"."sign" in ('>', '<', '>=', '<=', '=', '!='))
);
--> statement-breakpoint
CREATE TABLE `memory_attempt` (
	`id` text PRIMARY KEY DEFAULT '0280fad6-a09b-4978-abf6-6e2d9a430758' NOT NULL,
	`attempt` integer NOT NULL,
	`time` integer NOT NULL,
	`word` text NOT NULL,
	`correct_answer` integer NOT NULL,
	`user_answer` integer,
	`is_correct` integer DEFAULT false NOT NULL,
	`session_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `session`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `munsterberg_attempt` (
	`id` text PRIMARY KEY DEFAULT '23819cdf-1088-4565-9ad1-811c8a3751c1' NOT NULL,
	`word` text NOT NULL,
	`row` integer NOT NULL,
	`col` integer NOT NULL,
	`guessed` integer NOT NULL,
	`attempt` integer NOT NULL,
	`time` integer NOT NULL,
	`session_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `session`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `stroop_attempt` (
	`id` text PRIMARY KEY DEFAULT 'e4a8e433-99ee-4938-8209-d267d5faf584' NOT NULL,
	`stage` integer NOT NULL,
	`attempt` integer NOT NULL,
	`time` integer NOT NULL,
	`word` text NOT NULL,
	`color` text NOT NULL,
	`task` text NOT NULL,
	`user_answer` text,
	`is_correct` integer DEFAULT false NOT NULL,
	`session_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `session`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "color_check" CHECK("stroop_attempt"."color" in ('red', 'green', 'blue', 'yellow', 'white')),
	CONSTRAINT "task_check" CHECK("stroop_attempt"."task" in ('both', 'meaning', 'color'))
);
--> statement-breakpoint
CREATE TABLE `swallow_attempt` (
	`id` text PRIMARY KEY DEFAULT '7e7cfd4a-cf8b-484b-99c3-53446b70f0ee' NOT NULL,
	`attempt` integer NOT NULL,
	`time` integer NOT NULL,
	`direction` text NOT NULL,
	`background` text NOT NULL,
	`correct_answer` text NOT NULL,
	`user_answer` text,
	`is_correct` integer DEFAULT false NOT NULL,
	`session_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `session`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "direction_check" CHECK("swallow_attempt"."direction" in ('up', 'right', 'down', 'left')),
	CONSTRAINT "background_check" CHECK("swallow_attempt"."background" in ('red', 'blue')),
	CONSTRAINT "correct_answer_check" CHECK("swallow_attempt"."correct_answer" in ('up', 'right', 'down', 'left')),
	CONSTRAINT "user_answer_check" CHECK("swallow_attempt"."user_answer" in ('up', 'right', 'down', 'left'))
);
--> statement-breakpoint
DROP TABLE `sessions`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_session` (
	`id` text PRIMARY KEY DEFAULT 'b1c1b279-f6ba-4bf2-abd9-92d5dc81934e' NOT NULL,
	`test_type` text NOT NULL,
	`meta` text,
	`user_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_session`("id", "test_type", "meta", "user_id", "created_at") SELECT "id", "test_type", "meta", "user_id", "created_at" FROM `session`;--> statement-breakpoint
DROP TABLE `session`;--> statement-breakpoint
ALTER TABLE `__new_session` RENAME TO `session`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_user` (
	`id` text PRIMARY KEY DEFAULT '8ded5560-e87c-4ee4-8b94-ba9fcf0ba032' NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`birthday` text NOT NULL,
	`sex` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "sex_check" CHECK("__new_user"."sex" in ('male', 'female'))
);
--> statement-breakpoint
INSERT INTO `__new_user`("id", "first_name", "last_name", "birthday", "sex", "created_at") SELECT "id", "first_name", "last_name", "birthday", "sex", "created_at" FROM `user`;--> statement-breakpoint
DROP TABLE `user`;--> statement-breakpoint
ALTER TABLE `__new_user` RENAME TO `user`;--> statement-breakpoint
CREATE TABLE `__new_campimetry_attempt` (
	`id` text PRIMARY KEY DEFAULT '0367133f-433e-4f08-8b72-11400f5c7f9c' NOT NULL,
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
	CONSTRAINT "channel_check" CHECK("__new_campimetry_attempt"."channel" in ('a', 'b')),
	CONSTRAINT "op_check" CHECK("__new_campimetry_attempt"."op" in ('+', '-')),
	CONSTRAINT "color_check" CHECK("__new_campimetry_attempt"."color" in ('black', 'white', 'dark-magenta', 'light-magenta', 'dark-blue', 'light-blue', 'dark-green', 'light-green', 'dark-red', 'light-red'))
);
--> statement-breakpoint
INSERT INTO `__new_campimetry_attempt`("id", "attempt", "stage", "silhouette", "channel", "op", "color", "delta", "time", "session_id", "created_at") SELECT "id", "attempt", "stage", "silhouette", "channel", "op", "color", "delta", "time", "session_id", "created_at" FROM `campimetry_attempt`;--> statement-breakpoint
DROP TABLE `campimetry_attempt`;--> statement-breakpoint
ALTER TABLE `__new_campimetry_attempt` RENAME TO `campimetry_attempt`;