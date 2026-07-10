import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import dayjs from 'dayjs';

@Injectable()
export class StatsService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async getDashboard(): Promise<any> {
    const today = dayjs().format('YYYY-MM-DD');
    const thirtyDaysLater = dayjs().add(30, 'day').format('YYYY-MM-DD');
    const monthStart = dayjs().startOf('month').format('YYYY-MM-DD');

    const one = async (sql: string, params?: any[]) => {
      const rows = (await this.dataSource.query(sql, params)) as any[];
      return rows[0]?.count ?? 0;
    };

    const [customerCount, vehicleCount, policyCount, activePolicies, expiringPolicies, monthlyNewPolicies] =
      await Promise.all([
        one('SELECT COUNT(*) as count FROM customer'),
        one('SELECT COUNT(*) as count FROM vehicle'),
        one('SELECT COUNT(*) as count FROM policy'),
        one("SELECT COUNT(*) as count FROM policy WHERE status = '生效'"),
        one('SELECT COUNT(*) as count FROM policy WHERE status = ? AND end_date BETWEEN ? AND ?', [
          '生效',
          today,
          thirtyDaysLater,
        ]),
        one('SELECT COUNT(*) as count FROM policy WHERE created_at >= ?', [monthStart]),
      ]);

    return {
      customerCount,
      vehicleCount,
      policyCount,
      activePolicies,
      expiringPolicies,
      monthlyNewPolicies,
    };
  }
}
