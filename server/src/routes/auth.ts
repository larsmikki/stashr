import { Router } from 'express';
import {
  isPasswordSet,
  verifyPassword,
  setPassword,
  removePassword,
  createSession,
  validateSession,
} from '../services/auth.service.js';

const router = Router();

// GET /api/auth/status — check if password is set and if current token is valid
router.get('/status', (req, res) => {
  const passwordSet = isPasswordSet();
  let authenticated = false;

  if (!passwordSet) {
    authenticated = true; // No password means everyone is authenticated
  } else {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      authenticated = validateSession(authHeader.slice(7));
    }
  }

  res.json({ passwordSet, authenticated });
});

// POST /api/auth/login — authenticate with password
router.post('/login', async (req, res) => {
  const { password } = req.body;
  if (!password || typeof password !== 'string') {
    res.status(400).json({ error: 'Password is required' });
    return;
  }

  const valid = await verifyPassword(password);
  if (!valid) {
    res.status(401).json({ error: 'Incorrect password' });
    return;
  }

  const token = createSession();
  res.json({ token });
});

// POST /api/auth/password — set or change password
router.post('/password', async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!newPassword || typeof newPassword !== 'string') {
    res.status(400).json({ error: 'New password is required' });
    return;
  }

  // If password is already set, require current password
  if (isPasswordSet()) {
    // Must be authenticated
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ') || !validateSession(authHeader.slice(7))) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!currentPassword || typeof currentPassword !== 'string') {
      res.status(400).json({ error: 'Current password is required' });
      return;
    }

    const valid = await verifyPassword(currentPassword);
    if (!valid) {
      res.status(401).json({ error: 'Current password is incorrect' });
      return;
    }
  }

  await setPassword(newPassword);
  const token = createSession();
  res.json({ status: 'ok', token });
});

// DELETE /api/auth/password — remove password protection
router.delete('/password', async (req, res) => {
  if (!isPasswordSet()) {
    res.status(400).json({ error: 'No password is set' });
    return;
  }

  // Must be authenticated
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ') || !validateSession(authHeader.slice(7))) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const { currentPassword } = req.body;
  if (!currentPassword || typeof currentPassword !== 'string') {
    res.status(400).json({ error: 'Current password is required' });
    return;
  }

  const valid = await verifyPassword(currentPassword);
  if (!valid) {
    res.status(401).json({ error: 'Current password is incorrect' });
    return;
  }

  removePassword();
  res.json({ status: 'ok' });
});

export default router;
