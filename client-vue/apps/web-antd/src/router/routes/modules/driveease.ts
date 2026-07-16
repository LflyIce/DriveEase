import type { RouteRecordRaw } from 'vue-router';

/**
 * DriveEase 业务菜单（对应业务页面）。
 * meta.menuCode 对应后端权限码（menu:*），guard.ts 据当前用户 accessCodes 过滤可见性；
 * 无 menuCode 的路由（未来扩展的详情页等）默认所有登录用户可见。
 */
declare module 'vue-router' {
  interface RouteMeta {
    menuCode?: string;
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('#/views/dashboard/index.vue'),
    meta: {
      hideInTab: true,
      icon: 'lucide:layout-dashboard',
      menuCode: 'menu:dashboard',
      order: 1,
      title: '仪表盘',
    },
  },
  {
    path: '/customers',
    name: 'Customer',
    component: () => import('#/views/customer/index.vue'),
    meta: { title: '客户管理', icon: 'lucide:users', menuCode: 'menu:customers', order: 2 },
  },
  {
    path: '/vehicles',
    name: 'Vehicle',
    component: () => import('#/views/vehicle/index.vue'),
    meta: { title: '车辆管理', icon: 'lucide:car', menuCode: 'menu:vehicles', order: 3 },
  },
  {
    path: '/policies',
    name: 'Policy',
    redirect: '/policies/query',
    meta: { title: '保单管理', icon: 'lucide:file-text', menuCode: 'menu:policies', order: 4 },
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
    meta: { title: '保险公司管理', icon: 'lucide:building-2', menuCode: 'menu:insurance-companies', order: 5 },
  },
  {
    path: '/compulsory-insurances',
    name: 'CompulsoryInsurance',
    component: () => import('#/views/compulsory-insurance/index.vue'),
    meta: { title: '交强险管理', icon: 'lucide:shield-check', menuCode: 'menu:compulsory-insurances', order: 6 },
  },
  {
    path: '/commercial-insurances',
    name: 'CommercialInsurance',
    component: () => import('#/views/commercial-insurance/index.vue'),
    meta: { title: '商业险管理', icon: 'lucide:shield', menuCode: 'menu:commercial-insurances', order: 7 },
  },
  {
    path: '/renewals',
    name: 'Renewal',
    component: () => import('#/views/renewal/index.vue'),
    meta: { title: '续保管理', icon: 'lucide:refresh-cw', menuCode: 'menu:renewals', order: 8 },
  },
  {
    path: '/users',
    name: 'User',
    component: () => import('#/views/user/index.vue'),
    meta: { title: '用户管理', icon: 'lucide:user-cog', menuCode: 'menu:users', order: 9 },
  },
  {
    path: '/logs',
    name: 'Log',
    component: () => import('#/views/log/index.vue'),
    meta: { title: '操作日志', icon: 'lucide:file-search', menuCode: 'menu:logs', order: 10 },
  },
  {
    path: '/rbac',
    name: 'Rbac',
    component: () => import('#/views/rbac/index.vue'),
    meta: { title: '角色权限', icon: 'lucide:shield', menuCode: 'menu:rbac', order: 11 },
  },
];

export default routes;
