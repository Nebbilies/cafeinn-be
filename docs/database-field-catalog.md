# Database field catalog

Design authority: [database design](database-design.md). All names are English; source names identify the supplied ERD only.

Source SHA-256: `245289be1802d145dc7cf43cface2655e237175b2e808fb1d7e2ea25a36808a6`.

39 tables, 48 foreign keys; creation/update/deletion metadata coverage: 39 / 32 / 7.

Amounts are integer VND. Instants use UTC TIMESTAMP(3); DATE and TIME retain the local-calendar semantics documented in the design. NULL is distinct from zero.

## Employee (`employees`)

Source: `NHAN_VIEN`.

| Source field | SQL column | Prisma field | Native type | Nullable | Keys/reference | Default/update |
| --- | --- | --- | --- | --- | --- | --- |
| ma_nv | id | id | INT | No | PK | autoincrement() |
| ho_ten | full_name | fullName | VARCHAR(100) | No | - | Explicit input |
| email | email | email | VARCHAR(100) | No | UNIQUE | Explicit input |
| sdt | phone | phone | VARCHAR(15) | No | - | Explicit input |
| ten_dang_nhap | username | username | VARCHAR(50) | No | UNIQUE | Explicit input |
| mat_khau_hash | password_hash | passwordHash | VARCHAR(255) | No | - | Explicit input |
| trang_thai | status | status | ENUM(ACTIVE,INACTIVE) | No | - | Explicit input |
| (added) | created_at | createdAt | TIMESTAMP(3) | No | - | now() |
| (added) | updated_at | updatedAt | TIMESTAMP(3) | No | - | now(); Prisma @updatedAt |
| (added) | deleted_at | deletedAt | TIMESTAMP(3) | Yes | - | NULL |

## Role (`roles`)

Source: `VAI_TRO`.

| Source field | SQL column | Prisma field | Native type | Nullable | Keys/reference | Default/update |
| --- | --- | --- | --- | --- | --- | --- |
| ma_vai_tro | id | id | INT | No | PK | autoincrement() |
| ten | name | name | ENUM(ADMIN,EVENT_STAFF,SALES_STAFF) | No | UNIQUE | Explicit input |
| (added) | created_at | createdAt | TIMESTAMP(3) | No | - | now() |
| (added) | updated_at | updatedAt | TIMESTAMP(3) | No | - | now(); Prisma @updatedAt |

## Permission (`permissions`)

Source: `QUYEN`.

| Source field | SQL column | Prisma field | Native type | Nullable | Keys/reference | Default/update |
| --- | --- | --- | --- | --- | --- | --- |
| ma_quyen | id | id | INT | No | PK | autoincrement() |
| ma_chuc_nang | code | code | VARCHAR(50) | No | UNIQUE | Explicit input |
| mo_ta | description | description | VARCHAR(255) | Yes | - | NULL |
| (added) | created_at | createdAt | TIMESTAMP(3) | No | - | now() |
| (added) | updated_at | updatedAt | TIMESTAMP(3) | No | - | now(); Prisma @updatedAt |

## EmployeeRole (`employee_roles`)

Source: `NHAN_VIEN_VAI_TRO`.

| Source field | SQL column | Prisma field | Native type | Nullable | Keys/reference | Default/update |
| --- | --- | --- | --- | --- | --- | --- |
| ma_nv | employee_id | employeeId | INT | No | PK FK -> employees | Explicit input |
| ma_vai_tro | role_id | roleId | INT | No | PK FK -> roles | Explicit input |
| (added) | created_at | createdAt | TIMESTAMP(3) | No | - | now() |

## RolePermission (`role_permissions`)

Source: `VAI_TRO_QUYEN`.

| Source field | SQL column | Prisma field | Native type | Nullable | Keys/reference | Default/update |
| --- | --- | --- | --- | --- | --- | --- |
| ma_vai_tro | role_id | roleId | INT | No | PK FK -> roles | Explicit input |
| ma_quyen | permission_id | permissionId | INT | No | PK FK -> permissions | Explicit input |
| (added) | created_at | createdAt | TIMESTAMP(3) | No | - | now() |

## AuthSession (`auth_sessions`)

Source: `PHIEN_DANG_NHAP`.

| Source field | SQL column | Prisma field | Native type | Nullable | Keys/reference | Default/update |
| --- | --- | --- | --- | --- | --- | --- |
| ma_phien | id | id | CHAR(36) | No | PK | uuid() |
| ma_nv | employee_id | employeeId | INT | No | FK -> employees | Explicit input |
| het_han | expires_at | expiresAt | TIMESTAMP(3) | No | - | Explicit input |
| (added) | created_at | createdAt | TIMESTAMP(3) | No | - | now() |
| (added) | updated_at | updatedAt | TIMESTAMP(3) | No | - | now(); Prisma @updatedAt |

## VerificationCode (`verification_codes`)

Source: `MA_XAC_THUC`.

| Source field | SQL column | Prisma field | Native type | Nullable | Keys/reference | Default/update |
| --- | --- | --- | --- | --- | --- | --- |
| ma_xac_thuc | id | id | INT | No | PK | autoincrement() |
| email_nhan | recipient_email | recipientEmail | VARCHAR(100) | No | - | Explicit input |
| muc_dich | purpose | purpose | ENUM(PASSWORD_RESET,EMAIL_VERIFICATION) | No | - | Explicit input |
| ma_hash | code_hash | codeHash | VARCHAR(255) | No | - | Explicit input |
| het_han | expires_at | expiresAt | TIMESTAMP(3) | No | - | Explicit input |
| so_lan_sai | failed_attempts | failedAttempts | TINYINT UNSIGNED | No | - | 0 |
| (added) | created_at | createdAt | TIMESTAMP(3) | No | - | now() |
| (added) | updated_at | updatedAt | TIMESTAMP(3) | No | - | now(); Prisma @updatedAt |

## AuditLog (`audit_logs`)

Source: `NHAT_KY`.

