CREATE TABLE `chore_week_skips` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`chore_id` integer NOT NULL,
	`week_start` text NOT NULL,
	`skipped_at` integer NOT NULL,
	FOREIGN KEY (`chore_id`) REFERENCES `chores`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `chore_week_skips_chore_week_unique` ON `chore_week_skips` (`chore_id`,`week_start`);