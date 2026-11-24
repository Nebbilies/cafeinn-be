import { BlockList, isIP } from 'node:net';
import nodemailer from 'nodemailer';
import { readEnvironment } from '../../config/env.ts';

const loopback = new BlockList();
loopback.addSubnet('127.0.0.0', 8);
loopback.addAddress('::1', 'ipv6');

export async function sendMail({ to, subject, text }: { to: string; subject: string; text: string }) {
  const env = readEnvironment();
  const family = isIP(env.SMTP_HOST);
  const isLoopback = env.SMTP_HOST.toLowerCase() === 'localhost' ||
    (family !== 0 && loopback.check(env.SMTP_HOST, family === 4 ? 'ipv4' : 'ipv6'));
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    requireTLS: !isLoopback,
    connectionTimeout: 5000,
    socketTimeout: 10000,
  });
  await transport.sendMail({
    from: env.SMTP_FROM,
    to,
    subject,
    text,
  });
}