| Source field | SQL column | Prisma field | Native type | Nullable | Keys/reference | Default/update |
| --- | --- | --- | --- | --- | --- | --- |
| ma_nhat_ky | id | id | BIGINT | No | PK | autoincrement() |
| ngay_tao | created_at | createdAt | TIMESTAMP(3) | No | - | now() |
| ma_nv | employee_id | employeeId | INT | Yes | FK -> employees | NULL |
| hanh_dong | action | action | ENUM(LOGIN_SUCCESS,LOGIN_FAILED,LOGOUT,SESSION_EXPIRED,PASSWORD_RESET,OTP_REQUESTED,OTP_VERIFIED,OTP_FAILED,OTP_EXPIRED,USER_CREATED,USER_UPDATED,USER_SUSPENDED,ROLE_ASSIGNED,ROLE_REVOKED,RECORD_CREATED,RECORD_UPDATED,RECORD_DELETED,PROGRAM_PUBLISHED,PROGRAM_CANCELLED,SCHEDULE_FINALIZED,RECURRING_GENERATED,INVITATION_SENT,INVITATION_RESPONDED,BOOKING_CREATED,BOOKING_CANCELLED,BOOKING_HOLD_RELEASED,CHECKIN_RECORDED,SURCHARGE_ASSIGNED,ROOM_CHECKED_IN,ROOM_EXTENDED,ROOM_MOVED,ROOM_CHECKED_OUT,ORDER_CREATED,ORDER_ITEMS_CHANGED,ITEM_PREPARED,ITEM_CANCELLED,TABLE_RELEASED,PAYMENT_CONFIRMED,PAYMENT_MISMATCH,RECEIPT_ISSUED,RECEIPT_REPRINTED,REFUND_REQUESTED,REFUND_APPROVED,REFUND_REJECTED,REFUND_COMPLETED,SHIFT_OPENED,REPORT_CREATED,REPORT_CHECKED,REPORT_EXPORTED,SHIFT_CLOSED) | No | - | Explicit input |
| doi_tuong | entity_type | entityType | VARCHAR(30) | Yes | - | NULL |
| khoa_doi_tuong | entity_key | entityKey | JSON | Yes | - | NULL |
| chi_tiet | details | details | JSON | Yes | - | NULL |

## SystemSetting (`system_settings`)

Source: `CAU_HINH_HE_THONG`.

| Source field | SQL column | Prisma field | Native type | Nullable | Keys/reference | Default/update |
| --- | --- | --- | --- | --- | --- | --- |
| khoa | key | key | VARCHAR(50) | No | PK | Explicit input |
| gia_tri | value | value | VARCHAR(255) | No | - | Explicit input |
| mo_ta | description | description | VARCHAR(255) | Yes | - | NULL |
| (added) | created_at | createdAt | TIMESTAMP(3) | No | - | now() |
| (added) | updated_at | updatedAt | TIMESTAMP(3) | No | - | now(); Prisma @updatedAt |

## MenuCategory (`menu_categories`)

Source: `DANH_MUC`.

| Source field | SQL column | Prisma field | Native type | Nullable | Keys/reference | Default/update |
| --- | --- | --- | --- | --- | --- | --- |
| ma_danh_muc | id | id | INT | No | PK | autoincrement() |
| ten | name | name | VARCHAR(100) | No | UNIQUE | Explicit input |
| (added) | created_at | createdAt | TIMESTAMP(3) | No | - | now() |
| (added) | updated_at | updatedAt | TIMESTAMP(3) | No | - | now(); Prisma @updatedAt |
| (added) | deleted_at | deletedAt | TIMESTAMP(3) | Yes | - | NULL |

## MenuItem (`menu_items`)

Source: `MON`.

| Source field | SQL column | Prisma field | Native type | Nullable | Keys/reference | Default/update |
| --- | --- | --- | --- | --- | --- | --- |
| ma_mon | id | id | INT | No | PK | autoincrement() |
| ma_danh_muc | category_id | categoryId | INT | No | FK -> menu_categories | Explicit input |
| ten | name | name | VARCHAR(100) | No | - | Explicit input |
| don_gia | unit_price | unitPrice | INT UNSIGNED | No | - | Explicit input |
| trang_thai | status | status | ENUM(AVAILABLE,OUT_OF_STOCK,DISCONTINUED) | No | - | Explicit input |
| (added) | created_at | createdAt | TIMESTAMP(3) | No | - | now() |
| (added) | updated_at | updatedAt | TIMESTAMP(3) | No | - | now(); Prisma @updatedAt |
| (added) | deleted_at | deletedAt | TIMESTAMP(3) | Yes | - | NULL |

## ServiceArea (`service_areas`)

Source: `KHU_VUC`.

| Source field | SQL column | Prisma field | Native type | Nullable | Keys/reference | Default/update |
| --- | --- | --- | --- | --- | --- | --- |
| ma_khu_vuc | id | id | INT | No | PK | autoincrement() |
| ten | name | name | VARCHAR(100) | No | UNIQUE | Explicit input |
| loai | kind | kind | ENUM(REGULAR,ACOUSTIC) | No | - | Explicit input |
| trang_thai | status | status | ENUM(ACTIVE,INACTIVE) | No | - | Explicit input |
| (added) | created_at | createdAt | TIMESTAMP(3) | No | - | now() |
| (added) | updated_at | updatedAt | TIMESTAMP(3) | No | - | now(); Prisma @updatedAt |
| (added) | deleted_at | deletedAt | TIMESTAMP(3) | Yes | - | NULL |

## DiningTable (`dining_tables`)

Source: `BAN`.

| Source field | SQL column | Prisma field | Native type | Nullable | Keys/reference | Default/update |
| --- | --- | --- | --- | --- | --- | --- |
| ma_ban | id | id | INT | No | PK | autoincrement() |
| ma_khu_vuc | area_id | areaId | INT | No | FK -> service_areas | Explicit input |
| ky_hieu | code | code | VARCHAR(10) | No | UNIQUE | Explicit input |
| so_cho | seats | seats | TINYINT UNSIGNED | No | - | Explicit input |
| trang_thai | status | status | ENUM(ACTIVE,INACTIVE) | No | - | Explicit input |
| tinh_trang | occupancy | occupancy | ENUM(VACANT,OCCUPIED) | No | - | Explicit input |
| (added) | created_at | createdAt | TIMESTAMP(3) | No | - | now() |
| (added) | updated_at | updatedAt | TIMESTAMP(3) | No | - | now(); Prisma @updatedAt |
| (added) | deleted_at | deletedAt | TIMESTAMP(3) | Yes | - | NULL |

## StudyRoom (`study_rooms`)

Source: `PHONG_HOC`.

