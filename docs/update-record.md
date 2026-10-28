# 车辆保单管理系统 — 更新记录

## 2026-04-28 商业险管理模块

### 背景

- 商业险险种数量较多，固定写在开单表格中不便维护。
- 开单时需要从可维护的商业险种列表中勾选使用。

### 变更范围

- `server/src/database.js`
- `server/src/routes/commercialInsuranceTypes.js`
- `server/src/app.js`
- `server/src/seed.js`
- `client/src/services/api.js`
- `client/src/app.jsx`
- `client/src/pages/CommercialInsurance/index.jsx`
- `client/src/pages/Policy/index.jsx`

### 更新内容

- 新增 `commercial_insurance_type` 商业险种表，内置常见商业险种初始数据。
- 新增商业险管理接口，支持列表、新增、编辑、删除和状态筛选。
- 新增“商业险管理”菜单和页面，用于维护商业险种名称、排序、状态和备注。
- 开单页商业险表格改为读取启用的商业险种动态生成行。
- 商业险表格每行增加“使用”勾选框，提交时只统计已勾选的商业险种。
- 保单保存时将已勾选商业险种及录入金额写入商业险明细 JSON。

### 验证记录

- 已执行：`npm run build -w client`
- 结果：构建通过。Vite 输出 chunk 体积提醒，未阻塞构建。
- 已检查：商业险种表初始化正常，商业险管理接口返回 200。
- 已检查：`http://localhost:5173/commercial-insurances` 返回 200。
- 已重启后端服务，当前 `3001` 端口已加载新接口。

## 2026-04-28 保费明细拆分与保单图片上传

### 背景

- 保费明细需要按交强险、商业险分别录入，避免不同险种混在同一张表里。
- 每个险种模块需要支持勾选启用，并补充对应保单图片上传。

### 变更范围

- `client/src/pages/Policy/index.jsx`
- `server/src/database.js`
- `server/src/routes/policies.js`

### 更新内容

- 保费明细区域拆分为“交强险”和“商业险”两个独立表格。
- 在交强险、商业险标题旁增加勾选框，勾选表示该险种启用。
- 交强险表格包含交强险与代收车船税明细。
- 商业险表格包含第三者责任险与车辆损失险明细。
- 两个险种模块均增加保单图片上传区域，支持图片上传并限制 10 张以内。
- 提交保单时按勾选状态自动计算保单险种、总保费和总保额。
- 后端新增 `compulsory_detail`、`commercial_detail` 字段，用于保存两类险种明细与图片信息。

### 验证记录

- 已执行：`npm run build -w client`
- 结果：构建通过。Vite 输出 chunk 体积提醒，未阻塞构建。
- 已检查：保单表新增明细字段已存在，保单路由模块可正常加载。

## 2026-04-28 保单字段与明细结构升级

### 背景

- 新增保单表单需要更贴近实际开单流程，补充开单时间、证件、保险公司、联系人与销售人员等业务字段。
- 投保人与车辆需要支持在新增保单页面快速新增，减少录单时来回切换模块。
- 险种选择从基础信息移动到保费明细区域，并改为上下两张表格呈现明细与汇总。

### 变更范围

- `client/src/pages/Policy/index.jsx`
- `server/src/database.js`
- `server/src/routes/policies.js`

### 更新内容

- 基础信息增加“开单时间”，默认当前时间；保单号改为自动生成且不可编辑。
- 投保人与车辆信息区支持新增投保人、新增车辆，并将投保人手机号独立展示。
- 保障与金额区增加保险生效日期、保险到期日期、证件类型、证件号码、保险公司、联系人、手机号、销售人员。
- 险种从基础信息移入保费明细区域；保费明细区域拆成险种明细表与费用汇总表。
- 后端保单表增加对应扩展字段，并在数据库初始化时自动兼容已有 SQLite 文件。
- 新增与编辑保单接口支持保存扩展字段，同时保留原起保/终保日期字段兼容旧列表与续保逻辑。

