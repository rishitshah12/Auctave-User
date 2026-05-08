/**
 * ProtectedRoute — Phase 3 component, not wired into any route yet.
 *
 * Usage (once pages are extracted to individual <Route> elements):
 *
 *   <Route path="/billing" element={
 *     <ProtectedRoute isAuthReady={isAuthReady} user={user}>
 *       <BillingPage />
 *     </ProtectedRoute>
 *   } />
 *
 *   <Route path="/admin/rfq" element={
 *     <ProtectedRoute isAuthReady={isAuthReady} user={user} isAdmin={isAdmin} adminOnly>
 *       <AdminRFQPage {...layoutProps} />
 *     </ProtectedRoute>
 *   } />
 */
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { KnittingPreloader } from '../KnittingPreloader';

interface Props {
    children: React.ReactNode;
    isAuthReady: boolean;
    user: unknown;
    isAdmin?: boolean;
    adminOnly?: boolean;
}

export function ProtectedRoute({ children, isAuthReady, user, isAdmin = false, adminOnly = false }: Props) {
    const location = useLocation();

    if (!isAuthReady) return <KnittingPreloader fullScreen />;

    if (!user) {
        // Preserve the intended destination so LoginPage can redirect back after sign-in
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (adminOnly && !isAdmin) {
        return <Navigate to="/sourcing" replace />;
    }

    return <>{children}</>;
}