| Source field | SQL column | Prisma field | Native type | Nullable | Keys/reference | Default/update |
| --- | --- | --- | --- | --- | --- | --- |
| ma_phong | id | id | INT | No | PK | autoincrement() |
| ky_hieu | code | code | VARCHAR(10) | No | UNIQUE | Explicit input |
| ten | name | name | VARCHAR(50) | No | - | Explicit input |
| suc_chua | capacity | capacity | TINYINT UNSIGNED | No | - | Explicit input |
| don_gia_gio | hourly_rate | hourlyRate | INT UNSIGNED | No | - | Explicit input |
| thoi_luong_toi_thieu_phut | minimum_duration_minutes | minimumDurationMinutes | SMALLINT UNSIGNED | No | - | Explicit input |
| trang_thai | status | status | ENUM(ACTIVE,MAINTENANCE) | No | - | Explicit input |
| (added) | created_at | createdAt | TIMESTAMP(3) | No | - | now() |
| (added) | updated_at | updatedAt | TIMESTAMP(3) | No | - | now(); Prisma @updatedAt |
| (added) | deleted_at | deletedAt | TIMESTAMP(3) | Yes | - | NULL |

## RoomBooking (`room_bookings`)

Source: `DAT_PHONG`.

| Source field | SQL column | Prisma field | Native type | Nullable | Keys/reference | Default/update |
| --- | --- | --- | --- | --- | --- | --- |
| ma_dat_phong | id | id | INT | No | PK | autoincrement() |
| ma_phong | room_id | roomId | INT | No | FK -> study_rooms | Explicit input |
| ten_lien_he | contact_name | contactName | VARCHAR(100) | No | - | Explicit input |
| sdt | phone | phone | VARCHAR(15) | No | - | Explicit input |
| email | email | email | VARCHAR(100) | Yes | - | NULL |
| kenh | channel | channel | ENUM(ONLINE,STAFF_ASSISTED) | No | - | Explicit input |
| so_nguoi | guest_count | guestCount | TINYINT UNSIGNED | No | - | Explicit input |
| gio_nhan_du_kien | expected_checkin_at | expectedCheckinAt | TIMESTAMP(3) | No | - | Explicit input |
| gio_tra_du_kien | expected_checkout_at | expectedCheckoutAt | TIMESTAMP(3) | No | - | Explicit input |
| trang_thai | status | status | ENUM(HELD,CHECKED_IN,CANCELLED,NO_SHOW) | No | - | Explicit input |
| ngay_tao | created_at | createdAt | TIMESTAMP(3) | No | - | now() |
| (added) | updated_at | updatedAt | TIMESTAMP(3) | No | - | now(); Prisma @updatedAt |

## EventBooking (`event_bookings`)

Source: `DAT_CHO_SU_KIEN`.

| Source field | SQL column | Prisma field | Native type | Nullable | Keys/reference | Default/update |
| --- | --- | --- | --- | --- | --- | --- |
| ma_dat_cho | id | id | INT | No | PK | autoincrement() |
| ma_su_kien | special_event_id | specialEventId | INT | No | FK -> special_events | Explicit input |
| ten_lien_he | contact_name | contactName | VARCHAR(100) | No | - | Explicit input |
| email | email | email | VARCHAR(100) | Yes | - | NULL |
| sdt | phone | phone | VARCHAR(15) | Yes | - | NULL |
| kenh | channel | channel | ENUM(ONLINE,STAFF_ASSISTED) | No | - | Explicit input |
| so_nguoi | guest_count | guestCount | SMALLINT UNSIGNED | No | - | Explicit input |
| ghi_chu | notes | notes | VARCHAR(255) | Yes | - | NULL |
| han_giu | hold_until | holdUntil | TIMESTAMP(3) | No | - | Explicit input |
| trang_thai | status | status | ENUM(HELD,PARTIALLY_ARRIVED,ARRIVED,CANCELLED,NO_SHOW,HOLD_EXPIRED) | No | - | Explicit input |
| ngay_tao | created_at | createdAt | TIMESTAMP(3) | No | - | now() |
| (added) | updated_at | updatedAt | TIMESTAMP(3) | No | - | now(); Prisma @updatedAt |

## Program (`programs`)

Source: `CHUONG_TRINH`.

| Source field | SQL column | Prisma field | Native type | Nullable | Keys/reference | Default/update |
| --- | --- | --- | --- | --- | --- | --- |
| ma_chuong_trinh | id | id | INT | No | PK | autoincrement() |
| ma_khu_vuc | area_id | areaId | INT | No | FK -> service_areas | Explicit input |
| ten | name | name | VARCHAR(150) | No | - | Explicit input |
| mo_ta | description | description | TEXT | Yes | - | NULL |
| loai | kind | kind | ENUM(SPECIAL,RECURRING) | No | - | Explicit input |
| bat_dau | starts_at | startsAt | TIMESTAMP(3) | No | - | Explicit input |
| ket_thuc | ends_at | endsAt | TIMESTAMP(3) | No | - | Explicit input |
| trang_thai | status | status | ENUM(DRAFT,PUBLISHED,CANCELLED) | No | - | Explicit input |
| ma_dot_tao | recurring_batch_id | recurringBatchId | INT | Yes | FK -> recurring_batches | NULL |
| ma_phien_ban_cong_bo | published_schedule_version_id | publishedScheduleVersionId | INT | Yes | UNIQUE FK -> schedule_versions | NULL |
| (added) | created_at | createdAt | TIMESTAMP(3) | No | - | now() |
| (added) | updated_at | updatedAt | TIMESTAMP(3) | No | - | now(); Prisma @updatedAt |

## SpecialEvent (`special_events`)

Source: `SU_KIEN_DAC_BIET`.

| Source field | SQL column | Prisma field | Native type | Nullable | Keys/reference | Default/update |
| --- | --- | --- | --- | --- | --- | --- |
| ma_chuong_trinh | program_id | programId | INT | No | PK FK -> programs | Explicit input |
| han_muc | capacity_limit | capacityLimit | SMALLINT UNSIGNED | No | - | Explicit input |
| don_gia_phu_thu | surcharge_per_person | surchargePerPerson | INT UNSIGNED | No | - | Explicit input |
| han_dang_ky | registration_deadline | registrationDeadline | TIMESTAMP(3) | No | - | Explicit input |
| han_tu_huy | cancellation_deadline | cancellationDeadline | TIMESTAMP(3) | No | - | Explicit input |
| phut_giu | hold_minutes | holdMinutes | SMALLINT UNSIGNED | No | - | Explicit input |
| (added) | created_at | createdAt | TIMESTAMP(3) | No | - | now() |
| (added) | updated_at | updatedAt | TIMESTAMP(3) | No | - | now(); Prisma @updatedAt |

## RecurringBatch (`recurring_batches`)

Source: `DOT_TAO_DINH_KY`.

