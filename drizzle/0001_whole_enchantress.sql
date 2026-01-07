CREATE TABLE `alert_subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`enabled` int NOT NULL DEFAULT 1,
	`lastNotifiedRegime` enum('bull','bear','neutral'),
	`lastNotifiedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `alert_subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `market_data` (
	`id` int AUTO_INCREMENT NOT NULL,
	`symbol` varchar(10) NOT NULL,
	`date` timestamp NOT NULL,
	`open` decimal(12,4),
	`high` decimal(12,4),
	`low` decimal(12,4),
	`close` decimal(12,4) NOT NULL,
	`volume` bigint,
	`adjClose` decimal(12,4),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `market_data_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `portfolio_recommendations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` timestamp NOT NULL,
	`type` enum('aggressive','defensive') NOT NULL,
	`holdings` json NOT NULL,
	`totalHoldings` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `portfolio_recommendations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `signal_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` timestamp NOT NULL,
	`regime` enum('bull','bear','neutral') NOT NULL,
	`regimeJapanese` varchar(20) NOT NULL,
	`confidence` decimal(5,2) NOT NULL,
	`bullCount` int NOT NULL,
	`bearCount` int NOT NULL,
	`bullSignals` json NOT NULL,
	`bearSignals` json NOT NULL,
	`allocation` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `signal_history_id` PRIMARY KEY(`id`)
);
