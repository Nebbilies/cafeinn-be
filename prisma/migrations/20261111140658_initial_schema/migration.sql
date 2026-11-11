-- Initial schema for an empty MySQL 8.0.17+ database.
-- Includes manual CHECK, collation and view definitions; do not overwrite with a plain diff.

-- CreateTable
CREATE TABLE `employees` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `full_name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(100) NOT NULL,
    `phone` VARCHAR(15) NOT NULL,
    `username` VARCHAR(50) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL,
    `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deleted_at` TIMESTAMP(3) NULL,

    UNIQUE INDEX `employees_email_key`(`email`),
    UNIQUE INDEX `employees_username_key`(`username`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` ENUM('ADMIN', 'EVENT_STAFF', 'SALES_STAFF') NOT NULL,
    `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `roles_name_key`(`name`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permissions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(50) NOT NULL,
    `description` VARCHAR(255) NULL,
    `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `permissions_code_key`(`code`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employee_roles` (
    `employee_id` INTEGER NOT NULL,
    `role_id` INTEGER NOT NULL,
    `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `employee_roles_role_id_idx`(`role_id`),
    PRIMARY KEY (`employee_id`, `role_id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `role_permissions` (
    `role_id` INTEGER NOT NULL,
    `permission_id` INTEGER NOT NULL,
    `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `role_permissions_permission_id_idx`(`permission_id`),
    PRIMARY KEY (`role_id`, `permission_id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auth_sessions` (
    `id` CHAR(36) NOT NULL,
    `employee_id` INTEGER NOT NULL,
    `expires_at` TIMESTAMP(3) NOT NULL,
    `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `auth_sessions_employee_id_idx`(`employee_id`),
    INDEX `auth_sessions_expires_at_idx`(`expires_at`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `verification_codes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `recipient_email` VARCHAR(100) NOT NULL,
    `purpose` ENUM('PASSWORD_RESET', 'EMAIL_VERIFICATION') NOT NULL,
    `code_hash` VARCHAR(255) NOT NULL,
    `expires_at` TIMESTAMP(3) NOT NULL,
    `failed_attempts` TINYINT UNSIGNED NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `verification_codes_expires_at_idx`(`expires_at`),
    INDEX `verification_codes_recipient_email_purpose_idx`(`recipient_email`, `purpose`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `employee_id` INTEGER NULL,
    `action` ENUM('LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'SESSION_EXPIRED', 'PASSWORD_RESET', 'OTP_REQUESTED', 'OTP_VERIFIED', 'OTP_FAILED', 'OTP_EXPIRED', 'USER_CREATED', 'USER_UPDATED', 'USER_SUSPENDED', 'ROLE_ASSIGNED', 'ROLE_REVOKED', 'RECORD_CREATED', 'RECORD_UPDATED', 'RECORD_DELETED', 'PROGRAM_PUBLISHED', 'PROGRAM_CANCELLED', 'SCHEDULE_FINALIZED', 'RECURRING_GENERATED', 'INVITATION_SENT', 'INVITATION_RESPONDED', 'BOOKING_CREATED', 'BOOKING_CANCELLED', 'BOOKING_HOLD_RELEASED', 'CHECKIN_RECORDED', 'SURCHARGE_ASSIGNED', 'ROOM_CHECKED_IN', 'ROOM_EXTENDED', 'ROOM_MOVED', 'ROOM_CHECKED_OUT', 'ORDER_CREATED', 'ORDER_ITEMS_CHANGED', 'ITEM_PREPARED', 'ITEM_CANCELLED', 'TABLE_RELEASED', 'PAYMENT_CONFIRMED', 'PAYMENT_MISMATCH', 'RECEIPT_ISSUED', 'RECEIPT_REPRINTED', 'REFUND_REQUESTED', 'REFUND_APPROVED', 'REFUND_REJECTED', 'REFUND_COMPLETED', 'SHIFT_OPENED', 'REPORT_CREATED', 'REPORT_CHECKED', 'REPORT_EXPORTED', 'SHIFT_CLOSED', 'RECORD_SOFT_DELETED', 'RECORD_RESTORED') NOT NULL,
    `entity_type` VARCHAR(30) NULL,
    `entity_key` JSON NULL,
    `details` JSON NULL,

    INDEX `audit_logs_employee_id_idx`(`employee_id`),
    INDEX `audit_logs_action_created_at_idx`(`action`, `created_at`),
    INDEX `audit_logs_entity_type_created_at_idx`(`entity_type`, `created_at`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_settings` (
    `key` VARCHAR(50) NOT NULL,
    `value` VARCHAR(255) NOT NULL,
    `description` VARCHAR(255) NULL,
    `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `menu_categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deleted_at` TIMESTAMP(3) NULL,

    UNIQUE INDEX `menu_categories_name_key`(`name`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `menu_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `category_id` INTEGER NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `unit_price` INTEGER UNSIGNED NOT NULL,
    `status` ENUM('AVAILABLE', 'OUT_OF_STOCK', 'DISCONTINUED') NOT NULL,
    `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deleted_at` TIMESTAMP(3) NULL,

    INDEX `menu_items_category_id_idx`(`category_id`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_areas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `kind` ENUM('REGULAR', 'ACOUSTIC') NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL,
    `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deleted_at` TIMESTAMP(3) NULL,

    UNIQUE INDEX `service_areas_name_key`(`name`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dining_tables` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `area_id` INTEGER NOT NULL,
    `code` VARCHAR(10) NOT NULL,
    `seats` TINYINT UNSIGNED NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL,
    `occupancy` ENUM('VACANT', 'OCCUPIED') NOT NULL,
    `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deleted_at` TIMESTAMP(3) NULL,

    UNIQUE INDEX `dining_tables_code_key`(`code`),
    INDEX `dining_tables_area_id_idx`(`area_id`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `study_rooms` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(10) NOT NULL,
    `name` VARCHAR(50) NOT NULL,
    `capacity` TINYINT UNSIGNED NOT NULL,
    `hourly_rate` INTEGER UNSIGNED NOT NULL,
    `minimum_duration_minutes` SMALLINT UNSIGNED NOT NULL,
    `status` ENUM('ACTIVE', 'MAINTENANCE') NOT NULL,
    `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deleted_at` TIMESTAMP(3) NULL,

    UNIQUE INDEX `study_rooms_code_key`(`code`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `room_bookings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `room_id` INTEGER NOT NULL,
    `contact_name` VARCHAR(100) NOT NULL,
    `phone` VARCHAR(15) NOT NULL,
    `email` VARCHAR(100) NULL,
    `channel` ENUM('ONLINE', 'STAFF_ASSISTED') NOT NULL,
    `guest_count` TINYINT UNSIGNED NOT NULL,
    `expected_checkin_at` TIMESTAMP(3) NOT NULL,
    `expected_checkout_at` TIMESTAMP(3) NOT NULL,
    `status` ENUM('HELD', 'CHECKED_IN', 'CANCELLED', 'NO_SHOW') NOT NULL,
    `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `room_bookings_room_id_expected_checkin_at_expected_checkout__idx`(`room_id`, `expected_checkin_at`, `expected_checkout_at`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `event_bookings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `special_event_id` INTEGER NOT NULL,
    `contact_name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(100) NULL,
    `phone` VARCHAR(15) NULL,
    `channel` ENUM('ONLINE', 'STAFF_ASSISTED') NOT NULL,
    `guest_count` SMALLINT UNSIGNED NOT NULL,
    `notes` VARCHAR(255) NULL,
    `hold_until` TIMESTAMP(3) NOT NULL,
    `status` ENUM('HELD', 'PARTIALLY_ARRIVED', 'ARRIVED', 'CANCELLED', 'NO_SHOW', 'HOLD_EXPIRED') NOT NULL,
    `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `event_bookings_special_event_id_status_idx`(`special_event_id`, `status`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `programs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `area_id` INTEGER NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `description` TEXT NULL,
    `kind` ENUM('SPECIAL', 'RECURRING') NOT NULL,
    `starts_at` TIMESTAMP(3) NOT NULL,
    `ends_at` TIMESTAMP(3) NOT NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'CANCELLED') NOT NULL,
    `recurring_batch_id` INTEGER NULL,
    `published_schedule_version_id` INTEGER NULL,
    `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `programs_published_schedule_version_id_key`(`published_schedule_version_id`),
    INDEX `programs_area_id_idx`(`area_id`),
    INDEX `programs_recurring_batch_id_idx`(`recurring_batch_id`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `special_events` (
    `program_id` INTEGER NOT NULL,
    `capacity_limit` SMALLINT UNSIGNED NOT NULL,
    `surcharge_per_person` INTEGER UNSIGNED NOT NULL,
    `registration_deadline` TIMESTAMP(3) NOT NULL,
    `cancellation_deadline` TIMESTAMP(3) NOT NULL,
    `hold_minutes` SMALLINT UNSIGNED NOT NULL,
    `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`program_id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `recurring_batches` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `from_date` DATE NOT NULL,
    `to_date` DATE NOT NULL,
    `weekdays` JSON NOT NULL,
    `start_time` TIME(0) NOT NULL,
    `end_time` TIME(0) NOT NULL,
    `created_count` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `schedule_versions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `program_id` INTEGER NOT NULL,
    `version` SMALLINT UNSIGNED NOT NULL,
    `reason` VARCHAR(255) NULL,
    `status` ENUM('DRAFT', 'FINALIZED', 'PUBLISHED', 'SUPERSEDED') NOT NULL,
    `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `schedule_versions_program_id_version_idx`(`program_id`, `version`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `schedule_slots` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `schedule_version_id` INTEGER NOT NULL,
    `starts_at` TIMESTAMP(3) NOT NULL,
    `ends_at` TIMESTAMP(3) NOT NULL,
    `kind` ENUM('SOUNDCHECK', 'PERFORMANCE', 'BREAK', 'PREPARATION') NOT NULL,
    `stage` VARCHAR(50) NOT NULL,
    `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `schedule_slots_schedule_version_id_idx`(`schedule_version_id`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `artists` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `stage_name` VARCHAR(100) NOT NULL,
    `kind` ENUM('SOLO', 'BAND') NOT NULL,
    `email` VARCHAR(100) NOT NULL,
    `phone` VARCHAR(15) NULL,
    `genre` VARCHAR(50) NULL,
    `notes` TEXT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL,
    `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deleted_at` TIMESTAMP(3) NULL,

    UNIQUE INDEX `artists_email_key`(`email`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `artist_invitations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `program_id` INTEGER NOT NULL,
    `artist_id` INTEGER NOT NULL,
    `starts_at` TIMESTAMP(3) NOT NULL,
    `ends_at` TIMESTAMP(3) NOT NULL,
    `content` TEXT NOT NULL,
    `fee` INTEGER UNSIGNED NOT NULL,
    `response_deadline` TIMESTAMP(3) NOT NULL,
    `accept_token` CHAR(64) NOT NULL,
    `decline_token` CHAR(64) NOT NULL,
    `status` ENUM('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'SUPERSEDED') NOT NULL,
    `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `artist_invitations_accept_token_key`(`accept_token`),
    UNIQUE INDEX `artist_invitations_decline_token_key`(`decline_token`),
    INDEX `artist_invitations_program_id_idx`(`program_id`),
    INDEX `artist_invitations_artist_id_idx`(`artist_id`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `artist_assignments` (
    `schedule_slot_id` INTEGER NOT NULL,
    `artist_id` INTEGER NOT NULL,
    `invitation_id` INTEGER NULL,
    `status` ENUM('PARTICIPATING', 'NOT_PARTICIPATING', 'PENDING') NOT NULL,
    `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `artist_assignments_artist_id_idx`(`artist_id`),
    INDEX `artist_assignments_invitation_id_idx`(`invitation_id`),
    PRIMARY KEY (`schedule_slot_id`, `artist_id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `event_attendances` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `special_event_id` INTEGER NOT NULL,
    `event_booking_id` INTEGER NULL,
    `contact_name` VARCHAR(100) NULL,
    `phone` VARCHAR(15) NULL,
    `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `event_attendances_event_booking_id_key`(`event_booking_id`),
    INDEX `event_attendances_special_event_id_idx`(`special_event_id`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `event_check_ins` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `attendance_id` INTEGER NOT NULL,
    `guest_count` SMALLINT UNSIGNED NOT NULL,
    `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `event_check_ins_attendance_id_idx`(`attendance_id`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `event_surcharges` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `check_in_id` INTEGER NOT NULL,
    `order_id` INTEGER NULL,
    `unit_price` INTEGER UNSIGNED NOT NULL,
    `amount` INTEGER UNSIGNED NOT NULL,
    `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `event_surcharges_check_in_id_key`(`check_in_id`),
    INDEX `event_surcharges_order_id_idx`(`order_id`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `room_rentals` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `room_booking_id` INTEGER NULL,
    `room_id` INTEGER NOT NULL,
    `room_charge_order_id` INTEGER NULL,
    `contact_name` VARCHAR(100) NULL,
    `phone` VARCHAR(15) NULL,
    `guest_count` TINYINT UNSIGNED NOT NULL,
    `checked_in_at` TIMESTAMP(3) NOT NULL,
    `checked_out_at` TIMESTAMP(3) NULL,
    `hourly_rate` INTEGER UNSIGNED NOT NULL,
    `minimum_duration_minutes` SMALLINT UNSIGNED NOT NULL,
    `rounding_minutes` SMALLINT UNSIGNED NOT NULL,
    `amount` INTEGER UNSIGNED NULL,
    `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expected_checkout_at` TIMESTAMP(3) NOT NULL,

    INDEX `room_rentals_room_booking_id_idx`(`room_booking_id`),
    INDEX `room_rentals_room_charge_order_id_idx`(`room_charge_order_id`),
    INDEX `room_rentals_room_id_checked_in_at_idx`(`room_id`, `checked_in_at`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `orders` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `created_in_shift_id` INTEGER NOT NULL,
    `service_type` ENUM('DINE_IN', 'STUDY_ROOM', 'TAKEAWAY') NOT NULL,
    `dining_table_id` INTEGER NULL,
    `room_rental_id` INTEGER NULL,
    `status` ENUM('OPEN', 'PAID', 'CANCELLED') NOT NULL,
    `total_amount` INTEGER UNSIGNED NOT NULL,
    `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `orders_created_in_shift_id_status_idx`(`created_in_shift_id`, `status`),
    INDEX `orders_dining_table_id_status_idx`(`dining_table_id`, `status`),
    INDEX `orders_room_rental_id_status_idx`(`room_rental_id`, `status`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `order_id` INTEGER NOT NULL,
    `menu_item_id` INTEGER NOT NULL,
    `quantity` SMALLINT UNSIGNED NOT NULL,
    `prepared_quantity` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    `cancelled_quantity` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    `unit_price` INTEGER UNSIGNED NOT NULL,
    `notes` VARCHAR(255) NULL,
    `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `order_items_order_id_idx`(`order_id`),
    INDEX `order_items_menu_item_id_idx`(`menu_item_id`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payment_transactions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `received_in_shift_id` INTEGER NOT NULL,
    `kind` ENUM('COLLECTION', 'REFUND') NOT NULL,
    `method` ENUM('CASH', 'BANK_TRANSFER') NOT NULL,
    `amount` INTEGER UNSIGNED NOT NULL,
    `status` ENUM('PENDING', 'SUCCEEDED', 'RECONCILIATION_REQUIRED') NOT NULL,
    `cash_tendered` INTEGER UNSIGNED NULL,
    `transfer_content` VARCHAR(255) NULL,
    `bank_reference` VARCHAR(50) NULL,
    `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `payment_transactions_bank_reference_key`(`bank_reference`),
    INDEX `payment_transactions_received_in_shift_id_status_created_at_idx`(`received_in_shift_id`, `status`, `created_at`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payment_allocations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `transaction_id` INTEGER NOT NULL,
    `amount` INTEGER UNSIGNED NOT NULL,
    `order_id` INTEGER NULL,
    `event_surcharge_id` INTEGER NULL,
    `room_rental_id` INTEGER NULL,
    `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `payment_allocations_transaction_id_idx`(`transaction_id`),
    INDEX `payment_allocations_order_id_idx`(`order_id`),
    INDEX `payment_allocations_event_surcharge_id_idx`(`event_surcharge_id`),
    INDEX `payment_allocations_room_rental_id_idx`(`room_rental_id`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `receipts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `transaction_id` INTEGER NOT NULL,
    `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `receipts_transaction_id_key`(`transaction_id`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `item_cancellation_requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `order_item_id` INTEGER NOT NULL,
    `quantity` SMALLINT UNSIGNED NOT NULL,
    `reason` VARCHAR(255) NOT NULL,
    `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `item_cancellation_requests_order_item_id_idx`(`order_item_id`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refund_requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `allocation_id` INTEGER NOT NULL,
    `amount` INTEGER UNSIGNED NOT NULL,
    `reason` VARCHAR(255) NOT NULL,
    `status` ENUM('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'COMPLETED', 'FAILED') NOT NULL,
    `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reviewer_id` INTEGER NULL,
    `approval_basis` VARCHAR(255) NULL,
    `approved_at` TIMESTAMP(3) NULL,
    `refund_transaction_id` INTEGER NULL,
    `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `refund_requests_refund_transaction_id_key`(`refund_transaction_id`),
    INDEX `refund_requests_allocation_id_idx`(`allocation_id`),
    INDEX `refund_requests_reviewer_id_idx`(`reviewer_id`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cashier_shifts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `employee_id` INTEGER NOT NULL,
    `previous_shift_id` INTEGER NULL,
    `opened_at` TIMESTAMP(3) NOT NULL,
    `closed_at` TIMESTAMP(3) NULL,
    `opening_cash_adjustment` INTEGER NOT NULL DEFAULT 0,
    `counted_cash` INTEGER UNSIGNED NULL,
    `explanation` VARCHAR(255) NULL,
    `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `cashier_shifts_previous_shift_id_key`(`previous_shift_id`),
    INDEX `cashier_shifts_employee_id_idx`(`employee_id`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `expense_entries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `category` ENUM('F', 'H1', 'H2', 'H3', 'H4', 'H5') NOT NULL,
    `amount` INTEGER UNSIGNED NOT NULL,
    `occurred_on` DATE NOT NULL,
    `document_number` VARCHAR(50) NULL,
    `allocation_basis` VARCHAR(255) NULL,
    `description` VARCHAR(255) NOT NULL,
    `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `expense_entries_occurred_on_category_idx`(`occurred_on`, `category`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `profit_reports` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `from_date` DATE NOT NULL,
    `to_date` DATE NOT NULL,
    `version` SMALLINT UNSIGNED NOT NULL,
    `status` ENUM('PROVISIONAL', 'CHECKED') NOT NULL,
    `data_completeness` ENUM('COMPLETE', 'MISSING_DATA') NOT NULL,
    `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reviewer_id` INTEGER NULL,
    `checked_at` TIMESTAMP(3) NULL,
    `notes` TEXT NULL,
    `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `profit_reports_reviewer_id_idx`(`reviewer_id`),
    INDEX `profit_reports_from_date_to_date_version_idx`(`from_date`, `to_date`, `version`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `profit_report_lines` (
    `report_id` INTEGER NOT NULL,
    `id` ENUM('A', 'B', 'C', 'D', 'F', 'H1', 'H2', 'H3', 'H4', 'H5') NOT NULL,
    `amount` INTEGER UNSIGNED NULL,
    `data_status` ENUM('AVAILABLE', 'NO_ACTIVITY', 'MISSING_DATA') NOT NULL,
    `notes` VARCHAR(255) NULL,
    `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`report_id`, `id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `employee_roles` ADD CONSTRAINT `employee_roles_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `employee_roles` ADD CONSTRAINT `employee_roles_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_permission_id_fkey` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `auth_sessions` ADD CONSTRAINT `auth_sessions_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `menu_items` ADD CONSTRAINT `menu_items_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `menu_categories`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `dining_tables` ADD CONSTRAINT `dining_tables_area_id_fkey` FOREIGN KEY (`area_id`) REFERENCES `service_areas`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `room_bookings` ADD CONSTRAINT `room_bookings_room_id_fkey` FOREIGN KEY (`room_id`) REFERENCES `study_rooms`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `event_bookings` ADD CONSTRAINT `event_bookings_special_event_id_fkey` FOREIGN KEY (`special_event_id`) REFERENCES `special_events`(`program_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `programs` ADD CONSTRAINT `programs_area_id_fkey` FOREIGN KEY (`area_id`) REFERENCES `service_areas`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `programs` ADD CONSTRAINT `programs_recurring_batch_id_fkey` FOREIGN KEY (`recurring_batch_id`) REFERENCES `recurring_batches`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `programs` ADD CONSTRAINT `programs_published_schedule_version_id_fkey` FOREIGN KEY (`published_schedule_version_id`) REFERENCES `schedule_versions`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `special_events` ADD CONSTRAINT `special_events_program_id_fkey` FOREIGN KEY (`program_id`) REFERENCES `programs`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `schedule_versions` ADD CONSTRAINT `schedule_versions_program_id_fkey` FOREIGN KEY (`program_id`) REFERENCES `programs`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `schedule_slots` ADD CONSTRAINT `schedule_slots_schedule_version_id_fkey` FOREIGN KEY (`schedule_version_id`) REFERENCES `schedule_versions`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `artist_invitations` ADD CONSTRAINT `artist_invitations_program_id_fkey` FOREIGN KEY (`program_id`) REFERENCES `programs`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `artist_invitations` ADD CONSTRAINT `artist_invitations_artist_id_fkey` FOREIGN KEY (`artist_id`) REFERENCES `artists`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `artist_assignments` ADD CONSTRAINT `artist_assignments_schedule_slot_id_fkey` FOREIGN KEY (`schedule_slot_id`) REFERENCES `schedule_slots`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `artist_assignments` ADD CONSTRAINT `artist_assignments_artist_id_fkey` FOREIGN KEY (`artist_id`) REFERENCES `artists`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `artist_assignments` ADD CONSTRAINT `artist_assignments_invitation_id_fkey` FOREIGN KEY (`invitation_id`) REFERENCES `artist_invitations`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `event_attendances` ADD CONSTRAINT `event_attendances_special_event_id_fkey` FOREIGN KEY (`special_event_id`) REFERENCES `special_events`(`program_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `event_attendances` ADD CONSTRAINT `event_attendances_event_booking_id_fkey` FOREIGN KEY (`event_booking_id`) REFERENCES `event_bookings`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `event_check_ins` ADD CONSTRAINT `event_check_ins_attendance_id_fkey` FOREIGN KEY (`attendance_id`) REFERENCES `event_attendances`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `event_surcharges` ADD CONSTRAINT `event_surcharges_check_in_id_fkey` FOREIGN KEY (`check_in_id`) REFERENCES `event_check_ins`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `event_surcharges` ADD CONSTRAINT `event_surcharges_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `room_rentals` ADD CONSTRAINT `room_rentals_room_booking_id_fkey` FOREIGN KEY (`room_booking_id`) REFERENCES `room_bookings`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `room_rentals` ADD CONSTRAINT `room_rentals_room_id_fkey` FOREIGN KEY (`room_id`) REFERENCES `study_rooms`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `room_rentals` ADD CONSTRAINT `room_rentals_room_charge_order_id_fkey` FOREIGN KEY (`room_charge_order_id`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_created_in_shift_id_fkey` FOREIGN KEY (`created_in_shift_id`) REFERENCES `cashier_shifts`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_dining_table_id_fkey` FOREIGN KEY (`dining_table_id`) REFERENCES `dining_tables`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_room_rental_id_fkey` FOREIGN KEY (`room_rental_id`) REFERENCES `room_rentals`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_menu_item_id_fkey` FOREIGN KEY (`menu_item_id`) REFERENCES `menu_items`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `payment_transactions` ADD CONSTRAINT `payment_transactions_received_in_shift_id_fkey` FOREIGN KEY (`received_in_shift_id`) REFERENCES `cashier_shifts`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `payment_allocations` ADD CONSTRAINT `payment_allocations_transaction_id_fkey` FOREIGN KEY (`transaction_id`) REFERENCES `payment_transactions`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `payment_allocations` ADD CONSTRAINT `payment_allocations_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `payment_allocations` ADD CONSTRAINT `payment_allocations_event_surcharge_id_fkey` FOREIGN KEY (`event_surcharge_id`) REFERENCES `event_surcharges`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `payment_allocations` ADD CONSTRAINT `payment_allocations_room_rental_id_fkey` FOREIGN KEY (`room_rental_id`) REFERENCES `room_rentals`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `receipts` ADD CONSTRAINT `receipts_transaction_id_fkey` FOREIGN KEY (`transaction_id`) REFERENCES `payment_transactions`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `item_cancellation_requests` ADD CONSTRAINT `item_cancellation_requests_order_item_id_fkey` FOREIGN KEY (`order_item_id`) REFERENCES `order_items`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `refund_requests` ADD CONSTRAINT `refund_requests_allocation_id_fkey` FOREIGN KEY (`allocation_id`) REFERENCES `payment_allocations`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `refund_requests` ADD CONSTRAINT `refund_requests_reviewer_id_fkey` FOREIGN KEY (`reviewer_id`) REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `refund_requests` ADD CONSTRAINT `refund_requests_refund_transaction_id_fkey` FOREIGN KEY (`refund_transaction_id`) REFERENCES `payment_transactions`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `cashier_shifts` ADD CONSTRAINT `cashier_shifts_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `cashier_shifts` ADD CONSTRAINT `cashier_shifts_previous_shift_id_fkey` FOREIGN KEY (`previous_shift_id`) REFERENCES `cashier_shifts`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `profit_reports` ADD CONSTRAINT `profit_reports_reviewer_id_fkey` FOREIGN KEY (`reviewer_id`) REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `profit_report_lines` ADD CONSTRAINT `profit_report_lines_report_id_fkey` FOREIGN KEY (`report_id`) REFERENCES `profit_reports`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Exact comparison for opaque identifiers; Unicode text elsewhere retains its original collation.
ALTER TABLE `auth_sessions`
    MODIFY `id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL;
ALTER TABLE `artist_invitations`
    MODIFY `accept_token` CHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    MODIFY `decline_token` CHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL;
ALTER TABLE `verification_codes`
    MODIFY `code_hash` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL;
ALTER TABLE `employees`
    MODIFY `password_hash` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL;
ALTER TABLE `payment_transactions`
    MODIFY `bank_reference` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL;

-- Row-local constraints. Restrict FK actions avoid CHECK/cascade incompatibilities.
ALTER TABLE `orders` ADD CONSTRAINT `chk_orders_service_context` CHECK (
    (`service_type` = 'DINE_IN' AND `dining_table_id` IS NOT NULL AND `room_rental_id` IS NULL)
    OR (`service_type` = 'STUDY_ROOM' AND `room_rental_id` IS NOT NULL AND `dining_table_id` IS NULL)
    OR (`service_type` = 'TAKEAWAY' AND `dining_table_id` IS NULL AND `room_rental_id` IS NULL)
);
ALTER TABLE `order_items` ADD CONSTRAINT `chk_order_items_quantities` CHECK (
    `prepared_quantity` + `cancelled_quantity` <= `quantity`
);
ALTER TABLE `payment_allocations` ADD CONSTRAINT `chk_payment_allocations_source` CHECK (
    (`order_id` IS NOT NULL) + (`event_surcharge_id` IS NOT NULL) + (`room_rental_id` IS NOT NULL) = 1
);
ALTER TABLE `event_attendances` ADD CONSTRAINT `chk_event_attendances_contact` CHECK (
    `event_booking_id` IS NOT NULL OR (`contact_name` IS NOT NULL AND `phone` IS NOT NULL)
);
ALTER TABLE `room_rentals` ADD CONSTRAINT `chk_room_rentals_contact` CHECK (
    `room_booking_id` IS NOT NULL OR (`contact_name` IS NOT NULL AND `phone` IS NOT NULL)
);
ALTER TABLE `room_rentals` ADD CONSTRAINT `chk_room_rentals_actual_times` CHECK (
    `checked_out_at` IS NULL OR `checked_out_at` > `checked_in_at`
);
ALTER TABLE `room_rentals` ADD CONSTRAINT `chk_room_rentals_expected_time` CHECK (
    `expected_checkout_at` > `checked_in_at`
);
ALTER TABLE `payment_transactions` ADD CONSTRAINT `chk_payment_transactions_tender` CHECK (
    (`kind` = 'COLLECTION' AND `method` = 'CASH' AND `cash_tendered` IS NOT NULL AND `cash_tendered` >= `amount`)
    OR ((`kind` = 'REFUND' OR `method` = 'BANK_TRANSFER') AND `cash_tendered` IS NULL)
);
ALTER TABLE `profit_reports` ADD CONSTRAINT `chk_profit_reports_period` CHECK (`from_date` <= `to_date`);
ALTER TABLE `profit_reports` ADD CONSTRAINT `chk_profit_reports_review` CHECK (
    `status` = 'PROVISIONAL' OR (`reviewer_id` IS NOT NULL AND `checked_at` IS NOT NULL)
);
ALTER TABLE `profit_report_lines` ADD CONSTRAINT `chk_profit_report_lines_data` CHECK (
    (`data_status` = 'AVAILABLE' AND `amount` IS NOT NULL)
    OR (`data_status` = 'NO_ACTIVITY' AND `amount` IS NOT NULL AND `amount` = 0)
    OR (`data_status` = 'MISSING_DATA' AND `amount` IS NULL)
);
ALTER TABLE `recurring_batches` ADD CONSTRAINT `chk_recurring_batches_weekdays` CHECK (
    JSON_SCHEMA_VALID(
        '{"type":"array","minItems":1,"maxItems":7,"uniqueItems":true,"items":{"type":"string","enum":["MON","TUE","WED","THU","FRI","SAT","SUN"]}}',
        `weekdays`
    ) = 1
);

-- All source rows remain visible here, including historical references to deleted directories.
-- Consumers must distinguish transaction kind/status and must not treat an order total as its item component.
CREATE VIEW `v_payment_allocation_orders` AS
SELECT
    allocation.`id` AS `allocation_id`,
    allocation.`transaction_id`,
    transaction_row.`kind` AS `transaction_kind`,
    transaction_row.`status` AS `transaction_status`,
    transaction_row.`method` AS `payment_method`,
    CASE
        WHEN allocation.`order_id` IS NOT NULL THEN 'ORDER_ITEMS'
        WHEN allocation.`event_surcharge_id` IS NOT NULL THEN 'EVENT_SURCHARGE'
        ELSE 'ROOM_RENTAL'
    END AS `source_kind`,
    COALESCE(allocation.`order_id`, surcharge.`order_id`, rental.`room_charge_order_id`) AS `original_order_id`,
    allocation.`amount`
FROM `payment_allocations` AS allocation
JOIN `payment_transactions` AS transaction_row ON transaction_row.`id` = allocation.`transaction_id`
LEFT JOIN `event_surcharges` AS surcharge ON surcharge.`id` = allocation.`event_surcharge_id`
LEFT JOIN `room_rentals` AS rental ON rental.`id` = allocation.`room_rental_id`;
