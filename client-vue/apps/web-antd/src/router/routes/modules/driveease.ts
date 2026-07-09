import type { RouteRecordRaw } from 'vue-router';

/**
 * DriveEase 业务菜单（对应原 React 端的 10 个页面）。
 * 保单查询（列表 + 详情抽屉 + 激活/退保/删除）、保单录入（客户+车辆+保费一体表单）均已实现。
 */
const routes: RouteRecordRaw[] = [
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('#/views/dashboard/index.vue'),
    meta: { title: '仪表盘', icon: 'lucide:layout-dashboard', order: 1 },
  },
  {
    path: '/customers',
    name: 'Customer',
    component: () => import('#/views/customer/index.vue'),
    meta: { title: '客户管理', icon: 'lucide:users', order: 2 },
  },
  {
    path: '/vehicles',
    name: 'Vehicle',
    component: () => import('#/views/vehicle/index.vue'),
    meta: { title: '车辆管理', icon: 'lucide:car', order: 3 },
  },
  {
    path: '/policies',
    name: 'Policy',
    redirect: '/policies/query',
    meta: { title: '保单管理', icon: 'lucide:file-text', order: 4 },
    children: [
      {
        path: 'query',
        name: 'PolicyQuery',
        component: () => import('#/views/policy/index.vue'),
        meta: { title: '保单查询' },
      },
      {
        path: 'create',
        name: 'PolicyCreate',
        component: () => import('#/views/policy/create.vue'),
        meta: { title: '保单录入' },
      },
    ],
  },
  {
    path: '/insurance-companies',
    name: 'InsuranceCompany',
    component: () => import('#/views/insurance-company/index.vue'),
    meta: { title: '保险公司管理', icon: 'lucide:building-2', order: 5 },
  },
  {
    path: '/compulsory-insurances',
    name: 'CompulsoryInsurance',
    component: () => import('#/views/compulsory-insurance/index.vue'),
    meta: { title: '交强险管理', icon: 'lucide:shield-check', order: 6 },
  },
  {
    path: '/commercial-insurances',
    name: 'CommercialInsurance',
    component: () => import('#/views/commercial-insurance/index.vue'),
    meta: { title: '商业险管理', icon: 'lucide:shield', order: 7 },
  },
  {
    path: '/renewals',
    name: 'Renewal',
    component: () => import('#/views/renewal/index.vue'),
    meta: { title: '续保管理', icon: 'lucide:refresh-cw', order: 8 },
  },
  {
    path: '/users',
    name: 'User',
    component: () => import('#/views/user/index.vue'),
    meta: { title: '用户管理', icon: 'lucide:user-cog', order: 9 },
  },
  {
    path: '/logs',
    name: 'Log',
    component: () => import('#/views/log/index.vue'),
    meta: { title: '操作日志', icon: 'lucide:file-search', order: 10 },
  },
];

export default routes;
