/** Validate before either Prisma or the standalone trigger connection can be opened. */
export function programTestDatabaseUrl(value: string | undefined): string {
  if (!value) {
    throw new Error("PROGRAM_TEST_DATABASE_URL must select an isolated migrated local test database.");
  }
  try {
    const url = new URL(value);
    if (
      url.protocol !== "mysql:" ||
      !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
      !/^\/cafeinn_program_test_[a-z0-9_]+$/.test(url.pathname) ||
      url.search !== "" || url.hash !== ""
    ) throw new Error();
    return value;
  } catch {
    // Never include a credential-bearing URL or parser error in test-runner output.
    throw new Error("Refusing a non-local, non-test or query-configured database.");
  }
}
