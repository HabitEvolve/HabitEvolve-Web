// Decouples the logout trigger from AuthContext so axiosClient can call logout
// without creating a circular dependency chain:
//   AuthContext → authApi → axiosClient → AuthContext  ← would break module init
//
// Instead:
//   AuthContext → authBridge  (registers callback)
//   axiosClient → authBridge  (calls it on 401)
let _logoutCallback: (() => void) | null = null;

export const registerLogoutCallback = (fn: () => void): void => {
    _logoutCallback = fn;
};

export const triggerLogout = (): void => {
    _logoutCallback?.();
};
