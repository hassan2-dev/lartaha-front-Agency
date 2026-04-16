// Route constants for better maintainability
export const ROUTES = {
  // Public routes
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  SIGNUP: '/signup', // Redirects to register
  INVITE: '/invite/:token?',

  // App routes (authenticated)
  APP: {
    BASE: '/dashboard',
    DASHBOARD: '/dashboard',
    TASKS: '/dashboard/tasks',
    UPLOAD: '/dashboard/upload',
    CHAT: '/dashboard/chat',
    TEAMS: '/dashboard/teams',
    ACTIVITY: '/dashboard/activity',
    SETTINGS: '/dashboard/settings',
    PROFILE: '/dashboard/profile',
  },

  // Route groups
  PUBLIC: ['/', '/login', '/register', '/signup', '/invite/:token?'],

  AUTHENTICATED: [
    '/dashboard',
    '/dashboard/tasks',
    '/dashboard/upload',
    '/dashboard/chat',
    '/dashboard/teams',
    '/dashboard/activity',
    '/dashboard/settings',
    '/dashboard/profile',
  ],

  ADMIN_ONLY: ['/dashboard/teams'],
} as const

// Navigation items for SideNav
export const NAVIGATION_ITEMS = [
  { text: 'الرئيسية', icon: 'Home', path: ROUTES.APP.DASHBOARD },
  { text: 'رفع الملفات', icon: 'Upload', path: ROUTES.APP.UPLOAD },
  { text: 'المهام', icon: 'Task', path: ROUTES.APP.TASKS },
  { text: 'الدردشة', icon: 'Chat', path: ROUTES.APP.CHAT },
  { text: 'الفرق', icon: 'Teams', path: ROUTES.APP.TEAMS },
  { text: 'الأنشطة', icon: 'Activity', path: ROUTES.APP.ACTIVITY },
  { text: 'الإعدادات', icon: 'Settings', path: ROUTES.APP.SETTINGS },
] as const

// Route guards
export const ROUTE_GUARDS = {
  PUBLIC: 'public',
  AUTHENTICATED: 'authenticated',
  ADMIN: 'admin',
} as const

export type RouteGuard = (typeof ROUTE_GUARDS)[keyof typeof ROUTE_GUARDS]
