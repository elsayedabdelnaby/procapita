/**
 * Wayfinder types and utilities
 * This is a fallback implementation when wayfinder is not available
 */

export type RouteQueryOptions = {
    query?: Record<string, any>;
    mergeQuery?: Record<string, any>;
};

export type RouteDefinition<M extends string> = {
    url: string;
    method: M;
};

export type RouteFormDefinition<M extends string> = {
    action: string;
    method: M;
};

export function queryParams(options?: RouteQueryOptions): string {
    if (!options?.query && !options?.mergeQuery) {
        return '';
    }
    
    const params = options.query || options.mergeQuery || {};
    const queryString = new URLSearchParams(params).toString();
    
    return queryString ? `?${queryString}` : '';
}

export function applyUrlDefaults<T extends Record<string, any> | undefined>(args: T): T {
    // Apply default values to URL arguments if needed
    // For now, just return args as-is since defaults are handled by route definitions
    return args ?? ({} as T);
}

export function validateParameters(
    args: Record<string, any> | undefined,
    requiredParams: string[]
): void {
    if (!args) {
        return;
    }
    
    // Validate that required parameters are present
    // Note: Optional parameters (marked with ?) are not validated
    for (const param of requiredParams) {
        if (!(param in args) || args[param] === undefined || args[param] === null) {
            throw new Error(`Missing required parameter: ${param}`);
        }
    }
}

