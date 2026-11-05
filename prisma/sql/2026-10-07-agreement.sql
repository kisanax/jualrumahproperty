-- AlterTable
ALTER TABLE `broker_profiles` ADD COLUMN `company` VARCHAR(200) NULL;
-- CreateTable
CREATE TABLE `agreement_templates` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `headerTitle` VARCHAR(255) NOT NULL,
    `opening` TEXT NOT NULL,
    `body` JSON NOT NULL,
    `closing` TEXT NOT NULL,
    `placeholders` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `agreement_templates_isActive_idx`(`isActive`),
    UNIQUE INDEX `agreement_templates_name_version_key`(`name`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- CreateTable
CREATE TABLE `marketing_agreements` (
    `id` VARCHAR(191) NOT NULL,
    `agreementNumber` VARCHAR(40) NOT NULL,
    `listingId` VARCHAR(191) NOT NULL,
    `ownerId` VARCHAR(191) NOT NULL,
    `brokerUserId` VARCHAR(191) NOT NULL,
    `templateId` VARCHAR(191) NULL,
    `templateVersion` INTEGER NOT NULL DEFAULT 1,
    `status` ENUM('DRAFT', 'ISSUED', 'PARTIALLY_SIGNED', 'SIGNED', 'CANCELLED', 'EXPIRED') NOT NULL DEFAULT 'DRAFT',
    `exclusive` BOOLEAN NOT NULL DEFAULT false,
    `commissionPercent` DECIMAL(5, 2) NULL,
    `commissionAmount` DECIMAL(15, 0) NULL,
    `commissionNotes` TEXT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `signedPlace` VARCHAR(150) NULL,
    `snapshot` JSON NULL,
    `contentHash` VARCHAR(64) NULL,
    `finalHash` VARCHAR(64) NULL,
    `issuedAt` DATETIME(3) NULL,
    `signedAt` DATETIME(3) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `cancelReason` TEXT NULL,
    `archivedDocumentId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `marketing_agreements_agreementNumber_key`(`agreementNumber`),
    UNIQUE INDEX `marketing_agreements_archivedDocumentId_key`(`archivedDocumentId`),
    INDEX `marketing_agreements_listingId_idx`(`listingId`),
    INDEX `marketing_agreements_ownerId_idx`(`ownerId`),
    INDEX `marketing_agreements_brokerUserId_idx`(`brokerUserId`),
    INDEX `marketing_agreements_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- CreateTable
CREATE TABLE `agreement_signatures` (
    `id` VARCHAR(191) NOT NULL,
    `agreementId` VARCHAR(191) NOT NULL,
    `signerRole` ENUM('BROKER', 'OWNER') NOT NULL,
    `status` ENUM('PENDING', 'SIGNED', 'DECLINED') NOT NULL DEFAULT 'PENDING',
    `method` ENUM('DRAWN', 'TYPED', 'CERTIFIED') NULL,
    `signerName` VARCHAR(150) NOT NULL,
    `signerPhone` VARCHAR(40) NULL,
    `signerEmail` VARCHAR(191) NULL,
    `accessTokenHash` VARCHAR(64) NULL,
    `tokenExpiresAt` DATETIME(3) NULL,
    `tokenUsedAt` DATETIME(3) NULL,
    `signatureImagePath` VARCHAR(500) NULL,
    `signatureImageHash` VARCHAR(64) NULL,
    `consentAt` DATETIME(3) NULL,
    `signedAt` DATETIME(3) NULL,
    `signerIp` VARCHAR(64) NULL,
    `signerUa` VARCHAR(500) NULL,
    `evidenceHash` VARCHAR(64) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `agreement_signatures_accessTokenHash_key`(`accessTokenHash`),
    INDEX `agreement_signatures_agreementId_idx`(`agreementId`),
    UNIQUE INDEX `agreement_signatures_agreementId_signerRole_key`(`agreementId`, `signerRole`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- AddForeignKey
ALTER TABLE `marketing_agreements` ADD CONSTRAINT `marketing_agreements_listingId_fkey` FOREIGN KEY (`listingId`) REFERENCES `listings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE `marketing_agreements` ADD CONSTRAINT `marketing_agreements_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `owners`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE `marketing_agreements` ADD CONSTRAINT `marketing_agreements_brokerUserId_fkey` FOREIGN KEY (`brokerUserId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE `marketing_agreements` ADD CONSTRAINT `marketing_agreements_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `agreement_templates`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE `marketing_agreements` ADD CONSTRAINT `marketing_agreements_archivedDocumentId_fkey` FOREIGN KEY (`archivedDocumentId`) REFERENCES `documents`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE `agreement_signatures` ADD CONSTRAINT `agreement_signatures_agreementId_fkey` FOREIGN KEY (`agreementId`) REFERENCES `marketing_agreements`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