### 验证记录

- 已执行：`npm run build -w client`
- 结果：构建通过。Vite 输出 chunk 体积提醒，未阻塞构建。
- 已检查：保单路由模块可正常加载，保单表扩展字段已存在。
- 已检查：`http://localhost:5173/policies`、`http://localhost:5173/policies/query` 与保单列表接口均可访问。

## 2026-04-28 保单新增与查询入口拆分

### 背景

- 原保单管理页面以保单列表为主，通过工具栏按钮打开新增保单弹窗。
- 为贴合业务操作，将“做保单”和“查保单”拆成两个入口：点击保单模块直接进入新增保单页，查询保单通过页面右侧按钮进入。

### 变更范围

- `client/src/app.jsx`
- `client/src/pages/Policy/index.jsx`

### 更新内容

- 将 `/policies` 调整为新增保单页面，菜单点击“保单管理”后默认进入新增保单流程。
- 新增 `/policies/query` 查询页，用于保单检索、编辑、激活和删除。
- 在侧边栏“保单管理”菜单项右侧增加带边框的“查”入口，点击后进入查保单页面，符合保单模块内新增与查询并列的操作方式。
- 取消查询页头部的“新增保单”按钮区域，让查单页面保持单一查询职责。
- 保单字段表单抽取为复用结构，新增页与编辑弹窗共享字段、分区、联动和明细预览样式。

### 验证记录

- 已执行：`npm run build -w client`
- 结果：构建通过。Vite 输出 chunk 体积提醒，未阻塞构建。
- 已检查：`http://localhost:5173/policies`、`http://localhost:5173/policies/query` 与 `http://localhost:3001/api/policies?page=1&pageSize=1`
- 结果：页面与接口均返回 200。

## 2026-04-28 主页面头部能力优化

### 背景

- 根据主页面使用诉求，补充右上角常用入口：登录账号、通知、信息、主题。
- 当前系统已有用户接口但暂无完整登录页，因此前端优先读取本地当前用户；本地无登录态时默认使用测试账号 `admin`。

### 变更范围

- `client/src/app.jsx`
- `client/src/main.jsx`

### 更新内容

- 在 ProLayout 右上角增加通知入口与信息入口，当前作为占位按钮，暂不接入具体业务实现。
- 增加主题切换菜单，支持浅色主题、深色主题、紧凑主题，并将选择保存到本地。
- 增加当前登录账号显示，默认显示当前用户 `username`。
- 账号区域支持鼠标经过显示下拉菜单，包含“修改密码”和“退出登录”。
- 修改密码复用现有用户更新接口，提交时保留当前用户邮箱、手机号、角色和状态。
- 退出登录会清除本地当前用户并回到默认测试账号状态。

### 验证记录

- 已执行：`npm run build -w client`
- 结果：构建通过。Vite 输出 chunk 体积提醒，未阻塞构建。

## 2026-04-28 新增保单表单优化

### 背景

- 查看了项目设计文档、开发文档与实施计划，确认当前前端使用 React 18、Ant Design 5 与 ProComponents。
- 参考 `images/image.png` 中的业务单据式录入界面，对保单管理中的“新建保单/编辑保单”表单进行优化。

### 变更范围

- `client/src/pages/Policy/index.jsx`

### 更新内容

- 将原单列弹窗表单调整为宽版分区表单，分为基础信息、投保人与车辆信息、保障与金额、保费明细预览、备注。
- 新建保单时自动生成保单号，并默认填充起保日期、终保日期与待生效状态。
- 增加投保人与被保车辆联动，选择投保人后车辆列表自动收敛到对应车主车辆。
- 增加提交前的信息摘要与保费明细预览，集中展示投保人、车辆、车架号、保障期间、保额与保费。
- 编辑保单时保留状态修改能力；新建保单沿用系统默认待生效流程。

### 验证记录

