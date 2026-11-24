ALTER TABLE employees ADD CONSTRAINT employees_username_no_at CHECK (username NOT LIKE '%@%');
ALTER TABLE employees MODIFY phone VARCHAR(15) NULL, ADD failed_logins INTEGER NOT NULL DEFAULT 0, ADD locked_until TIMESTAMP(3) NULL;
ALTER TABLE auth_sessions ADD token_digest CHAR(64) NULL, ADD UNIQUE INDEX auth_sessions_token_digest_key(token_digest);
UPDATE auth_sessions SET expires_at = CURRENT_TIMESTAMP(3) WHERE token_digest IS NULL;
