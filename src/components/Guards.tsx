import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useStore } from '../../store';

/**
 * RequireProfile guard forces the user to complete their profile
 * (name, birthday, notificationEmail) before proceeding.
 */
export const RequireProfile: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { state, authLoading } = useStore();
    const location = useLocation();

    if (authLoading) return null; // Wait for store to be ready

    const user = state.user;
    const isProfileIncomplete = !user?.name || !user?.birthday || !user?.notificationEmail;

    if (isProfileIncomplete) {
        console.log('[Guard] Profile incomplete. Redirecting to /profile');
        return <Navigate to="/profile" state={{ from: location }} replace />;
    }

    return <>{children}</>;
};

/**
 * RequireTeam guard forces the user to be part of a team
 * before accessing the dashboard or team-specific resources.
 */
export const RequireTeam: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { state, authLoading } = useStore();
    const location = useLocation();

    if (authLoading) return null;

    const hasNoTeam = !state.team || !state.user?.activeTeamId;

    if (hasNoTeam) {
        console.log('[Guard] No active team. Redirecting to /team-setup');
        return <Navigate to="/team-setup" state={{ from: location }} replace />;
    }

    return <>{children}</>;
};