- 已执行：`npm run build -w client`
- 结果：构建通过。Vite 输出 chunk 体积提醒，未阻塞构建。
- 已检查：`http://localhost:5173/policies` 与 `http://localhost:3001/api/policies?page=1&pageSize=1`
- 结果：页面与接口均返回 200。

## 2026-07-08 Vue-Vben 迁移与项目整理

### 背景

- 前端由 React 单栈引入 Vue-Vben Admin v5，新增 `client-vue/` 作为新前端，与 `client/` 双栈并存。
- 早期 `client-vue/` 被临时忽略在 `.gitignore` 之外、且残留了模板的嵌套 `.git`，导致新前端代码此前游离于版本控制。
- 4 份文档与 `CLAUDE.md` 全部只描述 React，`design-document.md` 的数据库设计失真（少 3 表 + 保单 12 个扩展列），且含未实现的"切换 MySQL"虚构内容。

### 变更范围

- 仓库：将 `client-vue/` 纳入版本控制、删除残留的 `client-vue/.git` 与模板身份文件、清理 `.agents/` 与 `.upload-git/`、整理 `main` 分支并将旧 React 历史归档到 tag `legacy/react`。
- 文档：重写 `design-document.md`（9 表全字段）/ `development-guide.md` / `deployment-startup.md`，更新 `CLAUDE.md` / `README.md`。

### 更新内容

- 前端：`client-vue/`（Vue 3 + Vben Admin v5）正式纳入仓库，迁移度约 85%（客户/车辆/险种/续保/用户/日志/仪表盘/登录已迁；**保单页 create/query 双模式待补**）；生产 env 待修、server 静态托管待切换，故 `client/` 暂保留为生产前端。
- 后端：`server/` 与 `client/` 配置不变；`POST /api/users/login` 由 client-vue 登录复用，确认保留（非死端点）。
- 文档：据实重写数据库设计（9 表 + policy 12 个扩展列 + JSON 明细列）、路由清单（10 组）、API 清单；移除虚构的"切换 MySQL"章节；如实标注 policy 双日期字段等 legacy 点。
- 清理：删除 `.agents/`、`.upload-git/`、`docs/plans/`，以及 `client-vue/` 的模板身份文件（README 三件套 / LICENSE / tea.yaml / code-workspace）。

### 验证记录

- 已确认：数据库设计与 `server/src/database.js` initDB 逐表一致；文档命令与各 `package.json` scripts 一致。
- 已确认：`POST /api/users/login` 被 client-vue 调用，未误删；client/ 仍为可用生产前端。

## 2026-10-27 极简开单（保单查询页左侧抽屉）

### 背景

- 业务员日常开单场景需要在微信聊天中随手收材料、快速建单，完整录入页（5 组表单）太重。
- 在保单查询页工具栏增加「开单」入口，从左侧抽屉完成极简开单，一步到位。

### 变更范围

- `client-vue/apps/web-antd/src/views/policy/modules/quick-create.vue`（新增）
- `client-vue/apps/web-antd/src/views/policy/data.ts`
- `client-vue/apps/web-antd/src/views/policy/index.vue`
- `client-vue/apps/web-antd/src/views/policy/modules/detail.vue`
- `CLAUDE.md`（补充 lefthook hooks 与前端校验说明，与本功能无关的文档修订）

后端零改动：完全复用 `POST /api/v1/policies/full` 聚合接口（客户按手机号 upsert、车辆按车牌新建、保单号自动生成、状态默认「待生效」）。

### 更新内容

