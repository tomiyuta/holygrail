CREATE TABLE `data_update_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`updateType` enum('signals','portfolio','all') NOT NULL,
	`success` int NOT NULL DEFAULT 1,
	`usedFallback` int NOT NULL DEFAULT 0,
	`fallbackCount` int DEFAULT 0,
	`fallbackReason` text,
	`regime` enum('bull','bear','neutral'),
	`regimeJapanese` varchar(20),
	`holdingsCount` int,
	`source` enum('manual','scheduled','system') NOT NULL DEFAULT 'manual',
	`durationMs` int,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `data_update_history_id` PRIMARY KEY(`id`)
);