| Source field | SQL column | Prisma field | Native type | Nullable | Keys/reference | Default/update |
| --- | --- | --- | --- | --- | --- | --- |
| ma_dot_tao | id | id | INT | No | PK | autoincrement() |
| tu_ngay | from_date | fromDate | DATE | No | - | Explicit input |
| den_ngay | to_date | toDate | DATE | No | - | Explicit input |
| cac_thu | weekdays | weekdays | JSON | No | - | Explicit input |
| gio_bat_dau | start_time | startTime | TIME | No | - | Explicit input |
| gio_ket_thuc | end_time | endTime | TIME | No | - | Explicit input |
| so_buoi_da_tao | created_count | createdCount | SMALLINT UNSIGNED | No | - | 0 |
| (added) | created_at | createdAt | TIMESTAMP(3) | No | - | now() |
| (added) | updated_at | updatedAt | TIMESTAMP(3) | No | - | now(); Prisma @updatedAt |

## ScheduleVersion (`schedule_versions`)

Source: `PHIEN_BAN_LICH`.

| Source field | SQL column | Prisma field | Native type | Nullable | Keys/reference | Default/update |
| --- | --- | --- | --- | --- | --- | --- |
| ma_phien_ban | id | id | INT | No | PK | autoincrement() |
| ma_chuong_trinh | program_id | programId | INT | No | FK -> programs | Explicit input |
| so_phien_ban | version | version | SMALLINT UNSIGNED | No | - | Explicit input |
| ly_do | reason | reason | VARCHAR(255) | Yes | - | NULL |
| trang_thai | status | status | ENUM(DRAFT,FINALIZED,PUBLISHED,SUPERSEDED) | No | - | Explicit input |
| (added) | created_at | createdAt | TIMESTAMP(3) | No | - | now() |
| (added) | updated_at | updatedAt | TIMESTAMP(3) | No | - | now(); Prisma @updatedAt |

## ScheduleSlot (`schedule_slots`)

Source: `MOC_CHUONG_TRINH`.

| Source field | SQL column | Prisma field | Native type | Nullable | Keys/reference | Default/update |
| --- | --- | --- | --- | --- | --- | --- |
| ma_moc | id | id | INT | No | PK | autoincrement() |
| ma_phien_ban | schedule_version_id | scheduleVersionId | INT | No | FK -> schedule_versions | Explicit input |
| bat_dau | starts_at | startsAt | TIMESTAMP(3) | No | - | Explicit input |
| ket_thuc | ends_at | endsAt | TIMESTAMP(3) | No | - | Explicit input |
| loai | kind | kind | ENUM(SOUNDCHECK,PERFORMANCE,BREAK,PREPARATION) | No | - | Explicit input |
| san_khau | stage | stage | VARCHAR(50) | No | - | Explicit input |
| (added) | created_at | createdAt | TIMESTAMP(3) | No | - | now() |
| (added) | updated_at | updatedAt | TIMESTAMP(3) | No | - | now(); Prisma @updatedAt |

## Artist (`artists`)

Source: `HO_SO_NGHE_SI`.

| Source field | SQL column | Prisma field | Native type | Nullable | Keys/reference | Default/update |
| --- | --- | --- | --- | --- | --- | --- |
| ma_nghe_si | id | id | INT | No | PK | autoincrement() |
| ten_nghe_danh | stage_name | stageName | VARCHAR(100) | No | - | Explicit input |
| loai | kind | kind | ENUM(SOLO,BAND) | No | - | Explicit input |
| email | email | email | VARCHAR(100) | No | UNIQUE | Explicit input |
| sdt | phone | phone | VARCHAR(15) | Yes | - | NULL |
| the_loai | genre | genre | VARCHAR(50) | Yes | - | NULL |
| ghi_chu | notes | notes | TEXT | Yes | - | NULL |
| trang_thai | status | status | ENUM(ACTIVE,INACTIVE) | No | - | Explicit input |
| (added) | created_at | createdAt | TIMESTAMP(3) | No | - | now() |
| (added) | updated_at | updatedAt | TIMESTAMP(3) | No | - | now(); Prisma @updatedAt |
| (added) | deleted_at | deletedAt | TIMESTAMP(3) | Yes | - | NULL |

## ArtistInvitation (`artist_invitations`)

Source: `LOI_MOI`.

| Source field | SQL column | Prisma field | Native type | Nullable | Keys/reference | Default/update |
| --- | --- | --- | --- | --- | --- | --- |
| ma_loi_moi | id | id | INT | No | PK | autoincrement() |
| ma_chuong_trinh | program_id | programId | INT | No | FK -> programs | Explicit input |
| ma_nghe_si | artist_id | artistId | INT | No | FK -> artists | Explicit input |
| bat_dau | starts_at | startsAt | TIMESTAMP(3) | No | - | Explicit input |
| ket_thuc | ends_at | endsAt | TIMESTAMP(3) | No | - | Explicit input |
| noi_dung | content | content | TEXT | No | - | Explicit input |
| thu_lao | fee | fee | INT UNSIGNED | No | - | Explicit input |
| han_phan_hoi | response_deadline | responseDeadline | TIMESTAMP(3) | No | - | Explicit input |
| token_xac_nhan | accept_token | acceptToken | CHAR(64) | No | UNIQUE | Explicit input |
| token_tu_choi | decline_token | declineToken | CHAR(64) | No | UNIQUE | Explicit input |
| trang_thai | status | status | ENUM(PENDING,ACCEPTED,DECLINED,EXPIRED,SUPERSEDED) | No | - | Explicit input |
| (added) | created_at | createdAt | TIMESTAMP(3) | No | - | now() |
| (added) | updated_at | updatedAt | TIMESTAMP(3) | No | - | now(); Prisma @updatedAt |

## ArtistAssignment (`artist_assignments`)

Source: `PHAN_CONG`.

| Source field | SQL column | Prisma field | Native type | Nullable | Keys/reference | Default/update |
| --- | --- | --- | --- | --- | --- | --- |
| ma_moc | schedule_slot_id | scheduleSlotId | INT | No | PK FK -> schedule_slots | Explicit input |
| ma_nghe_si | artist_id | artistId | INT | No | PK FK -> artists | Explicit input |
| ma_loi_moi | invitation_id | invitationId | INT | Yes | FK -> artist_invitations | NULL |
| trang_thai | status | status | ENUM(PARTICIPATING,NOT_PARTICIPATING,PENDING) | No | - | Explicit input |
| (added) | created_at | createdAt | TIMESTAMP(3) | No | - | now() |
| (added) | updated_at | updatedAt | TIMESTAMP(3) | No | - | now(); Prisma @updatedAt |

## EventAttendance (`event_attendances`)

