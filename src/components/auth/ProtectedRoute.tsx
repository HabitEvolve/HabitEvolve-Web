import React from 'react';
import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../../context/AuthContext';

interface ProtectedRouteProps {
    allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
    const { isAuthenticated, hasRole } = useAuth();

    if (!isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    if (allowedRoles && allowedRoles.length > 0) {
        const isAuthorized = allowedRoles.some(role => hasRole(role));
        if (!isAuthorized) {
            return <Navigate to="/unauthorized" replace />;
        }
    }

    return <Outlet />;
};

export default ProtectedRoute;
