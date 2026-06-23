/**
 * Returns the correct post-login destination based on role priority.
 * Priority: ADMIN > MENTOR > fallback (player/default).
 *
 * Accepts null/undefined safely — the BE may return null for roles on edge cases.
 */
export const getRoleBasedRedirect = (roles: string[] | null | undefined): string => {
    if (!Array.isArray(roles)) return '/home';
    if (roles.includes('ADMIN')) return '/admin/dashboard';
    if (roles.includes('MENTOR')) return '/mentor/dashboard';
    return '/home';
};
