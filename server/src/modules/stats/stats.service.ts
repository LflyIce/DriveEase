import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import dayjs from 'dayjs';

@Injectable()
export class StatsService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async getDashboard(): Promise<any> {
    const today = dayjs().format('YYYY-MM-DD');
    // 近 6 个月桶：本月 + 前 5 个月
    const trendStart = dayjs().subtract(5, 'month').startOf('month').format('YYYY-MM-DD');

    const one = async (sql: string, params?: any[]) => {
      const rows = (await this.dataSource.query(sql, params)) as any[];
      return rows[0]?.count ?? 0;
    };

    const [
      todayPolicyCount,
      trafficPremiumTotal,
      commercialPremiumTotal,
      sumInsuredTotal,
      employeeRanking,
      vehicleTypeStats,
      insuranceMix,
      premiumMixRow,
      premiumTrend,
    ] = await Promise.all([
      // KPI：当天保单数（今天投保且生效）
      one("SELECT COUNT(*) as count FROM policy WHERE policy_date = ? AND status = '生效'", [
        today,
      ]),
      // KPI：交强 / 商业 / 保额总和（排除已退保）
      one(
        "SELECT COALESCE(SUM(traffic_premium), 0) as count FROM policy WHERE status <> '已退保'",
      ),
      one(
        "SELECT COALESCE(SUM(commercial_premium), 0) as count FROM policy WHERE status <> '已退保'",
      ),
      one(
        "SELECT COALESCE(SUM(sum_insured), 0) as count FROM policy WHERE status <> '已退保'",
      ),
      // 员工开单数：以启用员工为基准（含 0 单）+ 末尾「未分配」行
      this.getEmployeeRanking(),
      // 车辆类型（JOIN vehicle）
      this.dataSource.query(
        "SELECT COALESCE(NULLIF(v.vehicle_type, ''), '未分类') AS name, COUNT(*) AS value FROM policy p JOIN vehicle v ON v.id = p.vehicle_id WHERE p.status <> '已退保' GROUP BY v.vehicle_type",
      ),
      // 险种占比（按保单数）
      this.dataSource.query(
        "SELECT insurance_type AS name, COUNT(*) AS value FROM policy WHERE status <> '已退保' GROUP BY insurance_type",
      ),
      // 保费占比（交强 / 商业 / 非车=非车1+非车2）
      this.dataSource.query(
        "SELECT COALESCE(SUM(traffic_premium), 0) AS traffic, COALESCE(SUM(commercial_premium), 0) AS commercial, COALESCE(SUM(COALESCE(surcharge_premium, 0) + COALESCE(surcharge_premium2, 0)), 0) AS surcharge FROM policy WHERE status <> '已退保'",
      ),
      // 保费趋势（近 6 个月，按月）
      this.dataSource.query(
        "SELECT strftime('%Y-%m', policy_date) AS month, COALESCE(SUM(premium), 0) AS premium FROM policy WHERE policy_date >= ? AND status <> '已退保' GROUP BY month",
        [trendStart],
      ),
    ]);

    const pm = (premiumMixRow as any[])?.[0] ?? {};
    return {
      todayPolicyCount,
      trafficPremiumTotal,
      commercialPremiumTotal,
      sumInsuredTotal,
      employeeRanking,
      vehicleTypeStats,
      insuranceMix,
      premiumMix: {
        traffic: Number(pm.traffic) || 0,
        commercial: Number(pm.commercial) || 0,
        surcharge: Number(pm.surcharge) || 0,
      },
      premiumTrend: (premiumTrend as any[]).map((r) => ({
        month: r.month,
        premium: Number(r.premium) || 0,
      })),
    };
  }

  /**
   * 员工开单数：以「启用用户」为基准 LEFT JOIN policy，0 单员工也列出；
   * 末尾追加一行「未分配」（sales_person 为空 / 业务员不在启用用户表），
   * 避免这些保单凭空消失、总数对不上。排序：员工按 value DESC，「未分配」恒定垫底。
   */
  private async getEmployeeRanking(): Promise<
    { name: string; value: number }[]
  > {
    const rows = (await this.dataSource.query(
      `SELECT name, value FROM (
         SELECT u.username AS name, COUNT(p.id) AS value, 0 AS sort_grp
         FROM user u
         LEFT JOIN policy p ON p.sales_person = u.username AND p.status <> '已退保'
         WHERE u.status = '启用'
         GROUP BY u.id, u.username
         UNION ALL
         SELECT '未分配' AS name, COUNT(*) AS value, 1 AS sort_grp
         FROM policy p
         WHERE p.status <> '已退保'
           AND ( p.sales_person IS NULL OR p.sales_person = ''
                 OR p.sales_person NOT IN (SELECT username FROM user WHERE status = '启用') )
       ) `,
    )) as any[];
    return rows.map((r) => ({ name: r.name, value: Number(r.value) || 0 }));
  }
}
