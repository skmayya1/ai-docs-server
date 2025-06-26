import { Router } from 'express';

const router = Router();

router.get('/{*any}', (req, res) => {
  res.status(200).json({ message: 'Health Checkpoint ! Working' });
});

export default router;  