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
        'profile.update': '/settings/profile',
        'profile.destroy': '/settings/profile',
        'user-password.edit': '/settings/password',
        'user-password.update': '/settings/password',
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

/**
 * Create a route object with form() method for Inertia forms
 * This mimics wayfinder's form variant functionality
 */
export function routeWithForm(name: string, httpMethod: string = 'post'): { 
    url: string;
    form: () => { action: string; method: string };
} {
    const url = route(name);
    const formMethod = httpMethod.toLowerCase() === 'delete' || httpMethod.toLowerCase() === 'put' || httpMethod.toLowerCase() === 'patch' 
        ? 'post' 
        : httpMethod.toLowerCase();
    
    return {
        url,
        form: () => {
            const action = httpMethod.toLowerCase() === 'delete' || httpMethod.toLowerCase() === 'put' || httpMethod.toLowerCase() === 'patch'
                ? `${url}?_method=${httpMethod.toUpperCase()}`
                : url;
            
            return {
                action,
                method: formMethod,
            };
        },
    };
}

/**
 * Create a route function that returns an object with url property
 * Used for navigation links
 */
export function routeWithUrl(name: string): () => { url: string } {
    const url = route(name);
    return () => ({ url });
}

