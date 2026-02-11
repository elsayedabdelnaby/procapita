/**
 * Route helper function that mimics Laravel's route() helper
 * This is a fallback when wayfinder is not available
 */
export function route(name: string, params?: Record<string, any> | any): string {
    // This is a simple implementation
    // In production, wayfinder would generate proper route URLs
    // For now, we'll use a basic mapping
    const routes: Record<string, string> = {
        'dashboard': '/dashboard',
        'login': '/login',
        'register': '/register',
        'logout': '/logout',
        'home': '/',
        'password.update': '/user/password',
        'password.request': '/forgot-password',
        'password.email': '/forgot-password',
        'password.confirm': '/user/confirm-password',
        'verification.send': '/email/verification-notification',
        'two-factor.qr-code': '/user/two-factor-authentication/qr-code',
        'two-factor.recovery-codes': '/user/two-factor-recovery-codes',
        'two-factor.secret-key': '/user/two-factor-secret-key',
        'two-factor.show': '/settings/two-factor',
        'two-factor.disable': '/user/two-factor-authentication',
        'two-factor.enable': '/user/two-factor-authentication',
        'two-factor.confirm': '/user/confirmed-two-factor-authentication',
        'two-factor.login': '/two-factor-challenge',
        'profile.edit': '/settings/profile',
        'user-password.edit': '/settings/password',
        'appearance.edit': '/settings/appearance',
    };

    let url = routes[name] || `/${name.replace('.', '/')}`;
    
    // Handle parameters (basic implementation)
    if (params) {
        if (typeof params === 'object') {
            Object.keys(params).forEach(key => {
                url = url.replace(`{${key}}`, params[key]);
            });
        }
    }
    
    return url;
}

