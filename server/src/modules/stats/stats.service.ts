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
      todayVehiclePolicyCount,
      todayNonVehicleCount,
      trafficPremiumTotal,
      commercialPremiumTotal,
      vehicleSumInsuredTotal,
      nonVehicleSumInsuredTotal,
      employeeRanking,
      vehicleTypeStats,
      insuranceMix,
      premiumMixRow,
      nonVehiclePremium,
      premiumTrendVehicle,
      premiumTrendNonVehicle,
    ] = await Promise.all([
      // KPI：当天车保单数（今天投保且生效）；当天非车单数（今天创建——非车无状态字段，口径注明）
      one("SELECT COUNT(*) as count FROM policy WHERE policy_date = ? AND status = '生效'", [
        today,
      ]),
      one(
        'SELECT COUNT(*) as count FROM non_vehicle_policy WHERE strftime(\'%Y-%m-%d\', created_at) = ?',
        [today],
      ),
      // KPI：交强 / 商业 / 车保保额（排除已退保）；非车保额（非车无退保概念）
      one(
        "SELECT COALESCE(SUM(traffic_premium), 0) as count FROM policy WHERE status <> '已退保'",
      ),
      one(
        "SELECT COALESCE(SUM(commercial_premium), 0) as count FROM policy WHERE status <> '已退保'",
      ),
      one(
        "SELECT COALESCE(SUM(sum_insured), 0) as count FROM policy WHERE status <> '已退保'",
      ),
      one('SELECT COALESCE(SUM(sum_insured), 0) as count FROM non_vehicle_policy'),
      // 员工开单数（车保/非车分列）：以启用员工为基准（含 0 单）+ 末尾「未分配」行
      this.getEmployeeRanking(),
      // 车辆类型（JOIN vehicle）——车保专属
      this.dataSource.query(
        "SELECT COALESCE(NULLIF(v.vehicle_type, ''), '未分类') AS name, COUNT(*) AS value FROM policy p JOIN vehicle v ON v.id = p.vehicle_id WHERE p.status <> '已退保' GROUP BY v.vehicle_type",
      ),
      // 险种占比（按保单数）——车保专属
      this.dataSource.query(
        "SELECT insurance_type AS name, COUNT(*) AS value FROM policy WHERE status <> '已退保' GROUP BY insurance_type",
      ),
      // 保费占比：交强 / 商业 / 随车非车（车保单 surcharge 两列合计）；非车保单保费单独取
      this.dataSource.query(
        "SELECT COALESCE(SUM(traffic_premium), 0) AS traffic, COALESCE(SUM(commercial_premium), 0) AS commercial, COALESCE(SUM(COALESCE(surcharge_premium, 0) + COALESCE(surcharge_premium2, 0)), 0) AS surcharge FROM policy WHERE status <> '已退保'",
      ),
      one('SELECT COALESCE(SUM(premium), 0) as count FROM non_vehicle_policy'),
      // 保费趋势（近 6 个月，按月）：车保按投保日期、非车按起保时间，两条口径分开返回由前端并排展示
      this.dataSource.query(
        "SELECT strftime('%Y-%m', policy_date) AS month, COALESCE(SUM(premium), 0) AS premium FROM policy WHERE policy_date >= ? AND status <> '已退保' GROUP BY month",
        [trendStart],
      ),
      this.dataSource.query(
        "SELECT strftime('%Y-%m', start_date) AS month, COALESCE(SUM(premium), 0) AS premium FROM non_vehicle_policy WHERE start_date >= ? GROUP BY month",
        [trendStart],
      ),
    ]);

    const pm = (premiumMixRow as any[])?.[0] ?? {};
    // 两条口径按月合并成 [{month, vehicle, nonVehicle}]
    const trendMap = new Map<string, { month: string; nonVehicle: number; vehicle: number }>();
    const bucket = (month: string) => {
      let row = trendMap.get(month);
      if (!row) {
        row = { month, vehicle: 0, nonVehicle: 0 };
        trendMap.set(month, row);
      }
      return row;
    };
    for (const r of premiumTrendVehicle as any[]) {
      bucket(r.month).vehicle = Number(r.premium) || 0;
    }
    for (const r of premiumTrendNonVehicle as any[]) {
      bucket(r.month).nonVehicle = Number(r.premium) || 0;
    }
    return {
      todayVehiclePolicyCount,
      todayNonVehicleCount,
      trafficPremiumTotal,
      commercialPremiumTotal,
      vehicleSumInsuredTotal,
      nonVehicleSumInsuredTotal,
      employeeRanking,
      vehicleTypeStats,
      insuranceMix,
      premiumMix: {
        traffic: Number(pm.traffic) || 0,
        commercial: Number(pm.commercial) || 0,
        surcharge: Number(pm.surcharge) || 0,
        nonVehiclePremium: Number(nonVehiclePremium) || 0,
      },
      premiumTrend: [...trendMap.values()].sort((a, b) => a.month.localeCompare(b.month)),
    };
  }

  /**
   * 员工开单数（车保/非车分列）：以「启用用户」为基准，0 单员工也列出；
   * sales_person 为空 / 业务员不在启用用户表的单归入末行「未分配」（两来源分别累计后合并一行），
   * 避免这些保单凭空消失、总数对不上。排序：员工按（车保+非车）合计 DESC，「未分配」恒定垫底。
   * 三个小查询 + JS 合并（替代原单条 UNION SQL：两来源各自聚合更直白，且车保排除已退保、非车无状态）。
   */
  private async getEmployeeRanking(): Promise<
    { name: string; nonVehicle: number; vehicle: number }[]
  > {
    const [users, vehicleRows, nonVehicleRows] = await Promise.all([
      this.dataSource.query("SELECT username FROM user WHERE status = '启用'"),
      this.dataSource.query(
        "SELECT COALESCE(sales_person, '') AS sp, COUNT(*) AS c FROM policy WHERE status <> '已退保' GROUP BY COALESCE(sales_person, '')",
      ),
      this.dataSource.query(
        "SELECT COALESCE(sales_person, '') AS sp, COUNT(*) AS c FROM non_vehicle_policy GROUP BY COALESCE(sales_person, '')",
      ),
    ]);
    const vehicleMap = new Map(
      (vehicleRows as any[]).map((r) => [r.sp, Number(r.c) || 0]),
    );
    const nonVehicleMap = new Map(
      (nonVehicleRows as any[]).map((r) => [r.sp, Number(r.c) || 0]),
    );
    const result = (users as any[]).map((u) => ({
      name: u.username,
      vehicle: vehicleMap.get(u.username) ?? 0,
      nonVehicle: nonVehicleMap.get(u.username) ?? 0,
    }));
    const enabled = new Set(result.map((r) => r.name));
    const unassigned = { name: '未分配', vehicle: 0, nonVehicle: 0 };
    for (const [sp, c] of vehicleMap) {
      if (!sp || !enabled.has(sp)) unassigned.vehicle += c;
    }
    for (const [sp, c] of nonVehicleMap) {
      if (!sp || !enabled.has(sp)) unassigned.nonVehicle += c;
    }
    result.sort((a, b) => b.vehicle + b.nonVehicle - (a.vehicle + a.nonVehicle));
    result.push(unassigned);
    return result;
  }
}
