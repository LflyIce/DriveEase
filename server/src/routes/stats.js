import { Router } from 'express';
import { get } from '../database.js';
import dayjs from 'dayjs';

const router = Router();

router.get('/dashboard', (req, res) => {
  try {
    const today = dayjs().format('YYYY-MM-DD');
    const thirtyDaysLater = dayjs().add(30, 'day').format('YYYY-MM-DD');
    const monthStart = dayjs().startOf('month').format('YYYY-MM-DD');

    const customerCount = get('SELECT COUNT(*) as count FROM customer')?.count || 0;
    const vehicleCount = get('SELECT COUNT(*) as count FROM vehicle')?.count || 0;
    const policyCount = get('SELECT COUNT(*) as count FROM policy')?.count || 0;
    const activePolicies = get("SELECT COUNT(*) as count FROM policy WHERE status = '生效'")?.count || 0;
    const expiringPolicies = get(
      "SELECT COUNT(*) as count FROM policy WHERE status = '生效' AND end_date BETWEEN ? AND ?",
      [today, thirtyDaysLater]
    )?.count || 0;
    const monthlyNewPolicies = get(
      'SELECT COUNT(*) as count FROM policy WHERE created_at >= ?',
      [monthStart]
    )?.count || 0;

    res.json({ customerCount, vehicleCount, policyCount, activePolicies, expiringPolicies, monthlyNewPolicies });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
