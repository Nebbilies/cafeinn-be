import mariadb, { type PoolConfig } from 'mariadb';
import { databaseUrlSchema } from '../config/env.ts';

// Driver-specific callback option types are outside this URL-based contract.
export function createDatabaseOptions(databaseUrl: string): Omit<PoolConfig, 'typeCast' | 'logger'> {
  try {
    const url = new URL(databaseUrlSchema.parse(databaseUrl));
    if (!url.hostname || url.pathname.length < 2 || url.hash) throw new Error();
    url.protocol = 'mariadb:';
    // The driver's connection defaults omit pool-only URL options.
    const queryOptions = Object.fromEntries([...url.searchParams].map(([key, value]) => {
      let parsed: unknown = value;
      if (/^[{[]/.test(value) || /^(true|false|-?\d+(\.\d+)?)$/.test(value)) {
        parsed = JSON.parse(value) as unknown;
      }
      return [key, parsed];
    }));
    const options: PoolConfig = {
      ...queryOptions,
      ...mariadb.defaultOptions({ ...mariadb.defaultOptions(url.toString()), ...queryOptions }),
    };
    if (typeof options.ssl === 'object' && options.ssl.rejectUnauthorized === false) throw new Error();
    const initialization = options.initSql === undefined ? [] :
      Array.isArray(options.initSql) ? options.initSql : [options.initSql];
    return {
      ...options,
      timezone: '+00:00',
      sessionVariables: { ...options.sessionVariables, time_zone: '+00:00' },
      initSql: [...initialization, "SET SESSION time_zone = '+00:00'"],
    };
  } catch {
    // Driver parser errors may contain the complete URL, including credentials.
    throw new Error('Invalid database connection configuration.');
  }
}
