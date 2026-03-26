import type { Request, Response, NextFunction } from 'express';
import { isPasswordSet, validateSession } from '../services/auth.service.js';

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Skip if no password is set (app is open)
  if (!isPasswordSet()) {
    next();
    return;
  }

  // Check for Bearer token in header or query param (for img/video src URLs)
  const authHeader = req.headers.authorization;
  const queryToken = req.query.token as string | undefined;

  let token: string | undefined;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else if (queryToken) {
    token = queryToken;
  }

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  if (!validateSession(token)) {
    res.status(401).json({ error: 'Invalid or expired session' });
    return;
  }

  next();
}
