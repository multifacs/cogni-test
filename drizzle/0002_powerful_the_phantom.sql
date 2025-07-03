PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_stroop_attempt` (
	`id` text PRIMARY KEY NOT NULL,
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
	CONSTRAINT "color_check" CHECK("__new_stroop_attempt"."color" in ('red', 'blue', 'green', 'cyan', 'magenta', 'yellow')),
	CONSTRAINT "task_check" CHECK("__new_stroop_attempt"."task" in ('both', 'meaning', 'color'))
);
--> statement-breakpoint
INSERT INTO `__new_stroop_attempt`("id", "stage", "attempt", "time", "word", "color", "task", "user_answer", "is_correct", "session_id", "created_at") SELECT "id", "stage", "attempt", "time", "word", "color", "task", "user_answer", "is_correct", "session_id", "created_at" FROM `stroop_attempt`;--> statement-breakpoint
DROP TABLE `stroop_attempt`;--> statement-breakpoint
ALTER TABLE `__new_stroop_attempt` RENAME TO `stroop_attempt`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_session` (
	`id` text PRIMARY KEY NOT NULL,
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
CREATE TABLE `__new_user` (
	`id` text PRIMARY KEY NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`birthday` integer NOT NULL,
	`sex` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "sex_check" CHECK("__new_user"."sex" in ('male', 'female'))
);
--> statement-breakpoint
INSERT INTO `__new_user`("id", "first_name", "last_name", "birthday", "sex", "created_at") SELECT "id", "first_name", "last_name", "birthday", "sex", "created_at" FROM `user`;--> statement-breakpoint
DROP TABLE `user`;--> statement-breakpoint
ALTER TABLE `__new_user` RENAME TO `user`;--> statement-breakpoint
CREATE TABLE `__new_campimetry_attempt` (
	`id` text PRIMARY KEY NOT NULL,
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
ALTER TABLE `__new_campimetry_attempt` RENAME TO `campimetry_attempt`;--> statement-breakpoint
CREATE TABLE `__new_math_attempt` (
	`id` text PRIMARY KEY NOT NULL,
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
	CONSTRAINT "sign_check" CHECK("__new_math_attempt"."sign" in ('>', '<', '>=', '<=', '=', '!='))
);
--> statement-breakpoint
INSERT INTO `__new_math_attempt`("id", "attempt", "stage", "time", "left", "sign", "right", "correct_answer", "user_answer", "is_correct", "session_id", "created_at") SELECT "id", "attempt", "stage", "time", "left", "sign", "right", "correct_answer", "user_answer", "is_correct", "session_id", "created_at" FROM `math_attempt`;--> statement-breakpoint
DROP TABLE `math_attempt`;--> statement-breakpoint
ALTER TABLE `__new_math_attempt` RENAME TO `math_attempt`;--> statement-breakpoint
CREATE TABLE `__new_memory_attempt` (
	`id` text PRIMARY KEY NOT NULL,
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
INSERT INTO `__new_memory_attempt`("id", "attempt", "time", "word", "correct_answer", "user_answer", "is_correct", "session_id", "created_at") SELECT "id", "attempt", "time", "word", "correct_answer", "user_answer", "is_correct", "session_id", "created_at" FROM `memory_attempt`;--> statement-breakpoint
DROP TABLE `memory_attempt`;--> statement-breakpoint
ALTER TABLE `__new_memory_attempt` RENAME TO `memory_attempt`;--> statement-breakpoint
CREATE TABLE `__new_munsterberg_attempt` (
	`id` text PRIMARY KEY NOT NULL,
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
INSERT INTO `__new_munsterberg_attempt`("id", "word", "row", "col", "guessed", "attempt", "time", "session_id", "created_at") SELECT "id", "word", "row", "col", "guessed", "attempt", "time", "session_id", "created_at" FROM `munsterberg_attempt`;--> statement-breakpoint
DROP TABLE `munsterberg_attempt`;--> statement-breakpoint
ALTER TABLE `__new_munsterberg_attempt` RENAME TO `munsterberg_attempt`;--> statement-breakpoint
CREATE TABLE `__new_swallow_attempt` (
	`id` text PRIMARY KEY NOT NULL,
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
	CONSTRAINT "direction_check" CHECK("__new_swallow_attempt"."direction" in ('up', 'right', 'down', 'left')),
	CONSTRAINT "background_check" CHECK("__new_swallow_attempt"."background" in ('red', 'blue')),
	CONSTRAINT "correct_answer_check" CHECK("__new_swallow_attempt"."correct_answer" in ('up', 'right', 'down', 'left')),
	CONSTRAINT "user_answer_check" CHECK("__new_swallow_attempt"."user_answer" in ('up', 'right', 'down', 'left'))
);
--> statement-breakpoint
INSERT INTO `__new_swallow_attempt`("id", "attempt", "time", "direction", "background", "correct_answer", "user_answer", "is_correct", "session_id", "created_at") SELECT "id", "attempt", "time", "direction", "background", "correct_answer", "user_answer", "is_correct", "session_id", "created_at" FROM `swallow_attempt`;--> statement-breakpoint
DROP TABLE `swallow_attempt`;--> statement-breakpoint
ALTER TABLE `__new_swallow_attempt` RENAME TO `swallow_attempt`;