- **入口**：保单查询页工具栏首位新增「＋ 开单」主按钮（`v-access:code="['policy:create']"`），点击从左侧打开开单抽屉（`placement="left"`，宽 520）。
- **表单字段**（单列）：客户名称、客户类型、手机号码、业务员（ApiSelect，默认当前登录人）、车牌号、保险公司、投保日期（默认今天）、保期（1/2/3/5/10 年按钮组，默认 1 年）——均必填；交强险保费、商业险保费、非车保费、备注——均可空。到期日期由「投保日期 + 保期 N 年」前端换算提交。
- **合计保费**：非表单字段的展示条（默认 ¥0.00），由三项保费联动自动求和（两位小数），不可手动填写。
- **保费映射**：交强/商业分项存 `trafficPremium`/`commercialPremium`；**非车保费沿用录入页既定映射存 `surchargePremium`**，两边口径一致；后端按交强/商业是否 >0 自动推导险种（交强险/商业险/综合）。
- **材料上传**：`Upload.Dragger` 双入口（点击选择 + 微信 PC 版聊天窗口直接拖入，多文件）；上传接 axios `onUploadProgress` → antd 列表项**实时进度条**；列表用 `listType="picture"` 紧凑行（48px 缩略图）；点击缩略图页内全屏预览（Esc/X/蒙层均可关、关闭即清空状态）；拖拽区内容显式 flex 居中 + 48px 主色云图标（`IconifyIcon` 用 Tailwind `size-*` 控制尺寸）。
- **材料存储**：多文件 URL 逗号拼接存 `policy.quotation`（其他承保材料）；详情页按逗号拆分逐张展示（多张时标签为「承保材料1/2/…」）。
- **业务约束提示**：抽屉内灰字提示「车牌需未录入过（续保走续保流程）；同手机号客户自动复用」；重复车牌由后端 400 拦截并全局 toast。
- **修复**（实现过程中发现的坑）：vben `formApi.validate()` 返回的 `values` 在适配层为空对象，改为项目惯例 `validate()` 只看 `valid` + `getValues()` 取值；`IconifyIcon`（@iconify/vue）不认 `:size` prop，尺寸须用 `size-*` class。

### 验证记录

- 已执行：`pnpm --filter @vben/web-antd typecheck`——13 个存量错误与改动前逐字一致，本次文件零错误。
- E2E（dev 环境实测）：左侧抽屉字段与默认值正确；必填逐项校验、手机号 11 位校验；13.8MB 大图上传进度条可见（截到 98%）；重复车牌被后端拒绝且无脏数据；正常开单 `POL-20261027-155028` 列表自动刷新（保费 ¥350.00、险种「综合」、到期=投保日+1 年、备注与材料 URL 落库核对一致）；详情页承保材料可预览。测试数据（保单/车辆/客户）均已删除。


## 2026-10-28 极简开单：商业险类型下拉 + 业务类型（续保/转保）

### 背景

- 极简开单需要标记商业险方案（只保三者，还是三者+车损），以及区分续保/转保业务。
- 续保/转保单的车牌此前必然已录入，被「一车一保单」校验拦死，需要放开为复用既有车辆。

### 变更范围

- server：`schema.ts`（policy 加 `commercial_kind`/`business_type`，ensureColumn 重启自动生效，无 CHECK）、`policy.entity.ts`、`create-policy-full.dto.ts`、`policies.service.ts`（createFull）
- client-vue：`policy/data.ts`、`policy/modules/quick-create.vue`、`policy/modules/detail.vue`、`policy/index.vue`、`api/policy.ts`

### 更新内容

- **表单**：「商业险保费」改为**下拉+输入框合体一行**（`InputNumber` 的 `addonBefore` 内嵌方案下拉：三者/三者+车损，默认**三者**；方案值不进表单，由 quick-create 的 ref 持有、提交时组装 `commercialKind`）；「保险公司」后新增「业务类型」按钮组（**续保默认**/转保，样式同保期）。
- **落库**：`policy.commercial_kind`、`policy.business_type`（自由 TEXT，历史数据为空显示 `-`）；统计口径不变（`commercial_premium` 金额列照旧）。
- **车辆复用**：`POST /policies/full` 带 `businessType` 时，车牌已存在不再 400，改为复用该车辆同挂新一期保单（客户仍按手机号复用/新建）；不带 `businessType`（保单录入页）保持一车一保单报错不变。抽屉顶部提示文案同步更新。
- **展示**：列表「险种」后加「业务类型」Tag 列（续保蓝/转保橙，空 `-`）；详情页基础信息加业务类型 Tag、保费明细加「商业险类型」。

