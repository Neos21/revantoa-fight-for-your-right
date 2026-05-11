import { index, route, type RouteConfig } from '@react-router/dev/routes';

export default [
  index('./pages/index/index.tsx'),
  
  route('admin'                 , './pages/admin/index.tsx'),
  route('admin/achievements/:id', './pages/admin/achievement.tsx'),  // eslint-disable-line
  route('admin/ai'              , './pages/admin/ai.tsx')
] satisfies RouteConfig;
