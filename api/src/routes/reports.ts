import express from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  getDashboardStats,
  getMonthlyReport,
  getVehicleIncomeReport,
  getDebtorReport,
  getFinancialDashboard,
  getOverallVehiclePerformance
} from '../services/report';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// GET /api/stats/today
router.get('/today', async (req, res) => {
  try {
    const { month, year } = req.query;
    const monthNum = month ? parseInt(month as string, 10) : undefined;
    const yearNum = year ? parseInt(year as string, 10) : undefined;
    
    const stats = await getDashboardStats(monthNum, yearNum);
    res.json(stats);
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/reports/monthly?year=YYYY
router.get('/monthly', async (req, res) => {
  try {
    const { year } = req.query;
    const yearNum = year ? parseInt(year as string, 10) : new Date().getFullYear();
    
    if (isNaN(yearNum)) {
      return res.status(400).json({ error: 'Invalid year parameter' });
    }

    const report = await getMonthlyReport(yearNum);
    res.json(report);
  } catch (error) {
    console.error('Get monthly report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/reports/vehicle-income
router.get('/vehicle-income', async (req, res) => {
  try {
    const report = await getVehicleIncomeReport();
    res.json(report);
  } catch (error) {
    console.error('Get vehicle income report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/debtors
router.get('/debtors', async (req, res) => {
  try {
    const debtors = await getDebtorReport();
    res.json(debtors);
  } catch (error) {
    console.error('Get debtors report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