Source: `LUOT_THAM_GIA`.

| Source field | SQL column | Prisma field | Native type | Nullable | Keys/reference | Default/update |
| --- | --- | --- | --- | --- | --- | --- |
| ma_luot | id | id | INT | No | PK | autoincrement() |
| ma_su_kien | special_event_id | specialEventId | INT | No | FK -> special_events | Explicit input |
| ma_dat_cho | event_booking_id | eventBookingId | INT | Yes | UNIQUE FK -> event_bookings | NULL |
| ten_lien_he | contact_name | contactName | VARCHAR(100) | Yes | - | NULL |
| sdt | phone | phone | VARCHAR(15) | Yes | - | NULL |
| (added) | created_at | createdAt | TIMESTAMP(3) | No | - | now() |
| (added) | updated_at | updatedAt | TIMESTAMP(3) | No | - | now(); Prisma @updatedAt |

## EventCheckIn (`event_check_ins`)

Source: `DOT_CHECK_IN`.

| Source field | SQL column | Prisma field | Native type | Nullable | Keys/reference | Default/update |
| --- | --- | --- | --- | --- | --- | --- |
| ma_dot | id | id | INT | No | PK | autoincrement() |
| ma_luot | attendance_id | attendanceId | INT | No | FK -> event_attendances | Explicit input |
| so_nguoi | guest_count | guestCount | SMALLINT UNSIGNED | No | - | Explicit input |
| ngay_tao | created_at | createdAt | TIMESTAMP(3) | No | - | now() |

## EventSurcharge (`event_surcharges`)

Source: `KHOAN_PHU_THU`.

| Source field | SQL column | Prisma field | Native type | Nullable | Keys/reference | Default/update |
| --- | --- | --- | --- | --- | --- | --- |
| ma_phu_thu | id | id | INT | No | PK | autoincrement() |
| ma_dot | check_in_id | checkInId | INT | No | UNIQUE FK -> event_check_ins | Explicit input |
| ma_don | order_id | orderId | INT | Yes | FK -> orders | NULL |
| don_gia | unit_price | unitPrice | INT UNSIGNED | No | - | Explicit input |
| thanh_tien | amount | amount | INT UNSIGNED | No | - | Explicit input |
| (added) | created_at | createdAt | TIMESTAMP(3) | No | - | now() |
| (added) | updated_at | updatedAt | TIMESTAMP(3) | No | - | now(); Prisma @updatedAt |

## RoomRental (`room_rentals`)

Source: `LUOT_THUE_PHONG`.

| Source field | SQL column | Prisma field | Native type | Nullable | Keys/reference | Default/update |
| --- | --- | --- | --- | --- | --- | --- |
| ma_luot_thue | id | id | INT | No | PK | autoincrement() |
| ma_dat_phong | room_booking_id | roomBookingId | INT | Yes | FK -> room_bookings | NULL |
| ma_phong | room_id | roomId | INT | No | FK -> study_rooms | Explicit input |
| ma_don_tien_phong | room_charge_order_id | roomChargeOrderId | INT | Yes | FK -> orders | NULL |
| ten_lien_he | contact_name | contactName | VARCHAR(100) | Yes | - | NULL |
| sdt | phone | phone | VARCHAR(15) | Yes | - | NULL |
| so_nguoi | guest_count | guestCount | TINYINT UNSIGNED | No | - | Explicit input |
| gio_nhan | checked_in_at | checkedInAt | TIMESTAMP(3) | No | - | Explicit input |
| gio_tra | checked_out_at | checkedOutAt | TIMESTAMP(3) | Yes | - | NULL |
| don_gia_gio | hourly_rate | hourlyRate | INT UNSIGNED | No | - | Explicit input |
| thoi_luong_toi_thieu_phut | minimum_duration_minutes | minimumDurationMinutes | SMALLINT UNSIGNED | No | - | Explicit input |
| khoi_lam_tron_phut | rounding_minutes | roundingMinutes | SMALLINT UNSIGNED | No | - | Explicit input |
| thanh_tien | amount | amount | INT UNSIGNED | Yes | - | NULL |
| (added) | created_at | createdAt | TIMESTAMP(3) | No | - | now() |
| (added) | updated_at | updatedAt | TIMESTAMP(3) | No | - | now(); Prisma @updatedAt |
| (added) | expected_checkout_at | expectedCheckoutAt | TIMESTAMP(3) | No | - | Explicit input |

## Order (`orders`)

Source: `DON_HANG`.

| Source field | SQL column | Prisma field | Native type | Nullable | Keys/reference | Default/update |
| --- | --- | --- | --- | --- | --- | --- |
| ma_don | id | id | INT | No | PK | autoincrement() |
| ma_ca | created_in_shift_id | createdInShiftId | INT | No | FK -> cashier_shifts | Explicit input |
| hinh_thuc_phuc_vu | service_type | serviceType | ENUM(DINE_IN,STUDY_ROOM,TAKEAWAY) | No | - | Explicit input |
| ma_ban | dining_table_id | diningTableId | INT | Yes | FK -> dining_tables | NULL |
| ma_luot_thue | room_rental_id | roomRentalId | INT | Yes | FK -> room_rentals | NULL |
| trang_thai | status | status | ENUM(OPEN,PAID,CANCELLED) | No | - | Explicit input |
| tong_tien | total_amount | totalAmount | INT UNSIGNED | No | - | Explicit input |
| ngay_tao | created_at | createdAt | TIMESTAMP(3) | No | - | now() |
| (added) | updated_at | updatedAt | TIMESTAMP(3) | No | - | now(); Prisma @updatedAt |

## OrderItem (`order_items`)

Source: `CHI_TIET_DON`.

| Source field | SQL column | Prisma field | Native type | Nullable | Keys/reference | Default/update |
| --- | --- | --- | --- | --- | --- | --- |
| ma_chi_tiet | id | id | INT | No | PK | autoincrement() |
| ma_don | order_id | orderId | INT | No | FK -> orders | Explicit input |
| ma_mon | menu_item_id | menuItemId | INT | No | FK -> menu_items | Explicit input |
| so_luong | quantity | quantity | SMALLINT UNSIGNED | No | - | Explicit input |
| so_da_lam | prepared_quantity | preparedQuantity | SMALLINT UNSIGNED | No | - | 0 |
| so_huy | cancelled_quantity | cancelledQuantity | SMALLINT UNSIGNED | No | - | 0 |
| don_gia | unit_price | unitPrice | INT UNSIGNED | No | - | Explicit input |
| ghi_chu | notes | notes | VARCHAR(255) | Yes | - | NULL |
| ngay_tao | created_at | createdAt | TIMESTAMP(3) | No | - | now() |
| (added) | updated_at | updatedAt | TIMESTAMP(3) | No | - | now(); Prisma @updatedAt |

