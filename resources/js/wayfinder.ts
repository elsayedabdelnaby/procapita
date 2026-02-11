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

