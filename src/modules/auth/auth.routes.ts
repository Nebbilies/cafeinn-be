import { Router } from 'express';
import { loginBody, requestBody, resetBody } from './auth.schema.ts';
import { absoluteMs, authorize, login, logout } from './auth.service.ts';
import { transaction } from '../../database/transaction.ts';
import { cookieName, rateLimit, requireToken, sessionToken } from './auth-cookie.ts';
import { requestRecovery, resetPassword } from './recovery.service.ts';

export function authRoutes(secure: boolean) {
  const router = Router();
  const options = { path: '/api/v1', httpOnly: true, sameSite: 'lax' as const, secure };
  router.post('/login', rateLimit(30), async (req, res) => {
    const body = loginBody.parse(req.body);
    const result = await login(body.identifier, body.password);
    res.cookie(cookieName, result.token, { ...options, maxAge: absoluteMs }).json(result.staff);
  });
  router.get('/session', async (req, res) => {
    const token = requireToken(req);
    res.json(await transaction((tx) => authorize(tx, token)));
  });
  router.post('/logout', async (req, res) => {
    await logout(sessionToken(req));
    res.clearCookie(cookieName, options).sendStatus(204);
  });
  router.use('/recovery', rateLimit(20));
  router.post('/recovery/request', async (req, res) => {
    await requestRecovery(requestBody.parse(req.body).email);
    res.sendStatus(204);
  });
  router.post('/recovery/reset', async (req, res) => {
    const { email, code, password } = resetBody.parse(req.body);
    await resetPassword(email, code, password);
    res.sendStatus(204);
  });
  return router;
}