### 验证记录

- 已执行：server `tsc --noEmit` 通过；`pnpm --filter @vben/web-antd typecheck`——13 个存量错误与 2026-10-27 记录逐字一致，本次文件零错误。
- API E2E（dev 环境实测，watch 重启后新列自动补齐）：同车牌带 `businessType=转保` 提交 → 成功且 `vehicleId` 复用原车辆、`businessType=转保`/`commercialKind=三者+车损` 落库正确；同车牌不带 `businessType` → 400「该车牌已录入」。
- UI E2E（Playwright 实测）：开单抽屉「商业险保费」一行渲染为 `[三者 ▾][金额输入框]`，无独立「商业险类型」行；方案下拉切到「三者+车损」后选中项即时更新（vben `computedProps` 是 computed，componentProps 函数内读 ref 会建立依赖 → 换值重渲）；完整走单（传材料+提交）抓包确认请求体含 `commercialKind:"三者+车损"`/`businessType:"续保"`，列表新增行「业务类型」列显示「续保」Tag。测试保单/车辆/材料已删除，临时 png 已清理。
- 坑：Git Bash 的 `curl -d` 直接内联中文会按本地编码发出（落库乱码），中文 JSON 体须经 UTF-8 文件 `--data-binary @file` 发送。

## 2026-10-28 保单查询：新增筛选条件 + 保费/保额底部合计

### 背景

- 保单查询只有关键字/状态筛选，缺业务员、业务类型、创建时间范围；保费/保额需要底部合计。
- `policy.created_at` 字段已存在（`DATETIME DEFAULT CURRENT_TIMESTAMP`，开单自动写当前时间，无需选择/传参），故只加查询条件，不动表结构。

### 变更范围

- server：`query-policy.dto.ts`（+`salesPerson`/`businessType`/`createdStart`/`createdEnd`）、`policies.controller.ts`、`policies.service.ts`（findMany 改收整个 DTO 对象）
- client-vue：`api/policy.ts`、`views/policy/data.ts`、`views/policy/index.vue`

### 更新内容

- **筛选条件**：`GET /policies` 的 WHERE 新增 `p.sales_person=?`、`p.business_type=?`、`p.created_at` 范围（止点无时间部分自动补 `23:59:59` 含当日）；与数据查询同一 WHERE，count/合计/行三者口径一致。搜索区新增：创建时间 RangePicker（提交时拆成 createdStart/createdEnd）、业务员 ApiSelect、业务类型 Select，均可清空、变更即查。
- **保费/保额合计**：count SQL 合并为 `COUNT(*) + SUM(premium) + SUM(sum_insured)`，响应新增 `premiumSum`/`sumInsuredSum`——**按当前筛选条件全量聚合，非当前页小计**（分页下页内合计会误导）；前端 vxe `showFooter + footerMethod`，footer 行在保费/保额列下方显示 `¥` 千分位合计，首列「合计」。
- **展示**：列表「到期日期」后新增「创建时间」列（`created_at` 截取 `YYYY-MM-DD HH:MM`）。

### 验证记录

- 已执行：server `tsc --noEmit` 通过；前端 typecheck 13 个存量错误不变，本次文件零错误。
- API E2E（7 组）：无筛选 pageSize=2 时 `premiumSum=3150`（全量 3 单，非页内 2 行）；`businessType=转保`→只命中测试单；`businessType=续保`→0；`salesPerson` 精确命中；`createdStart=当天`→含当日、`=次日`→0、`createdEnd=前日`→排除当日。
- UI E2E（Playwright）：搜索区四条件渲染正常、变更即查；筛选「转保」后 footer 由 ¥3,150.00 → ¥3,000.00 联动正确，合计列右对齐于保费/保额列下。测试保单/车辆已删除。

