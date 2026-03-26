import { Router, Request, Response } from 'express';
import { browsePath } from '../services/filesystem.service.js';
import { getErrorMessage } from '../utils/db.js';

const router = Router();

router.get('/browse', (req: Request, res: Response) => {
  try {
    const requestedPath = req.query.path as string | undefined;
    const result = browsePath(requestedPath);
    res.json(result);
  } catch (err) {
    const message = getErrorMessage(err, 'Failed to browse path');
    res.status(400).json({ error: message });
  }
});

export default router;
