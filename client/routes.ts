import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
  index('./pages/index/index.tsx'),
  route('admin', './pages/admin/index.tsx'),
  route('admin/achievements/ : id', './pages/admin/achievement-detail.tsx')
] satisfies RouteConfig;