## PaymentTransaction (`payment_transactions`)

Source: `GIAO_DICH`.

| Source field | SQL column | Prisma field | Native type | Nullable | Keys/reference | Default/update |
| --- | --- | --- | --- | --- | --- | --- |
| ma_giao_dich | id | id | INT | No | PK | autoincrement() |
| ma_ca | received_in_shift_id | receivedInShiftId | INT | No | FK -> cashier_shifts | Explicit input |
| loai | kind | kind | ENUM(COLLECTION,REFUND) | No | - | Explicit input |
| phuong_thuc | method | method | ENUM(CASH,BANK_TRANSFER) | No | - | Explicit input |
| so_tien | amount | amount | INT UNSIGNED | No | - | Explicit input |
| trang_thai | status | status | ENUM(PENDING,SUCCEEDED,RECONCILIATION_REQUIRED) | No | - | Explicit input |
| tien_khach_dua | cash_tendered | cashTendered | INT UNSIGNED | Yes | - | NULL |
| noi_dung | transfer_content | transferContent | VARCHAR(255) | Yes | - | NULL |
| ma_tham_chieu_ngan_hang | bank_reference | bankReference | VARCHAR(50) | Yes | UNIQUE | NULL |
| ngay_tao | created_at | createdAt | TIMESTAMP(3) | No | - | now() |
| (added) | updated_at | updatedAt | TIMESTAMP(3) | No | - | now(); Prisma @updatedAt |

## PaymentAllocation (`payment_allocations`)

Source: `PHAN_BO_THU`.

| Source field | SQL column | Prisma field | Native type | Nullable | Keys/reference | Default/update |
| --- | --- | --- | --- | --- | --- | --- |
| ma_phan_bo | id | id | INT | No | PK | autoincrement() |
| ma_giao_dich | transaction_id | transactionId | INT | No | FK -> payment_transactions | Explicit input |
| so_tien | amount | amount | INT UNSIGNED | No | - | Explicit input |
| ma_don | order_id | orderId | INT | Yes | FK -> orders | NULL |
| ma_phu_thu | event_surcharge_id | eventSurchargeId | INT | Yes | FK -> event_surcharges | NULL |
| ma_luot_thue | room_rental_id | roomRentalId | INT | Yes | FK -> room_rentals | NULL |
| (added) | created_at | createdAt | TIMESTAMP(3) | No | - | now() |

## Receipt (`receipts`)

Source: `BIEN_LAI`.

| Source field | SQL column | Prisma field | Native type | Nullable | Keys/reference | Default/update |
| --- | --- | --- | --- | --- | --- | --- |
| ma_bien_lai | id | id | INT | No | PK | autoincrement() |
| ma_giao_dich | transaction_id | transactionId | INT | No | UNIQUE FK -> payment_transactions | Explicit input |
| ngay_tao | created_at | createdAt | TIMESTAMP(3) | No | - | now() |

## ItemCancellationRequest (`item_cancellation_requests`)

Source: `YEU_CAU_HUY`.

| Source field | SQL column | Prisma field | Native type | Nullable | Keys/reference | Default/update |
| --- | --- | --- | --- | --- | --- | --- |
| ma_yc_huy | id | id | INT | No | PK | autoincrement() |
| ma_chi_tiet | order_item_id | orderItemId | INT | No | FK -> order_items | Explicit input |
| so_luong | quantity | quantity | SMALLINT UNSIGNED | No | - | Explicit input |
| ly_do | reason | reason | VARCHAR(255) | No | - | Explicit input |
| ngay_tao | created_at | createdAt | TIMESTAMP(3) | No | - | now() |

## RefundRequest (`refund_requests`)

Source: `YEU_CAU_HOAN`.

| Source field | SQL column | Prisma field | Native type | Nullable | Keys/reference | Default/update |
| --- | --- | --- | --- | --- | --- | --- |
| ma_yc_hoan | id | id | INT | No | PK | autoincrement() |
| ma_phan_bo | allocation_id | allocationId | INT | No | FK -> payment_allocations | Explicit input |
| so_tien | amount | amount | INT UNSIGNED | No | - | Explicit input |
| ly_do | reason | reason | VARCHAR(255) | No | - | Explicit input |
| trang_thai | status | status | ENUM(PENDING_APPROVAL,APPROVED,REJECTED,COMPLETED,FAILED) | No | - | Explicit input |
| ngay_tao | created_at | createdAt | TIMESTAMP(3) | No | - | now() |
| ma_nv_duyet | reviewer_id | reviewerId | INT | Yes | FK -> employees | NULL |
| can_cu | approval_basis | approvalBasis | VARCHAR(255) | Yes | - | NULL |
| ngay_duyet | approved_at | approvedAt | TIMESTAMP(3) | Yes | - | NULL |
| ma_giao_dich_hoan | refund_transaction_id | refundTransactionId | INT | Yes | UNIQUE FK -> payment_transactions | NULL |
| (added) | updated_at | updatedAt | TIMESTAMP(3) | No | - | now(); Prisma @updatedAt |

## CashierShift (`cashier_shifts`)

Source: `CA_QUAY`.

| Source field | SQL column | Prisma field | Native type | Nullable | Keys/reference | Default/update |
| --- | --- | --- | --- | --- | --- | --- |
| ma_ca | id | id | INT | No | PK | autoincrement() |
| ma_nv | employee_id | employeeId | INT | No | FK -> employees | Explicit input |
| ma_ca_truoc | previous_shift_id | previousShiftId | INT | Yes | UNIQUE FK -> cashier_shifts | NULL |
| ngay_mo | opened_at | openedAt | TIMESTAMP(3) | No | - | Explicit input |
| ngay_dong | closed_at | closedAt | TIMESTAMP(3) | Yes | - | NULL |
| tien_bo_sung | opening_cash_adjustment | openingCashAdjustment | INT | No | - | 0 |
| tien_thuc_dem | counted_cash | countedCash | INT UNSIGNED | Yes | - | NULL |
| giai_trinh | explanation | explanation | VARCHAR(255) | Yes | - | NULL |
| (added) | created_at | createdAt | TIMESTAMP(3) | No | - | now() |
| (added) | updated_at | updatedAt | TIMESTAMP(3) | No | - | now(); Prisma @updatedAt |

## ExpenseEntry (`expense_entries`)

