/**
 * Route metadata — single source of truth for auth/admin guards.
 *
 * Paths mirror PAGE_TO_PATH in App.tsx exactly so existing URL sync
 * keeps working unchanged. Once Phase 4 lands, App.tsx will import
 * PAGE_TO_PATH_CONFIG / PATH_TO_PAGE_CONFIG from here and drop its
 * own copies.
 *
 * Nothing imports this file yet — it is wired in incrementally.
 */

export type PageName =
    | 'login' | 'createPassword' | 'onboarding'
    | 'sourcing' | 'factoryDetail' | 'factoryCatalog' | 'factoryTools' | 'factorySuggestions'
    | 'orderForm' | 'quoteRequest' | 'quoteDetail' | 'myQuotes'
    | 'crm' | 'tracking' | 'billing' | 'trending'
    | 'profile' | 'teamSettings' | 'settings'
    | 'adminDashboard' | 'adminUsers' | 'adminUserAnalytics'
    | 'adminRFQ' | 'adminCRM' | 'adminFactories' | 'adminTrending' | 'adminLoginSettings';

export interface RouteConfig {
    page: PageName;
    /** Must match the path in App.tsx PAGE_TO_PATH exactly */
    path: string;
    protected: boolean;
    adminOnly: boolean;
}

export const ROUTES: readonly RouteConfig[] = [
    // Auth — public
    { page: 'login',              path: '/login',                protected: false, adminOnly: false },
    { page: 'createPassword',     path: '/create-password',      protected: false, adminOnly: false },
    { page: 'onboarding',         path: '/onboarding',           protected: true,  adminOnly: false },
    // Buyer — protected
    { page: 'sourcing',           path: '/sourcing',             protected: true,  adminOnly: false },
    { page: 'factoryDetail',      path: '/factory',              protected: true,  adminOnly: false },
    { page: 'factoryCatalog',     path: '/factory/catalog',      protected: true,  adminOnly: false },
    { page: 'factoryTools',       path: '/factory/tools',        protected: true,  adminOnly: false },
    { page: 'factorySuggestions', path: '/factories',            protected: true,  adminOnly: false },
    { page: 'orderForm',          path: '/order',                protected: true,  adminOnly: false },
    { page: 'quoteRequest',       path: '/quote/new',            protected: true,  adminOnly: false },
    { page: 'quoteDetail',        path: '/quote',                protected: true,  adminOnly: false },
    { page: 'myQuotes',           path: '/my-quotes',            protected: true,  adminOnly: false },
    { page: 'crm',                path: '/crm',                  protected: true,  adminOnly: false },
    { page: 'tracking',           path: '/tracking',             protected: true,  adminOnly: false },
    { page: 'billing',            path: '/billing',              protected: true,  adminOnly: false },
    { page: 'trending',           path: '/trending',             protected: true,  adminOnly: false },
    { page: 'profile',            path: '/profile',              protected: true,  adminOnly: false },
    { page: 'teamSettings',       path: '/team',                 protected: true,  adminOnly: false },
    { page: 'settings',           path: '/settings',             protected: true,  adminOnly: false },
    // Admin — protected + adminOnly
    { page: 'adminDashboard',     path: '/admin',                protected: true,  adminOnly: true  },
    { page: 'adminUsers',         path: '/admin/users',          protected: true,  adminOnly: true  },
    { page: 'adminUserAnalytics', path: '/admin/analytics',      protected: true,  adminOnly: true  },
    { page: 'adminRFQ',           path: '/admin/rfq',            protected: true,  adminOnly: true  },
    { page: 'adminCRM',           path: '/admin/crm',            protected: true,  adminOnly: true  },
    { page: 'adminFactories',     path: '/admin/factories',      protected: true,  adminOnly: true  },
    { page: 'adminTrending',      path: '/admin/trending',       protected: true,  adminOnly: true  },
    { page: 'adminLoginSettings', path: '/admin/login-settings', protected: true,  adminOnly: true  },
] as const;

/** O(1) guard lookup: ROUTE_MAP.get('billing')?.protected */
export const ROUTE_MAP = new Map<PageName, RouteConfig>(
    ROUTES.map(r => [r.page, r])
);

// Future Phase 4: replace App.tsx's local PAGE_TO_PATH / PATH_TO_PAGE with these.
export const PAGE_TO_PATH_CONFIG: Record<string, string> = Object.fromEntries(
    ROUTES.map(r => [r.page, r.path])
);
export const PATH_TO_PAGE_CONFIG: Record<string, string> = Object.fromEntries(
    ROUTES.map(r => [r.path, r.page])
);
