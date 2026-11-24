-- Existing roles receive the staff grants. An empty database is populated by the seed.
SET @staff_grants = JSON_OBJECT(
    'ADMIN', JSON_ARRAY(
        'users.manage', 'reports.read', 'menu.manage', 'tables.manage', 'rooms.manage',
        'refunds.approve', 'expenses.manage', 'policies.manage', 'audit.read'
    ),
    'EVENT_STAFF', JSON_ARRAY('events.manage'),
    'SALES_STAFF', JSON_ARRAY('sales.manage', 'menu.status', 'refunds.request')
);

START TRANSACTION;

INSERT INTO permissions (code, updated_at)
SELECT DISTINCT grant_list.code, CURRENT_TIMESTAMP(3)
FROM roles AS r
JOIN JSON_TABLE(JSON_EXTRACT(@staff_grants, CONCAT('$.', r.name)), '$[*]'
    COLUMNS (code VARCHAR(50) PATH '$')) AS grant_list ON TRUE
LEFT JOIN permissions AS p ON p.code = CONVERT(grant_list.code USING utf8mb4) COLLATE utf8mb4_unicode_ci
WHERE p.id IS NULL;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles AS r
JOIN JSON_TABLE(JSON_EXTRACT(@staff_grants, CONCAT('$.', r.name)), '$[*]'
    COLUMNS (code VARCHAR(50) PATH '$')) AS grant_list ON TRUE
JOIN permissions AS p ON p.code = CONVERT(grant_list.code USING utf8mb4) COLLATE utf8mb4_unicode_ci
LEFT JOIN role_permissions AS rp ON rp.role_id = r.id AND rp.permission_id = p.id
WHERE rp.role_id IS NULL;

DELETE rp
FROM role_permissions AS rp
JOIN roles AS r ON r.id = rp.role_id
JOIN permissions AS p ON p.id = rp.permission_id
WHERE CASE WHEN r.name = 'ADMIN'
    THEN p.code IN ('sales.manage', 'events.manage')
    ELSE p.code = 'reports.read'
END;

COMMIT;
SET @staff_grants = NULL;
