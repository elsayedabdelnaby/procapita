import { usePage } from '@inertiajs/react';
import { useCallback } from 'react';

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

/** Driver fields always hidden from UI (Riding Company + vehicle type / car or scooter) */
const FIELDS_ALWAYS_HIDDEN = ['riding_company', 'riding_company_id', 'vehicle_type', 'car_or_scooter', 'vehicle_type_and_year'];

export function useFieldPermissions() {
    const { props } = usePage<PageProps>();
    const user = props.auth?.user;

    // Super admin can see and edit all fields except always-hidden ones
    if (user?.is_super_admin) {
        return {
            canViewField: () => true,
            canViewDriverField: (fieldName: string) => !FIELDS_ALWAYS_HIDDEN.includes(fieldName),
            canEditDriverField: (fieldName: string) => !FIELDS_ALWAYS_HIDDEN.includes(fieldName),
            getDriverFieldPermission: (fieldName: string) =>
                FIELDS_ALWAYS_HIDDEN.includes(fieldName) ? null : ('write' as const),
        };
    }

    // Get all user permissions (direct + from roles)
    // Note: Backend already aggregates permissions from roles via getAllPermissions()
    // So user.permissions already contains all permissions (direct + from roles)
    const getAllPermissions = (): string[] => {
        const permissions: string[] = [];
        
        // Direct permissions (already includes role permissions from backend via getAllPermissions())
        if (user?.permissions && Array.isArray(user.permissions)) {
            user.permissions.forEach(p => {
                if (typeof p === 'string') {
                    permissions.push(p);
                } else if (p && typeof p === 'object') {
                    // Check for 'name' property first
                    if ('name' in p && typeof p.name === 'string') {
                        permissions.push(p.name);
                    }
                }
            });
        }
        
        // Also check role permissions if available (fallback - should already be in user.permissions)
        if (user?.roles && Array.isArray(user.roles)) {
            user.roles.forEach(role => {
                if (role && role.permissions && Array.isArray(role.permissions)) {
                    role.permissions.forEach(p => {
                        if (typeof p === 'string') {
                            permissions.push(p);
                        } else if (p && typeof p === 'object') {
                            // Check for 'name' property first
                            if ('name' in p && typeof p.name === 'string') {
                                permissions.push(p.name);
                            }
                        }
                    });
                }
            });
        }
        
        const uniquePermissions = [...new Set(permissions)]; // Remove duplicates
        
        // Debug: Log driverfields permissions
        if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
            const driverFieldPerms = uniquePermissions.filter(p => 
                typeof p === 'string' && p.includes('drivers.driverfields')
            );
            if (driverFieldPerms.length > 0) {
                console.log('[getAllPermissions] Driver Field Permissions found:', driverFieldPerms.slice(0, 10));
                console.log('[getAllPermissions] Total permissions:', uniquePermissions.length);
            }
        }
        
        return uniquePermissions;
    };

    const userPermissions = getAllPermissions();
    
    // Check if user has any new permissions (invisible/read/write) for driver fields
    // If yes, we use the new system (strict mode - fields without permission are invisible)
    // If no, we use the old system (backward compatibility)
    const hasNewDriverFieldPermissions = userPermissions.some(p => 
        typeof p === 'string' && 
        p.includes('drivers.driverfields') && 
        (p.includes('invisible-') || p.includes('read-') || p.includes('write-'))
    );
    
    // Debug: Log permissions for troubleshooting
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        const driverFieldPerms = userPermissions.filter(p => 
            typeof p === 'string' && p.includes('drivers.driverfields')
        );
        if (driverFieldPerms.length > 0) {
            console.log('[useFieldPermissions] Driver Field Permissions:', driverFieldPerms);
            console.log('[useFieldPermissions] User permissions count:', userPermissions.length);
            console.log('[useFieldPermissions] User:', { 
                id: user?.id, 
                email: user?.email, 
                roles: user?.roles?.map(r => ({ id: r.id, name: r.name, permissionsCount: r.permissions?.length || 0 }))
            });
            
            // Check for new permissions (invisible, read, write)
            const newPerms = driverFieldPerms.filter(p => 
                typeof p === 'string' && (p.includes('invisible-') || p.includes('read-') || p.includes('write-'))
            );
            const oldPerms = driverFieldPerms.filter(p => 
                typeof p === 'string' && p.includes('view-')
            );
            console.log('[useFieldPermissions] New permissions (invisible/read/write):', newPerms.length, newPerms.slice(0, 5));
            console.log('[useFieldPermissions] Old permissions (view-):', oldPerms.length, oldPerms.slice(0, 5));
            console.log('[useFieldPermissions] Using new permission system (strict mode):', hasNewDriverFieldPermissions);
        }
    }

    const canViewField = useCallback((module: string, entity: string, fieldName: string): boolean => {
        // Check for specific field permission
        const permissionName = `${module}.${entity}.view-${fieldName}`;
        return userPermissions.includes(permissionName);
    }, [userPermissions]);

    const canViewDriverField = useCallback((fieldName: string): boolean => {
        if (FIELDS_ALWAYS_HIDDEN.includes(fieldName)) {
            return false;
        }
        // Normalize field name for matching (handle underscores, hyphens, case)
        const normalizedFieldName = fieldName.toLowerCase().replace(/_/g, '-');
        const fieldNameLower = fieldName.toLowerCase();
        
        // Check new permission system first (invisible, read, write)
        const invisiblePerm = `drivers.driverfields.invisible-${fieldName}`;
        const readPerm = `drivers.driverfields.read-${fieldName}`;
        const writePerm = `drivers.driverfields.write-${fieldName}`;
        
        // Also check with normalized names
        const invisiblePermNorm = `drivers.driverfields.invisible-${normalizedFieldName}`;
        const readPermNorm = `drivers.driverfields.read-${normalizedFieldName}`;
        const writePermNorm = `drivers.driverfields.write-${normalizedFieldName}`;
        
        // Check if invisible permission exists (exact match or contains pattern)
        const hasInvisible = userPermissions.some(perm => {
            if (typeof perm !== 'string') return false;
            const permLower = perm.toLowerCase();
            // Exact matches
            if (perm === invisiblePerm || perm === invisiblePermNorm) return true;
            if (permLower === invisiblePerm.toLowerCase() || permLower === invisiblePermNorm.toLowerCase()) return true;
            // Pattern matches
            if (permLower.includes(`invisible-${fieldNameLower}`) || permLower.includes(`invisible-${normalizedFieldName}`)) {
                // Make sure it's for the right field (not a substring match)
                const permParts = permLower.split('.');
                const lastPart = permParts[permParts.length - 1] || '';
                if (lastPart === `invisible-${fieldNameLower}` || lastPart === `invisible-${normalizedFieldName}`) {
                    return true;
                }
            }
            return false;
        });
        
        if (hasInvisible) {
            return false;
        }
        
        // Check if read or write permission exists
        const hasRead = userPermissions.some(perm => {
            if (typeof perm !== 'string') return false;
            const permLower = perm.toLowerCase();
            // Exact matches
            if (perm === readPerm || perm === readPermNorm) return true;
            if (permLower === readPerm.toLowerCase() || permLower === readPermNorm.toLowerCase()) return true;
            // Pattern matches
            if (permLower.includes(`read-${fieldNameLower}`) || permLower.includes(`read-${normalizedFieldName}`)) {
                const permParts = permLower.split('.');
                const lastPart = permParts[permParts.length - 1] || '';
                if (lastPart === `read-${fieldNameLower}` || lastPart === `read-${normalizedFieldName}`) {
                    return true;
                }
            }
            return false;
        });
        
        const hasWrite = userPermissions.some(perm => {
            if (typeof perm !== 'string') return false;
            const permLower = perm.toLowerCase();
            // Exact matches
            if (perm === writePerm || perm === writePermNorm) return true;
            if (permLower === writePerm.toLowerCase() || permLower === writePermNorm.toLowerCase()) return true;
            // Pattern matches
            if (permLower.includes(`write-${fieldNameLower}`) || permLower.includes(`write-${normalizedFieldName}`)) {
                const permParts = permLower.split('.');
                const lastPart = permParts[permParts.length - 1] || '';
                if (lastPart === `write-${fieldNameLower}` || lastPart === `write-${normalizedFieldName}`) {
                    return true;
                }
            }
            return false;
        });
        
        if (hasRead || hasWrite) {
            return true;
        }
        
        // If new permission system is active (user has at least one new permission), 
        // fields without explicit permission should be invisible
        if (hasNewDriverFieldPermissions) {
            return false;
        }
        
        // Fallback to old view- permission system (backward compatibility)
        return canViewField('drivers', 'driverfields', fieldName);
    }, [userPermissions, hasNewDriverFieldPermissions, canViewField]);

    const canEditDriverField = useCallback((fieldName: string): boolean => {
        if (FIELDS_ALWAYS_HIDDEN.includes(fieldName)) {
            return false;
        }
        // Normalize field name for matching
        const normalizedFieldName = fieldName.toLowerCase().replace(/_/g, '-');
        const fieldNameLower = fieldName.toLowerCase();
        
        // Check new permission system
        const writePerm = `drivers.driverfields.write-${fieldName}`;
        const readPerm = `drivers.driverfields.read-${fieldName}`;
        const invisiblePerm = `drivers.driverfields.invisible-${fieldName}`;
        
        // Also check with normalized names
        const writePermNorm = `drivers.driverfields.write-${normalizedFieldName}`;
        const readPermNorm = `drivers.driverfields.read-${normalizedFieldName}`;
        const invisiblePermNorm = `drivers.driverfields.invisible-${normalizedFieldName}`;
        
        // Check if invisible permission exists
        const hasInvisible = userPermissions.some(perm => {
            if (typeof perm !== 'string') return false;
            const permLower = perm.toLowerCase();
            // Exact matches
            if (perm === invisiblePerm || perm === invisiblePermNorm) return true;
            if (permLower === invisiblePerm.toLowerCase() || permLower === invisiblePermNorm.toLowerCase()) return true;
            // Pattern matches
            if (permLower.includes(`invisible-${fieldNameLower}`) || permLower.includes(`invisible-${normalizedFieldName}`)) {
                const permParts = permLower.split('.');
                const lastPart = permParts[permParts.length - 1] || '';
                if (lastPart === `invisible-${fieldNameLower}` || lastPart === `invisible-${normalizedFieldName}`) {
                    return true;
                }
            }
            return false;
        });
        
        if (hasInvisible) {
            return false;
        }
        
        // Check if write permission exists
        const hasWrite = userPermissions.some(perm => {
            if (typeof perm !== 'string') return false;
            const permLower = perm.toLowerCase();
            // Exact matches
            if (perm === writePerm || perm === writePermNorm) return true;
            if (permLower === writePerm.toLowerCase() || permLower === writePermNorm.toLowerCase()) return true;
            // Pattern matches
            if (permLower.includes(`write-${fieldNameLower}`) || permLower.includes(`write-${normalizedFieldName}`)) {
                const permParts = permLower.split('.');
                const lastPart = permParts[permParts.length - 1] || '';
                if (lastPart === `write-${fieldNameLower}` || lastPart === `write-${normalizedFieldName}`) {
                    return true;
                }
            }
            return false;
        });
        
        if (hasWrite) {
            return true;
        }
        
        // Check if read permission exists
        const hasRead = userPermissions.some(perm => {
            if (typeof perm !== 'string') return false;
            const permLower = perm.toLowerCase();
            // Exact matches
            if (perm === readPerm || perm === readPermNorm) return true;
            if (permLower === readPerm.toLowerCase() || permLower === readPermNorm.toLowerCase()) return true;
            // Pattern matches
            if (permLower.includes(`read-${fieldNameLower}`) || permLower.includes(`read-${normalizedFieldName}`)) {
                const permParts = permLower.split('.');
                const lastPart = permParts[permParts.length - 1] || '';
                if (lastPart === `read-${fieldNameLower}` || lastPart === `read-${normalizedFieldName}`) {
                    return true;
                }
            }
            return false;
        });
        
        if (hasRead) {
            return false; // Read-only
        }
        
        // Check if any field permission exists (for this specific field)
        const hasAnyFieldPermission = userPermissions.some(perm => {
            if (typeof perm !== 'string') return false;
            const permLower = perm.toLowerCase();
            // Check for exact field matches only (not substring matches)
            const permParts = permLower.split('.');
            const lastPart = permParts[permParts.length - 1] || '';
            return (
                lastPart === `invisible-${fieldNameLower}` ||
                lastPart === `invisible-${normalizedFieldName}` ||
                lastPart === `read-${fieldNameLower}` ||
                lastPart === `read-${normalizedFieldName}` ||
                lastPart === `write-${fieldNameLower}` ||
                lastPart === `write-${normalizedFieldName}`
            );
        });
        
        if (hasAnyFieldPermission) {
            return false; // If permission exists but not write, then read-only or invisible
        }
        
        // If new permission system is active (user has at least one new permission), 
        // fields without explicit permission should not be editable (invisible or read-only)
        if (hasNewDriverFieldPermissions) {
            return false;
        }
        
        // Default: if no specific permission and old system, allow (for backward compatibility)
        return true;
    }, [userPermissions, hasNewDriverFieldPermissions]);

    const getDriverFieldPermission = useCallback((fieldName: string): 'invisible' | 'read' | 'write' | null => {
        if (FIELDS_ALWAYS_HIDDEN.includes(fieldName)) {
            return null;
        }
        const invisiblePerm = `drivers.driverfields.invisible-${fieldName}`;
        const readPerm = `drivers.driverfields.read-${fieldName}`;
        const writePerm = `drivers.driverfields.write-${fieldName}`;
        
        if (userPermissions.includes(writePerm)) {
            return 'write';
        }
        if (userPermissions.includes(readPerm)) {
            return 'read';
        }
        if (userPermissions.includes(invisiblePerm)) {
            return 'invisible';
        }
        
        // Fallback: check old view- permission
        if (canViewField('drivers', 'driverfields', fieldName)) {
            return 'read'; // Default to read if old permission exists
        }
        
        return null;
    }, [userPermissions, canViewField]);

    return {
        canViewField,
        canViewDriverField,
        canEditDriverField,
        getDriverFieldPermission,
    };
}

