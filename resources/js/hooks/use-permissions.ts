import { useMemo } from 'react';
import { usePage } from '@inertiajs/react';
import { type SharedData, type Permission } from '@/types';

/**
 * Custom hook for permission checking throughout the application.
 * 
 * Provides centralized permission validation that:
 * - Bypasses checks for super admins
 * - Checks user permissions for regular users
 * - Supports checking by permission name, module/entity, or module only
 * 
 * @returns Object with permission checking functions
 */
export function usePermissions() {
    const page = usePage<SharedData>();
    const { auth } = page.props;
    const user = auth?.user;
    const isSuperAdmin = user?.is_super_admin ?? false;
    const userPermissions = (user?.permissions ?? []) as Permission[];

    // Create a Set of permission names for faster lookup
    const permissionNames = useMemo(() => {
        return new Set(userPermissions.map((p) => p.name));
    }, [userPermissions]);

    /**
     * Check if user has a specific permission by name
     * @param permissionName - Full permission name (e.g., 'core.companies.read')
     * @returns true if user is super admin or has the permission
     */
    const hasPermission = (permissionName: string): boolean => {
        if (isSuperAdmin) {
            return true;
        }

        return permissionNames.has(permissionName);
    };

    /**
     * Check if user has any of the specified permissions
     * @param permissionNamesToCheck - Array of permission names to check
     * @returns true if user is super admin or has at least one of the permissions
     */
    const hasAnyPermission = (permissionNamesToCheck: string[]): boolean => {
        if (isSuperAdmin) {
            return true;
        }

        return permissionNamesToCheck.some((name) => permissionNames.has(name));
    };

    /**
     * Check if user has all of the specified permissions
     * @param permissionNamesToCheck - Array of permission names to check
     * @returns true if user is super admin or has all of the permissions
     */
    const hasAllPermissions = (permissionNamesToCheck: string[]): boolean => {
        if (isSuperAdmin) {
            return true;
        }

        return permissionNamesToCheck.every((name) => permissionNames.has(name));
    };

    /**
     * Check if user has any CRUD permission for a specific entity
     * @param moduleName - Module name (e.g., 'core', 'drivers')
     * @param entityName - Entity name (e.g., 'companies', 'drivers')
     * @param actions - Optional array of actions to check (default: ['create', 'read', 'update', 'delete'])
     * @returns true if user is super admin or has at least one of the specified permissions
     */
    const hasEntityPermission = (
        moduleName: string,
        entityName: string,
        actions: string[] = ['create', 'read', 'update', 'delete']
    ): boolean => {
        if (isSuperAdmin) {
            return true;
        }

        const permissionNamesToCheck = actions.map(
            (action) => `${moduleName}.${entityName}.${action}`
        );

        return permissionNamesToCheck.some((name) => permissionNames.has(name));
    };

    /**
     * Check if user has a specific action permission for an entity
     * @param moduleName - Module name (e.g., 'core', 'drivers')
     * @param entityName - Entity name (e.g., 'companies', 'drivers')
     * @param action - Action to check (e.g., 'create', 'read', 'update', 'delete')
     * @returns true if user is super admin or has the permission
     */
    const can = (
        moduleName: string,
        entityName: string,
        action: string
    ): boolean => {
        if (isSuperAdmin) {
            return true;
        }

        const permissionName = `${moduleName}.${entityName}.${action}`;
        return permissionNames.has(permissionName);
    };

    /**
     * Check if user has access to a module (any permission in that module)
     * @param moduleName - Module name (e.g., 'core', 'drivers', 'marketing')
     * @returns true if user is super admin or has any permission in the module
     */
    const canAccessModule = (moduleName: string): boolean => {
        if (isSuperAdmin) {
            return true;
        }

        // Check if user has any permission that starts with the module name
        return Array.from(permissionNames).some((name) =>
            name.startsWith(`${moduleName}.`)
        );
    };

    /**
     * Get all permissions for a specific module
     * @param moduleName - Module name
     * @returns Array of permissions for the module
     */
    const getModulePermissions = (moduleName: string): Permission[] => {
        return userPermissions.filter(
            (p) => p.module_name === moduleName
        );
    };

    /**
     * Get all permissions for a specific entity
     * @param moduleName - Module name
     * @param entityName - Entity name
     * @returns Array of permissions for the entity
     */
    const getEntityPermissions = (
        moduleName: string,
        entityName: string
    ): Permission[] => {
        return userPermissions.filter(
            (p) => p.module_name === moduleName && p.entity_name === entityName
        );
    };

    return {
        // User info
        isSuperAdmin,
        isCompanyAdmin: user?.is_company_admin ?? false,
        userPermissions,
        
        // Permission checking functions
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        hasEntityPermission,
        can,
        canAccessModule,
        
        // Permission retrieval functions
        getModulePermissions,
        getEntityPermissions,
    };
}

