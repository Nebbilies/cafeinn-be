import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

function derive(password: string, salt: string, cost: number) {
  return new Promise<Buffer>((resolve, reject) =>
    scrypt(password, salt, 64, { N: cost, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (error, key) =>
      error ? reject(error) : resolve(key),
    ),
  );
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const digest = await derive(password, salt, 32768);
  return ['v1', 'scrypt', '32768', '8', '1', salt, digest.toString('hex')].join('$');
}

export async function verifyPassword(password: string, hash: string) {
  const match = /^(v1\$scrypt\$32768|scrypt\$16384)\$8\$1\$([a-f0-9]{32})\$([a-f0-9]{128})$/.exec(hash);
  if (!match) return false;
  const digest = await derive(password, match[2], match[1].startsWith('v1') ? 32768 : 16384);
  return timingSafeEqual(digest, Buffer.from(match[3], 'hex'));
}
