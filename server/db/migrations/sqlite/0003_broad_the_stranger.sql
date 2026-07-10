CREATE TABLE `completions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`chore_id` integer NOT NULL,
	`day_of_week` integer NOT NULL,
	`week_start` text NOT NULL,
	`completed_at` integer NOT NULL,
	FOREIGN KEY (`chore_id`) REFERENCES `chores`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `completions_chore_day_week_unique` ON `completions` (`chore_id`,`day_of_week`,`week_start`);