Source: `KHOAN_CHI_PHI`.

| Source field | SQL column | Prisma field | Native type | Nullable | Keys/reference | Default/update |
| --- | --- | --- | --- | --- | --- | --- |
| ma_khoan | id | id | INT | No | PK | autoincrement() |
| chi_tieu | category | category | ENUM(F,H1,H2,H3,H4,H5) | No | - | Explicit input |
| so_tien | amount | amount | INT UNSIGNED | No | - | Explicit input |
| ngay_phat_sinh | occurred_on | occurredOn | DATE | No | - | Explicit input |
| so_chung_tu | document_number | documentNumber | VARCHAR(50) | Yes | - | NULL |
| can_cu_phan_bo | allocation_basis | allocationBasis | VARCHAR(255) | Yes | - | NULL |
| noi_dung | description | description | VARCHAR(255) | No | - | Explicit input |
| (added) | created_at | createdAt | TIMESTAMP(3) | No | - | now() |
| (added) | updated_at | updatedAt | TIMESTAMP(3) | No | - | now(); Prisma @updatedAt |

## ProfitReport (`profit_reports`)

Source: `BAO_CAO_LOI_NHUAN`.

| Source field | SQL column | Prisma field | Native type | Nullable | Keys/reference | Default/update |
| --- | --- | --- | --- | --- | --- | --- |
| ma_bao_cao | id | id | INT | No | PK | autoincrement() |
| tu_ngay | from_date | fromDate | DATE | No | - | Explicit input |
| den_ngay | to_date | toDate | DATE | No | - | Explicit input |
| phien_ban | version | version | SMALLINT UNSIGNED | No | - | Explicit input |
| trang_thai | status | status | ENUM(PROVISIONAL,CHECKED) | No | - | Explicit input |
| tinh_trang_du_lieu | data_completeness | dataCompleteness | ENUM(COMPLETE,MISSING_DATA) | No | - | Explicit input |
| ngay_tao | created_at | createdAt | TIMESTAMP(3) | No | - | now() |
| ma_nv_kiem_tra | reviewer_id | reviewerId | INT | Yes | FK -> employees | NULL |
| ngay_kiem_tra | checked_at | checkedAt | TIMESTAMP(3) | Yes | - | NULL |
| ghi_chu | notes | notes | TEXT | Yes | - | NULL |
| (added) | updated_at | updatedAt | TIMESTAMP(3) | No | - | now(); Prisma @updatedAt |

## ProfitReportLine (`profit_report_lines`)

Source: `CHI_TIEU_BAO_CAO`.

| Source field | SQL column | Prisma field | Native type | Nullable | Keys/reference | Default/update |
| --- | --- | --- | --- | --- | --- | --- |
| ma_bao_cao | report_id | reportId | INT | No | PK FK -> profit_reports | Explicit input |
| chi_tieu | id | id | ENUM(A,B,C,D,F,H1,H2,H3,H4,H5) | No | PK | Explicit input |
| so_tien | amount | amount | INT UNSIGNED | Yes | - | NULL |
| tinh_trang | data_status | dataStatus | ENUM(AVAILABLE,NO_ACTIVITY,MISSING_DATA) | No | - | Explicit input |
| ghi_chu | notes | notes | VARCHAR(255) | Yes | - | NULL |
| (added) | created_at | createdAt | TIMESTAMP(3) | No | - | now() |
| (added) | updated_at | updatedAt | TIMESTAMP(3) | No | - | now(); Prisma @updatedAt |

## Enum translations

Each mapping preserves the corresponding source meaning; report codes and existing English audit actions remain unchanged.

### NHAN_VIEN.trang_thai -> EmployeeStatus

`HoatDong` -> `ACTIVE`, `NghiViec` -> `INACTIVE`.

### VAI_TRO.ten -> RoleName

`Admin` -> `ADMIN`, `NVSK` -> `EVENT_STAFF`, `NVBH` -> `SALES_STAFF`.

### MA_XAC_THUC.muc_dich -> VerificationPurpose

`DatLaiMatKhau` -> `PASSWORD_RESET`, `XacThucEmail` -> `EMAIL_VERIFICATION`.

### MON.trang_thai -> MenuItemStatus

`DangBan` -> `AVAILABLE`, `HetHang` -> `OUT_OF_STOCK`, `NgungBan` -> `DISCONTINUED`.

### KHU_VUC.loai -> AreaKind

`Thuong` -> `REGULAR`, `Acoustic` -> `ACOUSTIC`.

### KHU_VUC.trang_thai -> AreaStatus

`HoatDong` -> `ACTIVE`, `NgungHoatDong` -> `INACTIVE`.

### BAN.trang_thai -> DiningTableStatus

`HoatDong` -> `ACTIVE`, `NgungSuDung` -> `INACTIVE`.

### BAN.tinh_trang -> TableOccupancy

`Trong` -> `VACANT`, `DangPhucVu` -> `OCCUPIED`.

### PHONG_HOC.trang_thai -> StudyRoomStatus

`HoatDong` -> `ACTIVE`, `BaoTri` -> `MAINTENANCE`.

### DAT_PHONG.kenh -> BookingChannel

`Online` -> `ONLINE`, `DatHo` -> `STAFF_ASSISTED`.

### DAT_CHO_SU_KIEN.kenh -> BookingChannel

`Online` -> `ONLINE`, `DatHo` -> `STAFF_ASSISTED`.

### DAT_PHONG.trang_thai -> RoomBookingStatus

`GiuCho` -> `HELD`, `DaNhan` -> `CHECKED_IN`, `DaHuy` -> `CANCELLED`, `KhongDen` -> `NO_SHOW`.

### DAT_CHO_SU_KIEN.trang_thai -> EventBookingStatus

`GiuCho` -> `HELD`, `DaDenMotPhan` -> `PARTIALLY_ARRIVED`, `DaDen` -> `ARRIVED`, `DaHuy` -> `CANCELLED`, `KhongDen` -> `NO_SHOW`, `HetHanGiu` -> `HOLD_EXPIRED`.

### CHUONG_TRINH.loai -> ProgramKind

`DacBiet` -> `SPECIAL`, `DinhKy` -> `RECURRING`.

### CHUONG_TRINH.trang_thai -> ProgramStatus

`Nhap` -> `DRAFT`, `DaCongBo` -> `PUBLISHED`, `DaHuy` -> `CANCELLED`.

### PHIEN_BAN_LICH.trang_thai -> ScheduleVersionStatus

