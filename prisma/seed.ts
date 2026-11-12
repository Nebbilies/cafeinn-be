import { parseArgs } from 'node:util';
import { randomBytes, scryptSync } from 'node:crypto';
import { buildDemoData, DEMO_PASSWORD } from './seed/demo-data.ts';
import { validateDemoData } from './seed/validate-data.ts';

async function main() {
  const { values } = parseArgs({ options: { 'dry-run': { type: 'boolean', default: false }, 'reference-date': { type: 'string' } }, strict: true });
  const referenceDate = values['reference-date'] ?? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(referenceDate) || !Number.isFinite(Date.parse(referenceDate)) || new Date(referenceDate).toISOString().slice(0, 10) !== referenceDate || referenceDate < '1971-01-01' || referenceDate > '2037-12-01') throw new Error('Use --reference-date YYYY-MM-DD between 1971-01-01 and 2037-12-01.');
  const data = buildDemoData(referenceDate);
  validateDemoData(data);
  if (values['dry-run']) {
    console.log('Dry-run validated; no database client created.');
    console.log(JSON.stringify({ referenceDate, counts: Object.fromEntries(Object.entries(data).map(([name, rows]) => [name, rows.length])) }, null, 2));
    return;
  }
  for (const employee of data.employee) {
    const salt = randomBytes(16).toString('hex');
    const digest = scryptSync(DEMO_PASSWORD, salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex');
    employee.passwordHash = `scrypt$16384$8$1$${salt}$${digest}`;
  }
  const { loadEnvironment } = await import('../src/config/load-env.ts');
  loadEnvironment();
  const { getPrisma, disconnectDatabase } = await import('../src/database/prisma.ts');
  try {
    const { populate } = await import('./seed/populate.ts');
    const result = await populate(getPrisma(), data, referenceDate);
    console.log(result === 'created' ? 'Demo seed created: 150 orders, 10 employee accounts.' : 'Demo seed already exists; no data changed.');
  } finally {
    await disconnectDatabase();
  }
}

main().catch(() => {
  console.error('Seed failed. Check arguments, dataset validation, and database availability/schema. Existing data is never reset; an initial population requires an empty migrated database.');
  process.exitCode = 1;
});
