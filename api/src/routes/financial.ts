import { Router } from 'express';
import { getFinancialDashboard } from '../services/report';

const router = Router();

router.get('/dashboard', async (req, res) => {
  try {
    const { month, year } = req.query;
    const data = await getFinancialDashboard(
      month ? parseInt(month as string) : undefined,
      year ? parseInt(year as string) : undefined
    );
    res.json(data);
  } catch (error) {
    console.error('Financial dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