## 2026-10-28 非车查询模块 + 导航调整（车保查询/隐藏保单录入）

### 背景

- 车险之外的保单（雇主责任险/团意险/财产险等）需要独立的查询与极速开单入口。
- 导航调整：保单查询改名「车保查询」，「保单录入」暂时隐藏（开单统一走极速开单抽屉）。

### 变更范围

- server：`schema.ts`（新表 `non_vehicle_policy` + 非车权限码幂等补种）、新增 `modules/non-vehicle-policies/`（entity/dto×2/service/controller/module）、`app.module.ts`、`database.module.ts`、`seed.ts`（权限清单同步）
- client-vue：新增 `api/non-vehicle-policy.ts`、`views/non-vehicle-policy/`（index/data/quick-create/detail）、`router/routes/modules/driveease.ts`（改名+隐藏+新路由）、`router/guard.ts`（权限码冷启动一律重取）

### 更新内容

- **新表 `non_vehicle_policy`**：企业名称/险种(自由文本)/项目名称/负责人/联系电话/保额/保费/支出/结余/保险公司/业务员/起保时间/截止日期/附件(多URL逗号拼接)/创建时间(自动)。**结余=保费−支出，服务端计算为准**（前端只做展示条联动）。
- **API**：`GET/POST/DELETE /api/v1/non-vehicle-policies(+/:id)`；list 支持关键字(企业/项目/负责人/电话)+业务员+创建时间范围，响应附 `premiumSum`/`expensesSum`/`balanceSum`（筛选下全量聚合）；`POST` 挂 `nonvehicle:create`、`DELETE` 挂 `nonvehicle:delete`。
- **权限免 re-seed**：权限码（`menu:non-vehicle`/`nonvehicle:create`/`nonvehicle:delete`）在 `initSchema()` 末尾幂等补种并授给 admin 角色——旧库重启即生效；staff 等其他角色默认无（走「角色权限」UI 分配）。seed.ts 清单同步（新库播种一致）。
- **页面**：非车查询（工具栏「开单」+极速开单左侧抽屉+详情抽屉+删除；footer 合计保费/支出/结余）；附件 Dragger 与车保同一套（点击+微信拖拽+进度条+页内预览）。
- **导航**：保单查询→车保查询；保单录入 `hideInMenu`（路由保留）；非车查询挂 `menu:non-vehicle`。
- **修复**（过程中发现的存量 bug）：`guard.ts` 原来只在 accessCodes 为空时才补取——codes 随 access store 持久化到 localStorage 而 token 永不过期，导致后台新增/调整权限后已登录用户**永远**用旧码（新菜单 404）。改为每次冷启动一律重取（一次 GET）。

### 验证记录

- 已执行：server `tsc --noEmit` 通过；前端 typecheck 非车文件零错误（存量 13 个不变）。
- API E2E：开单（结余 8000−3000=5000 服务端算、created_at 自动）；list 合计/业务员/关键字筛选；详情（附件逗号拆分）；删除复原；staff（zhangsan）`/auth/me` 不含非车码且开单 403「当前角色无此操作权限」；admin `/auth/me` 含全部 32 码（权限补种生效）。
- UI E2E（Playwright）：侧边菜单显示 车保查询/非车查询 且**无保单录入**；非车页 footer 合计列就位；极速开单抽屉 12 项必填标号正确；保费/支出输入后结余条联动 ¥5000.00。测试数据已删除。
- 注意：新菜单码对已登录用户生效依赖上述 guard 修复（刷新即重取），否则需重新登录。

### 2026-10-28 补充：非车保单增加备注字段

- `non_vehicle_policy` 加 `remark TEXT`（建表 DDL + `ensureColumn` 双保险，重启自动补列）；entity/DTO/service 透传。
- 极速开单抽屉加「备注」Textarea（选填）；详情页末行展示（空显示 `-`）；列表不加列（与车保一致）。
- 验证：server tsc 通过；API 实测创建/详情 remark 落库读取一致（测试数据已删）。
