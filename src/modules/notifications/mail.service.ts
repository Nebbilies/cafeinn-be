import nodemailer from 'nodemailer';
import { readEnvironment } from '../../config/env.ts';

export async function sendMail({ to, subject, text }: { to: string; subject: string; text: string }) {
  const env = readEnvironment();
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
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
