import { usePage } from '@inertiajs/react';

interface Permission {
    id: number;
    name: string;
    module_name: string;
    entity_name: string;
    action: string;
}

interface User {
    id: number;
    is_super_admin?: boolean;
    permissions?: Permission[];
    roles?: Array<{
        id: number;
        permissions?: Permission[];
    }>;
}

interface PageProps {
    auth?: {
        user?: User;
    };
}

export function useFieldPermissions() {
    const { props } = usePage<PageProps>();
    const user = props.auth?.user;

    // Super admin can see all fields
    if (user?.is_super_admin) {
        return {
            canViewField: () => true,
            canViewDriverField: () => true,
        };
    }

    // Get all user permissions (direct + from roles)
    const getAllPermissions = (): string[] => {
        const permissions: string[] = [];
        
        // Direct permissions
        if (user?.permissions) {
            permissions.push(...user.permissions.map(p => p.name));
        }
        
        // Role permissions
        if (user?.roles) {
            user.roles.forEach(role => {
                if (role.permissions) {
                    permissions.push(...role.permissions.map(p => p.name));
                }
            });
        }
        
        return [...new Set(permissions)]; // Remove duplicates
    };

    const userPermissions = getAllPermissions();

    const canViewField = (module: string, entity: string, fieldName: string): boolean => {
        // Check for specific field permission
        const permissionName = `${module}.${entity}.view-${fieldName}`;
        return userPermissions.includes(permissionName);
    };

    const canViewDriverField = (fieldName: string): boolean => {
        return canViewField('drivers', 'driverfields', fieldName);
    };

    return {
        canViewField,
        canViewDriverField,
    };
}