`Nhap` -> `DRAFT`, `DaChot` -> `FINALIZED`, `DaCongBo` -> `PUBLISHED`, `BiThayThe` -> `SUPERSEDED`.

### MOC_CHUONG_TRINH.loai -> ScheduleSlotKind

`Soundcheck` -> `SOUNDCHECK`, `BieuDien` -> `PERFORMANCE`, `Nghi` -> `BREAK`, `ChuanBi` -> `PREPARATION`.

### HO_SO_NGHE_SI.loai -> ArtistKind

`CaNhan` -> `SOLO`, `BanNhac` -> `BAND`.

### HO_SO_NGHE_SI.trang_thai -> ArtistStatus

`HopTac` -> `ACTIVE`, `NgungHopTac` -> `INACTIVE`.

### LOI_MOI.trang_thai -> InvitationStatus

`ChoPhanHoi` -> `PENDING`, `DaXacNhan` -> `ACCEPTED`, `TuChoi` -> `DECLINED`, `HetHan` -> `EXPIRED`, `BiThayThe` -> `SUPERSEDED`.

### PHAN_CONG.trang_thai -> AssignmentStatus

`ThamGia` -> `PARTICIPATING`, `KhongThamGia` -> `NOT_PARTICIPATING`, `ChuaTraLoi` -> `PENDING`.

### DON_HANG.hinh_thuc_phuc_vu -> OrderServiceType

`TaiBan` -> `DINE_IN`, `PhongHoc` -> `STUDY_ROOM`, `MangDi` -> `TAKEAWAY`.

### DON_HANG.trang_thai -> OrderStatus

`Mo` -> `OPEN`, `DaThu` -> `PAID`, `DaHuy` -> `CANCELLED`.

### GIAO_DICH.loai -> TransactionKind

`Thu` -> `COLLECTION`, `Hoan` -> `REFUND`.

### GIAO_DICH.phuong_thuc -> PaymentMethod

`TienMat` -> `CASH`, `ChuyenKhoan` -> `BANK_TRANSFER`.

### GIAO_DICH.trang_thai -> TransactionStatus

`ChoXacNhan` -> `PENDING`, `ThanhCong` -> `SUCCEEDED`, `CanDoiSoat` -> `RECONCILIATION_REQUIRED`.

### YEU_CAU_HOAN.trang_thai -> RefundStatus

`ChoDuyet` -> `PENDING_APPROVAL`, `DaDuyet` -> `APPROVED`, `TuChoi` -> `REJECTED`, `HoanTat` -> `COMPLETED`, `Loi` -> `FAILED`.

### KHOAN_CHI_PHI.chi_tieu -> ExpenseCategory

`F` -> `F`, `H1` -> `H1`, `H2` -> `H2`, `H3` -> `H3`, `H4` -> `H4`, `H5` -> `H5`.

### BAO_CAO_LOI_NHUAN.trang_thai -> ProfitReportStatus

`TamTinh` -> `PROVISIONAL`, `DaKiemTra` -> `CHECKED`.

### BAO_CAO_LOI_NHUAN.tinh_trang_du_lieu -> DataCompleteness

`DayDu` -> `COMPLETE`, `ThieuDuLieu` -> `MISSING_DATA`.

### CHI_TIEU_BAO_CAO.chi_tieu -> ReportLineCode

`A` -> `A`, `B` -> `B`, `C` -> `C`, `D` -> `D`, `F` -> `F`, `H1` -> `H1`, `H2` -> `H2`, `H3` -> `H3`, `H4` -> `H4`, `H5` -> `H5`.

### CHI_TIEU_BAO_CAO.tinh_trang -> ReportLineStatus

`CoDuLieu` -> `AVAILABLE`, `KhongPhatSinh` -> `NO_ACTIVITY`, `ThieuDuLieu` -> `MISSING_DATA`.

## Audit action catalog

Existing actions from source page 05:

`LOGIN_SUCCESS`, `LOGIN_FAILED`, `LOGOUT`, `SESSION_EXPIRED`, `PASSWORD_RESET`, `OTP_REQUESTED`, `OTP_VERIFIED`, `OTP_FAILED`, `OTP_EXPIRED`, `USER_CREATED`, `USER_UPDATED`, `USER_SUSPENDED`, `ROLE_ASSIGNED`, `ROLE_REVOKED`, `RECORD_CREATED`, `RECORD_UPDATED`, `RECORD_DELETED`, `PROGRAM_PUBLISHED`, `PROGRAM_CANCELLED`, `SCHEDULE_FINALIZED`, `RECURRING_GENERATED`, `INVITATION_SENT`, `INVITATION_RESPONDED`, `BOOKING_CREATED`, `BOOKING_CANCELLED`, `BOOKING_HOLD_RELEASED`, `CHECKIN_RECORDED`, `SURCHARGE_ASSIGNED`, `ROOM_CHECKED_IN`, `ROOM_EXTENDED`, `ROOM_MOVED`, `ROOM_CHECKED_OUT`, `ORDER_CREATED`, `ORDER_ITEMS_CHANGED`, `ITEM_PREPARED`, `ITEM_CANCELLED`, `TABLE_RELEASED`, `PAYMENT_CONFIRMED`, `PAYMENT_MISMATCH`, `RECEIPT_ISSUED`, `RECEIPT_REPRINTED`, `REFUND_REQUESTED`, `REFUND_APPROVED`, `REFUND_REJECTED`, `REFUND_COMPLETED`, `SHIFT_OPENED`, `REPORT_CREATED`, `REPORT_CHECKED`, `REPORT_EXPORTED`, `SHIFT_CLOSED`.

Added: `RECORD_SOFT_DELETED` and `RECORD_RESTORED`. Both use the directory table name, its English primary-key object, and `deleted_at` before/after values in the details payload. No audit-target FK is added.

All source payload identifiers must use the English fields above. For example ROOM_MOVED uses `from_rental_id`, `to_rental_id`, `from_room_id`, `to_room_id`, and `order_id`; ROOM_EXTENDED uses `previous_expected_checkout_at` and `expected_checkout_at`.

## SQL-only definitions

CHECK constraints, opaque identifier collations, and `v_payment_allocation_orders` are authored in the migration. They are not recreated by a plain Prisma schema diff. See the design and verification report for mutation, source-tracing and soft-delete semantics.

The migration explicitly selects InnoDB. Binary `utf8mb4_bin` comparison applies to `auth_sessions.id`, both invitation tokens, `verification_codes.code_hash`, `employees.password_hash`, and `payment_transactions.bank_reference`. Their source lengths and nullability remain unchanged; ordinary text retains `utf8mb4_unicode_ci`.
