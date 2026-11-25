type TriggerConnection = {
  query(sql: string): Promise<unknown>;
  end(): Promise<void>;
};

/** Takes ownership of a fresh connection to the validated disposable test database. */
export async function withRollbackTrigger(
  connection: TriggerConnection,
  run: () => Promise<void>,
) {
  let created = false;
  try {
    await connection.query(
      "CREATE TRIGGER program_test_rollback BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.action = 'RECURRING_GENERATED' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'program_test_rollback: RECURRING_GENERATED'; END IF; END",
    );
    created = true;
    await run();
  } finally {
    try {
      if (created) await connection.query("DROP TRIGGER program_test_rollback");
    } finally {
      await connection.end();
    }
  }
}
