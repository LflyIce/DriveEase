/**
 * 一次性清理：删除「原保单已不存在」的悬空续保记录。
 * 背景：旧版本删保单不清理 renewal_record（sql.js FK 不生效），遗留悬空行会让
 * 仪表盘「未来30天保单提醒」的保单号/客户/车牌显示为空。
 * 现版本已修复（policies.deleteOne 级联 + 查询 INNER JOIN 兜底），本脚本仅用于清理历史数据。
 *
 * ⚠️ 必须在后端服务停止时运行：sql.js 整库在内存，运行中的服务会用内存副本覆盖本文件的修改。
 *
 * 用法（仓库根）：  npm run cleanup:renewals -w server
 */
const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

(async () => {
  const dbFile = path.join(__dirname, '..', 'database.sqlite');
  if (!fs.existsSync(dbFile)) {
    console.error(`未找到数据库文件：${dbFile}`);
    process.exit(1);
  }

  // 用 require.resolve 定位 sql.js 的 dist 目录（wasm 与入口同目录；兼容 workspaces 提升布局）
  const distDir = path.dirname(require.resolve('sql.js'));
  const SQL = await initSqlJs({ locateFile: (f) => path.join(distDir, f) });
  const db = new SQL.Database(fs.readFileSync(dbFile));

  const orphans = db.exec(`
    SELECT r.id, r.old_policy_id, r.remind_date, r.status
    FROM renewal_record r
    WHERE r.old_policy_id NOT IN (SELECT id FROM policy)
       OR (r.new_policy_id IS NOT NULL AND r.new_policy_id NOT IN (SELECT id FROM policy))
  `);

  const rows = orphans.length ? orphans[0].values : [];
  if (rows.length === 0) {
    console.log('没有悬空续保记录，无需清理。');
    db.close();
    return;
  }

  console.log(`发现 ${rows.length} 条悬空续保记录：`);
  for (const [id, oldPolicyId, remindDate, status] of rows) {
    console.log(`  - renewal#${id}（指向已删保单#${oldPolicyId}，提醒日期 ${remindDate}，状态 ${status}）`);
  }

  db.run(`
    DELETE FROM renewal_record
    WHERE old_policy_id NOT IN (SELECT id FROM policy)
       OR (new_policy_id IS NOT NULL AND new_policy_id NOT IN (SELECT id FROM policy))
  `);

  fs.writeFileSync(dbFile, Buffer.from(db.export()));
  db.close();
  console.log('清理完成，已写回 database.sqlite。请重启后端服务。');
})();
