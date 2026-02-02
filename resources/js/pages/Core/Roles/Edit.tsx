import { FormField } from '@/components/core/form-field';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import AppLayout from '@/layouts/app-layout';
import { Company, Role } from '@/types/core';
import { Head, Link, useForm } from '@inertiajs/react';
import axios from 'axios';
import { ChevronDown, ChevronRight } from 'lucide-react';
import React, { useEffect, useMemo, useState, useRef } from 'react';

interface Permission {
    id: number;
    name: string;
    module_name?: string;
    entity_name?: string;
    action?: string;
}

interface RoleEditProps {
    company: Company;
    role: Role;
    availableRoles: Role[];
    permissions?: Record<string, Record<string, Permission[]>>;
}

export default function RoleEdit({
    company,
    role,
    availableRoles,
    permissions = {},
}: RoleEditProps) {
    const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
    const [expandedEntities, setExpandedEntities] = useState<Record<string, boolean>>({});

    const { data, setData, put, processing, errors, transform } = useForm({
        name: role.name || '',
        parent_id: role.parent_id || '',
        module_name: role.module_name || '',
        entity_name: role.entity_name || '',
        permissions: (role.permissions || []).map((p: Permission) => p.id) as number[],
    });

    // Transform data before submitting - remove old view- permissions if new permissions exist
    transform((data) => {
        let finalPermissions = [...(data.permissions || [])];
        
        if (permissions['drivers']?.['driverfields']) {
            const driverfieldPermIds = permissions['drivers']['driverfields'].map(p => p.id);
            const hasNewPermissions = finalPermissions.some((id: number) => {
                if (!driverfieldPermIds.includes(id)) return false;
                const perm = permissions['drivers']['driverfields'].find(p => p.id === id);
                if (!perm) return false;
                const action = perm.action || '';
                const name = perm.name || '';
                // Check if it's a new permission (invisible, read, write)
                return action.startsWith('invisible-') || 
                       action.startsWith('read-') || 
                       action.startsWith('write-') ||
                       name.includes('.invisible-') ||
                       name.includes('.read-') ||
                       name.includes('.write-');
            });
            
            // If new permissions exist, remove old view- permissions
            if (hasNewPermissions) {
                finalPermissions = finalPermissions.filter((id: number) => {
                    if (!driverfieldPermIds.includes(id)) return true; // Keep non-driverfield permissions
                    const perm = permissions['drivers']['driverfields'].find(p => p.id === id);
                    if (!perm) return true;
                    const action = perm.action || '';
                    const name = perm.name || '';
                    // Remove old view- permissions
                    if (action.startsWith('view-') || name.includes('.view-')) {
                        return false;
                    }
                    return true; // Keep new permissions (invisible, read, write)
                });
            }
        }
        
        return {
            ...data,
            permissions: finalPermissions,
        };
    });

    const toggleModule = (moduleName: string) => {
        setExpandedModules((prev) => ({
            ...prev,
            [moduleName]: !prev[moduleName],
        }));
    };

    const toggleEntity = (moduleName: string, entityName: string) => {
        const key = `${moduleName}-${entityName}`;
        setExpandedEntities((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));
    };

    const expandAllModules = () => {
        const allExpanded: Record<string, boolean> = {};
        Object.keys(permissions).forEach((moduleName) => {
            allExpanded[moduleName] = true;
        });
        setExpandedModules(allExpanded);
    };

    const collapseAllModules = () => {
        setExpandedModules({});
        setExpandedEntities({});
    };

    const handlePermissionToggle = (permissionId: number, checked: boolean) => {
        const currentPermissions = data.permissions || [];
        if (checked) {
            setData('permissions', [...currentPermissions, permissionId]);
        } else {
            setData(
                'permissions',
                currentPermissions.filter((id) => id !== permissionId)
            );
        }
    };

    const handleSelectAllModule = (moduleName: string, checked: boolean) => {
        const currentPermissions = data.permissions || [];
        const modulePermissions: number[] = [];

        // For drivers module, exclude driverfields permissions (they are handled separately)
        Object.entries(permissions[moduleName] || {}).forEach(([entityName, entityPermissions]) => {
            if (moduleName === 'drivers' && entityName === 'driverfields') {
                // Skip driverfields - they are handled by radio buttons
                return;
            }
            entityPermissions.forEach((permission) => {
                modulePermissions.push(permission.id);
            });
        });

        if (checked) {
            setData('permissions', [...new Set([...currentPermissions, ...modulePermissions])]);
        } else {
            setData(
                'permissions',
                currentPermissions.filter((id) => !modulePermissions.includes(id))
            );
        }
    };

    const handleSelectAllEntity = (
        moduleName: string,
        entityName: string,
        checked: boolean
    ) => {
        // Special handling for driverfields: use default "read" permission for all fields
        if (moduleName === 'drivers' && entityName === 'driverfields') {
            const currentPermissions = data.permissions || [];
            const fields = Object.keys(driverFieldMapping);
            const newPermissions = [...currentPermissions];

            if (checked) {
                // Add "read" permission for all fields (default state)
                fields.forEach((fieldName) => {
                    const fieldPerms = driverFieldsPermissions[fieldName];
                    const readPermId = fieldPerms?.read?.id;
                    
                    // If fieldPerms not found, search in permissions
                    if (!readPermId && permissions['drivers']?.['driverfields']) {
                        const perm = permissions['drivers']['driverfields'].find(
                            (p) => p.action === `read-${fieldName}` || p.name === `drivers.driverfields.read-${fieldName}`
                        );
                        if (perm && !newPermissions.includes(perm.id)) {
                            newPermissions.push(perm.id);
                        }
                    } else if (readPermId && !newPermissions.includes(readPermId)) {
                        newPermissions.push(readPermId);
                    }
                });
                
                // Remove any existing invisible/write permissions for driverfields to avoid conflicts
                const driverfieldPermIds = (permissions['drivers']?.['driverfields'] || []).map(p => p.id);
                const filteredPermissions = newPermissions.filter(id => {
                    if (!driverfieldPermIds.includes(id)) return true;
                    // Check if this is a read permission
                    const perm = permissions['drivers']['driverfields'].find(p => p.id === id);
                    return perm && (perm.action?.startsWith('read-') || perm.name?.includes('.read-'));
                });
                
                setData('permissions', filteredPermissions);
            } else {
                // Remove all driverfields permissions
                const driverfieldPermIds = (permissions['drivers']?.['driverfields'] || []).map(p => p.id);
                setData(
                    'permissions',
                    currentPermissions.filter((id) => !driverfieldPermIds.includes(id))
                );
            }
            return;
        }

        // Normal entity handling
        const currentPermissions = data.permissions || [];
        const entityPermissions = (permissions[moduleName]?.[entityName] || []).map(
            (p) => p.id
        );

        if (checked) {
            setData('permissions', [...new Set([...currentPermissions, ...entityPermissions])]);
        } else {
            setData(
                'permissions',
                currentPermissions.filter((id) => !entityPermissions.includes(id))
            );
        }
    };

    // Function to format permission action names for display
    const formatPermissionAction = (action: string): string => {
        const actionMap: Record<string, string> = {
            'update': 'Edit',
            'edit': 'Edit',
            'quick-edit': 'Quick Edit',
            'view-documents': 'View Documents',
            'view-stages': 'View Stages',
            'view-document': 'View Document',
            'upload-document': 'Upload Document',
            'delete-document': 'Delete Document',
            'reject-document': 'Reject Document',
            'mass-edit': 'Mass Edit',
            'mass-delete': 'Mass Delete',
            'delete-all': 'Delete All',
            'toggle-active': 'Toggle Active',
            'approve-document': 'Approve Document',
            'approve': 'Approve',
            'reject': 'Reject',
            'pending-document': 'Pending Document',
            'set-pending': 'Set Pending',
            'set-approved': 'Set Approved',
            'set-rejected': 'Set Rejected',
            'delete-file': 'Delete File',
        };
        
        // If action has a mapping, use it
        if (actionMap[action]) {
            return actionMap[action];
        }
        
        // Otherwise, capitalize and replace hyphens with spaces
        return action
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    // Field mapping for Drivers fields
    const driverFieldMapping: Record<string, string> = {
        'assigned_to': 'Assigned To',
        'campaign': 'Campaign',
        'cancel_reason': 'Cancel Reasons',
        'car_or_scooter': 'Car or Scooter',
        'city': 'City',
        'current_stage': 'Current Stage',
        'email': 'Email',
        'lead_status_comment': 'Feedback Comment',
        'has_worked_before': 'Has the lead worked before?',
        'lead_source': 'Lead Source',
        'lead_stage': 'Lead Stage',
        'lead_status': 'Lead Status',
        'full_name': 'Name',
        'next_follow_up': 'Next Follow-up',
        'phone': 'Phone',
        'vehicle_type': 'Vehicle Type',
        'vehicle_type_and_year': 'Vehicle Type and Year',
        'whatsapp_phone': 'WhatsApp',
        'worked_with_us_before': 'Worked With Us Before',
    };

    // Group driverfields permissions by field name
    const driverFieldsPermissions = useMemo(() => {
        if (!permissions['drivers'] || !permissions['drivers']['driverfields']) {
            return {};
        }

        const fields: Record<string, { invisible?: Permission; read?: Permission; write?: Permission }> = {};

        permissions['drivers']['driverfields'].forEach((permission) => {
            const action = permission.action || '';
            const permName = permission.name || '';
            
            // Check if it's one of the new field permissions (invisible, read, write)
            let fieldName: string | null = null;
            let permissionType: 'invisible' | 'read' | 'write' | null = null;
            
            // Try to extract from action first (format: "invisible-{fieldName}")
            if (action && action.startsWith('invisible-')) {
                fieldName = action.replace(/^invisible-/, '');
                permissionType = 'invisible';
            } else if (action && action.startsWith('read-')) {
                fieldName = action.replace(/^read-/, '');
                permissionType = 'read';
            } else if (action && action.startsWith('write-')) {
                fieldName = action.replace(/^write-/, '');
                permissionType = 'write';
            } 
            // Try to extract from permission name (format: "drivers.driverfields.invisible-{fieldName}")
            else if (permName && permName.includes('invisible-')) {
                // Match pattern: drivers.driverfields.invisible-{fieldName}
                const match = permName.match(/invisible-(.+)$/);
                if (match && match[1]) {
                    fieldName = match[1];
                    permissionType = 'invisible';
                }
            } else if (permName && permName.includes('read-')) {
                const match = permName.match(/read-(.+)$/);
                if (match && match[1]) {
                    fieldName = match[1];
                    permissionType = 'read';
                }
            } else if (permName && permName.includes('write-')) {
                const match = permName.match(/write-(.+)$/);
                if (match && match[1]) {
                    fieldName = match[1];
                    permissionType = 'write';
                }
            }
            
            if (fieldName && permissionType) {
                // Normalize field name (handle any variations)
                const normalizedFieldName = fieldName.trim();
                if (!fields[normalizedFieldName]) {
                    fields[normalizedFieldName] = {};
                }
                
                fields[normalizedFieldName][permissionType] = permission;
            }
        });

        return fields;
    }, [permissions]);

    // Check if "Read" permission is selected in drivers.drivers entity
    const isDriversEntityReadSelected = useMemo(() => {
        if (!permissions['drivers'] || !permissions['drivers']['drivers']) {
            return false;
        }
        const readPermission = permissions['drivers']['drivers'].find(
            (p) => p.action === 'read' || p.name === 'drivers.drivers.read'
        );
        if (!readPermission) {
            return false;
        }
        
        const currentPerms = (data.permissions || []).map(p => typeof p === 'string' ? parseInt(p, 10) : p);
        return currentPerms.includes(readPermission.id);
    }, [permissions, data.permissions]);

    // Auto-expand driverfields entity when "Read" in drivers.drivers entity is selected
    useEffect(() => {
        if (isDriversEntityReadSelected) {
            setExpandedModules((prev) => (prev.drivers ? prev : { ...prev, drivers: true }));
            setExpandedEntities((prev) =>
                prev['drivers-driverfields'] ? prev : { ...prev, 'drivers-driverfields': true }
            );
        }
    }, [isDriversEntityReadSelected]);

    // Get current field permission state
    const getFieldPermissionState = (fieldName: string): 'invisible' | 'read' | 'write' | null => {
        const fieldPerms = driverFieldsPermissions[fieldName];
        let invisiblePermId: number | null = null;
        let readPermId: number | null = null;
        let writePermId: number | null = null;

        if (fieldPerms) {
            invisiblePermId = fieldPerms.invisible?.id || null;
            readPermId = fieldPerms.read?.id || null;
            writePermId = fieldPerms.write?.id || null;
        } else {
            // Fallback: search in all permissions
            if (permissions['drivers'] && permissions['drivers']['driverfields']) {
                permissions['drivers']['driverfields'].forEach((perm) => {
                    const action = perm.action || '';
                    const permName = perm.name || '';
                    
                    // Check by exact match first
                    if (action === `invisible-${fieldName}` || 
                        permName === `drivers.driverfields.invisible-${fieldName}` ||
                        permName.endsWith(`.invisible-${fieldName}`)) {
                        invisiblePermId = perm.id;
                    } else if (action === `read-${fieldName}` || 
                               permName === `drivers.driverfields.read-${fieldName}` ||
                               permName.endsWith(`.read-${fieldName}`)) {
                        readPermId = perm.id;
                    } else if (action === `write-${fieldName}` || 
                               permName === `drivers.driverfields.write-${fieldName}` ||
                               permName.endsWith(`.write-${fieldName}`)) {
                        writePermId = perm.id;
                    }
                });
            }
        }

        // Check which permission is currently selected in data.permissions
        // Convert to numbers for comparison (permissions array contains numbers)
        const currentPerms = (data.permissions || []).map(p => typeof p === 'string' ? parseInt(p, 10) : p);
        
        if (writePermId && currentPerms.includes(writePermId)) {
            return 'write';
        }
        if (readPermId && currentPerms.includes(readPermId)) {
            return 'read';
        }
        if (invisiblePermId && currentPerms.includes(invisiblePermId)) {
            return 'invisible';
        }
        
        // If no permission is selected, return null (will default to 'invisible' in UI)
        return null;
    };

    // Handle field permission change
    const handleFieldPermissionChange = (fieldName: string, value: 'invisible' | 'read' | 'write') => {
        const currentPermissions = data.permissions || [];
        let newPermissions = [...currentPermissions];

        const fieldPerms = driverFieldsPermissions[fieldName];
        let invisiblePermId: number | null = null;
        let readPermId: number | null = null;
        let writePermId: number | null = null;

        if (fieldPerms) {
            invisiblePermId = fieldPerms.invisible?.id || null;
            readPermId = fieldPerms.read?.id || null;
            writePermId = fieldPerms.write?.id || null;
        }

        if (!invisiblePermId && !readPermId && !writePermId && permissions['drivers']?.['driverfields']) {
            permissions['drivers']['driverfields'].forEach((perm) => {
                const action = perm.action || '';
                const permName = perm.name || '';
                if (action === `invisible-${fieldName}`) invisiblePermId = perm.id;
                else if (action === `read-${fieldName}`) readPermId = perm.id;
                else if (action === `write-${fieldName}`) writePermId = perm.id;
                else if (permName === `drivers.driverfields.invisible-${fieldName}`) invisiblePermId = perm.id;
                else if (permName === `drivers.driverfields.read-${fieldName}`) readPermId = perm.id;
                else if (permName === `drivers.driverfields.write-${fieldName}`) writePermId = perm.id;
                else if (permName.includes(`invisible-${fieldName}`) && permName.includes('driverfields') && !invisiblePermId) invisiblePermId = perm.id;
                else if (permName.includes(`read-${fieldName}`) && permName.includes('driverfields') && !readPermId) readPermId = perm.id;
                else if (permName.includes(`write-${fieldName}`) && permName.includes('driverfields') && !writePermId) writePermId = perm.id;
            });
        }

        const allFieldPermissionIds: number[] = [];
        if (invisiblePermId) allFieldPermissionIds.push(invisiblePermId);
        if (readPermId) allFieldPermissionIds.push(readPermId);
        if (writePermId) allFieldPermissionIds.push(writePermId);

        newPermissions = newPermissions.filter(id => !allFieldPermissionIds.includes(id));

        const selectedPermId = value === 'invisible' ? invisiblePermId : value === 'read' ? readPermId : value === 'write' ? writePermId : null;

        if (selectedPermId && !newPermissions.includes(selectedPermId)) {
            newPermissions.push(selectedPermId);
        }

        if (selectedPermId && permissions['drivers']?.['driverfields']) {
            const oldViewPerm = permissions['drivers']['driverfields'].find(
                (p) => (p.action === `view-${fieldName}` || p.name === `drivers.driverfields.view-${fieldName}`) && newPermissions.includes(p.id)
            );
            if (oldViewPerm) {
                newPermissions = newPermissions.filter(id => id !== oldViewPerm.id);
            }
        }

        setData('permissions', newPermissions);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Debug: Log what we're sending (transform will clean old permissions)
        const driverfieldPerms = (data.permissions || []).filter((id: number) => {
            if (!permissions['drivers']?.['driverfields']) return false;
            const permIds = permissions['drivers']['driverfields'].map(p => p.id);
            return permIds.includes(id);
        });
        
        console.log('[handleSubmit] Submitting role update (before transform):', {
            totalPermissions: data.permissions?.length || 0,
            driverfieldPermissions: driverfieldPerms.length,
            driverfieldPermissionIds: driverfieldPerms.slice(0, 10),
            sampleDriverfieldPerms: driverfieldPerms.slice(0, 5).map((id: number) => {
                const perm = permissions['drivers']?.['driverfields']?.find(p => p.id === id);
                return perm ? { id: perm.id, name: perm.name, action: perm.action } : null;
            }).filter(Boolean)
        });
        
        // Transform will automatically clean old permissions before submit
        put(`/core/companies/${company.id}/roles/${role.id}`);
    };

    // Filter out current role and its descendants from available parents
    const availableParents = availableRoles.filter((r) => {
        // Can't be its own parent
        if (r.id === role.id) return false;
        // Can't be a descendant (would create circular reference)
        if (r.hierarchy_path && role.hierarchy_path) {
            return !r.hierarchy_path.startsWith(role.hierarchy_path);
        }
        return true;
    });

    return (
        <AppLayout>
            <Head title={`Edit ${role.name}`} />
            <div className="p-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold">Edit Role</h1>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        Update role information for {company.name}
                    </p>
                </div>

                <Card className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold">Role Information</h2>

                            <div className="rounded-md bg-neutral-50 p-4 dark:bg-neutral-900/20">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-neutral-500">Current Level</p>
                                        <p className="font-medium">Level {role.hierarchy_level}</p>
                                    </div>
                                    <div>
                                        <p className="text-neutral-500">Hierarchy Path</p>
                                        <p className="font-medium">{role.hierarchy_path || 'Root'}</p>
                                    </div>
                                    <div>
                                        <p className="text-neutral-500">Type</p>
                                        <p className="font-medium">{role.is_root ? 'Root Role' : 'Child Role'}</p>
                                    </div>
                                    <div>
                                        <p className="text-neutral-500">Current Parent</p>
                                        <p className="font-medium">
                                            {role.parent?.name || 'None (Root)'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <FormField
                                label="Role Name"
                                name="name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                error={errors.name}
                                placeholder="e.g., Sales Manager, HR Specialist"
                                required
                            />

                            <div className="space-y-2">
                                <Label htmlFor="parent_id">Parent Role</Label>
                                <select
                                    id="parent_id"
                                    name="parent_id"
                                    value={data.parent_id}
                                    onChange={(e) => setData('parent_id', e.target.value)}
                                    className="w-full rounded-md border px-3 py-2"
                                >
                                    <option value="">No Parent (Root Role)</option>
                                    {availableParents.map((r) => (
                                        <option key={r.id} value={r.id}>
                                            {r.name}
                                            {r.hierarchy_path && ` (${r.hierarchy_path})`}
                                        </option>
                                    ))}
                                </select>
                                {errors.parent_id && (
                                    <p className="text-sm text-red-500">{errors.parent_id}</p>
                                )}
                                <p className="text-xs text-neutral-500">
                                    Changing the parent will update the hierarchy path automatically.
                                </p>
                            </div>

                            <FormField
                                label="Module Name (Optional)"
                                name="module_name"
                                value={data.module_name}
                                onChange={(e) => setData('module_name', e.target.value)}
                                error={errors.module_name}
                                placeholder="e.g., Core, CRM, Inventory"
                            />

                            <FormField
                                label="Entity Name (Optional)"
                                name="entity_name"
                                value={data.entity_name}
                                onChange={(e) => setData('entity_name', e.target.value)}
                                error={errors.entity_name}
                                placeholder="e.g., Users, Products, Orders"
                            />

                            <div className="rounded-md bg-yellow-50 p-4 dark:bg-yellow-900/20">
                                <h3 className="mb-2 text-sm font-semibold text-yellow-900 dark:text-yellow-100">
                                    ⚠️ Important
                                </h3>
                                <ul className="space-y-1 text-xs text-yellow-900 dark:text-yellow-100">
                                    <li>
                                        • Changing the parent role will update the hierarchy path for this
                                        role and all its children.
                                    </li>
                                    <li>
                                        • You cannot set this role as its own parent or as a child of one
                                        of its descendants.
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* Permissions Section */}
                        {Object.keys(permissions).length > 0 && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg font-semibold">Permissions</h2>
                                    <div className="flex items-center gap-4">
                                        <p className="text-sm text-neutral-500">
                                            {data.permissions?.length || 0} permission
                                            {(data.permissions?.length || 0) !== 1 ? 's' : ''} selected
                                        </p>
                                        <div className="flex gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={expandAllModules}
                                            >
                                                Expand All
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={collapseAllModules}
                                            >
                                                Collapse All
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                <div className="max-h-[600px] space-y-2 overflow-y-auto rounded-md border p-4">
                                    {Object.entries(permissions).map(([moduleName, entities]) => {
                                        // For drivers module, exclude driverfields from module-level selection
                                        const modulePermissions = Object.entries(entities)
                                            .filter(([entityName]) => {
                                                // Exclude driverfields from module-level checkbox
                                                return !(moduleName === 'drivers' && entityName === 'driverfields');
                                            })
                                            .flatMap(([, entityPermissions]) => entityPermissions.map((p) => p.id));
                                        
                                        const allModuleSelected =
                                            modulePermissions.length > 0 &&
                                            modulePermissions.every((id) =>
                                                data.permissions?.includes(id)
                                            );
                                        const isModuleExpanded = expandedModules[moduleName] ?? false;

                                        return (
                                            <div
                                                key={moduleName}
                                                className="rounded-md border border-neutral-200 dark:border-neutral-800"
                                            >
                                                <div
                                                    className="flex items-center gap-2 border-b bg-neutral-50 p-3 dark:bg-neutral-900/50"
                                                    onClick={() => toggleModule(moduleName)}
                                                >
                                                    <button
                                                        type="button"
                                                        className="flex items-center justify-center"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleModule(moduleName);
                                                        }}
                                                    >
                                                        {isModuleExpanded ? (
                                                            <ChevronDown className="h-4 w-4" />
                                                        ) : (
                                                            <ChevronRight className="h-4 w-4" />
                                                        )}
                                                    </button>
                                                    <Checkbox
                                                        id={`module-${moduleName}`}
                                                        checked={allModuleSelected}
                                                        onCheckedChange={(checked) =>
                                                            handleSelectAllModule(
                                                                moduleName,
                                                                checked as boolean
                                                            )
                                                        }
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                    <Label
                                                        htmlFor={`module-${moduleName}`}
                                                        className="flex-1 cursor-pointer text-base font-semibold capitalize"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleModule(moduleName);
                                                        }}
                                                    >
                                                        {(moduleName === 'drivers' ? 'Leads' : moduleName.charAt(0).toUpperCase() + moduleName.slice(1))} Module
                                                    </Label>
                                                    <span className="text-xs text-neutral-500">
                                                        ({modulePermissions.length} permissions)
                                                    </span>
                                                </div>

                                                {isModuleExpanded && (
                                                    <div className="p-3 space-y-3">
                                                        {Object.entries(entities)
                                                            .sort(([a], [b]) => {
                                                                // For drivers module, show "drivers" entity before "driverfields"
                                                                if (moduleName === 'drivers') {
                                                                    if (a === 'drivers' && b === 'driverfields') return -1;
                                                                    if (a === 'driverfields' && b === 'drivers') return 1;
                                                                }
                                                                return a.localeCompare(b);
                                                            })
                                                            .map(
                                                            ([entityName, entityPermissions]) => {
                                                                const entityPermissionIds =
                                                                    entityPermissions.map(
                                                                        (p) => p.id
                                                                    );
                                                                
                                                                // For driverfields, check if at least one permission per field is selected
                                                                let allEntitySelected: boolean;
                                                                if (moduleName === 'drivers' && entityName === 'driverfields') {
                                                                    const fields = Object.keys(driverFieldMapping);
                                                                    allEntitySelected = fields.length > 0 && fields.every((fieldName) => {
                                                                        const state = getFieldPermissionState(fieldName);
                                                                        return state !== null; // At least one permission (invisible, read, or write) is selected
                                                                    });
                                                                } else {
                                                                    allEntitySelected =
                                                                        entityPermissionIds.length > 0 &&
                                                                        entityPermissionIds.every((id) =>
                                                                            data.permissions?.includes(id)
                                                                        );
                                                                }
                                                                const entityKey = `${moduleName}-${entityName}`;
                                                                const isEntityExpanded =
                                                                    expandedEntities[entityKey] ?? true;

                                                                return (
                                                                    <div
                                                                        key={entityName}
                                                                        className="rounded-md border border-neutral-200 dark:border-neutral-800"
                                                                    >
                                                                        <div
                                                                            className="flex items-center gap-2 bg-neutral-50/50 p-2 dark:bg-neutral-900/30"
                                                                            onClick={() =>
                                                                                toggleEntity(
                                                                                    moduleName,
                                                                                    entityName
                                                                                )
                                                                            }
                                                                        >
                                                                            <button
                                                                                type="button"
                                                                                className="flex items-center justify-center"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    toggleEntity(
                                                                                        moduleName,
                                                                                        entityName
                                                                                    );
                                                                                }}
                                                                            >
                                                                                {isEntityExpanded ? (
                                                                                    <ChevronDown className="h-4 w-4" />
                                                                                ) : (
                                                                                    <ChevronRight className="h-4 w-4" />
                                                                                )}
                                                                            </button>
                                                                            {/* Show checkbox for driverfields - it will set default "read" for all fields */}
                                                                            <Checkbox
                                                                                id={`entity-${moduleName}-${entityName}`}
                                                                                checked={
                                                                                    allEntitySelected
                                                                                }
                                                                                onCheckedChange={(
                                                                                    checked
                                                                                ) =>
                                                                                    handleSelectAllEntity(
                                                                                        moduleName,
                                                                                        entityName,
                                                                                        checked as boolean
                                                                                    )
                                                                                }
                                                                                onClick={(e) =>
                                                                                    e.stopPropagation()
                                                                                }
                                                                            />
                                                                            <Label
                                                                                htmlFor={moduleName === 'drivers' && entityName === 'driverfields' ? undefined : `entity-${moduleName}-${entityName}`}
                                                                                className="flex-1 cursor-pointer font-medium capitalize"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    toggleEntity(
                                                                                        moduleName,
                                                                                        entityName
                                                                                    );
                                                                                }}
                                                                            >
                                                                                {moduleName === 'drivers' && entityName === 'drivers' ? 'Leads' : (moduleName === 'drivers' && entityName === 'driverfields' ? 'Lead Fields' : entityName)}
                                                                            </Label>
                                                                            <span className="text-xs text-neutral-500">
                                                                                ({entityPermissionIds.length}{' '}
                                                                                permissions)
                                                                            </span>
                                                                        </div>

                                                                        {isEntityExpanded && (
                                                                            <>
                                                                                {/* Special handling for Drivers Fields */}
                                                                                {moduleName === 'drivers' && entityName === 'driverfields' ? (
                                                                                    <div className="p-4 space-y-4">
                                                                                        <div className="rounded-md bg-blue-50 p-3 dark:bg-blue-900/20 mb-4">
                                                                                            <p className="text-sm text-blue-900 dark:text-blue-100">
                                                                                                <strong>Field Permissions:</strong> Select one option per field (Invisible, Read only, or Write)
                                                                                            </p>
                                                                                        </div>
                                                                                        <div className="space-y-4">
                                                                                            {Object.keys(driverFieldMapping).map((fieldName) => {
                                                                                                const fieldLabel = driverFieldMapping[fieldName];
                                                                                                const currentState = getFieldPermissionState(fieldName);
                                                                                                const fieldPerms = driverFieldsPermissions[fieldName];
                                                                                                
                                                                                                // Get permission IDs from entityPermissions if fieldPerms is empty
                                                                                                let invisiblePermId: number | null = null;
                                                                                                let readPermId: number | null = null;
                                                                                                let writePermId: number | null = null;

                                                                                                if (fieldPerms) {
                                                                                                    invisiblePermId = fieldPerms.invisible?.id || null;
                                                                                                    readPermId = fieldPerms.read?.id || null;
                                                                                                    writePermId = fieldPerms.write?.id || null;
                                                                                                } else {
                                                                                                    // Fallback: search in entityPermissions
                                                                                                    entityPermissions.forEach((perm) => {
                                                                                                        const action = perm.action || perm.name.split('.')[2];
                                                                                                        if (action === `invisible-${fieldName}`) {
                                                                                                            invisiblePermId = perm.id;
                                                                                                        } else if (action === `read-${fieldName}`) {
                                                                                                            readPermId = perm.id;
                                                                                                        } else if (action === `write-${fieldName}`) {
                                                                                                            writePermId = perm.id;
                                                                                                        }
                                                                                                    });
                                                                                                }

                                                                                                // If not found in fieldPerms, search in entityPermissions
                                                                                                if (!invisiblePermId && !readPermId && !writePermId) {
                                                                                                    entityPermissions.forEach((perm) => {
                                                                                                        const action = perm.action || '';
                                                                                                        const permName = perm.name || '';
                                                                                                        
                                                                                                        // Check by action first
                                                                                                        if (action === `invisible-${fieldName}` || permName.endsWith(`.invisible-${fieldName}`)) {
                                                                                                            invisiblePermId = perm.id;
                                                                                                        } else if (action === `read-${fieldName}` || permName.endsWith(`.read-${fieldName}`)) {
                                                                                                            readPermId = perm.id;
                                                                                                        } else if (action === `write-${fieldName}` || permName.endsWith(`.write-${fieldName}`)) {
                                                                                                            writePermId = perm.id;
                                                                                                        }
                                                                                                    });
                                                                                                }

                                                                                                // Always show all fields - display all 3 options
                                                                                                // Determine the current state
                                                                                                const state = currentState ?? (invisiblePermId ? 'invisible' : null);
                                                                                                
                                                                                                return (
                                                                                                    <div key={fieldName} className="border rounded-md p-3">
                                                                                                        <div className="flex items-center justify-between mb-2">
                                                                                                            <Label className="text-sm font-medium">
                                                                                                                {fieldLabel}
                                                                                                            </Label>
                                                                                                        </div>
                                                                                                        <RadioGroup
                                                                                                            value={state || 'invisible'}
                                                                                                            onValueChange={(value) => {
                                                                                                                console.log(`[Field Permission] Changing ${fieldName} from ${state} to ${value}`);
                                                                                                                handleFieldPermissionChange(fieldName, value as 'invisible' | 'read' | 'write');
                                                                                                            }}
                                                                                                            className="flex gap-6"
                                                                                                        >
                                                                                                            <div className="flex items-center space-x-2">
                                                                                                                <RadioGroupItem 
                                                                                                                    value="invisible" 
                                                                                                                    id={`${fieldName}-invisible`}
                                                                                                                />
                                                                                                                <Label 
                                                                                                                    htmlFor={`${fieldName}-invisible`} 
                                                                                                                    className="text-sm cursor-pointer"
                                                                                                                >
                                                                                                                    Invisible
                                                                                                                </Label>
                                                                                                            </div>
                                                                                                            <div className="flex items-center space-x-2">
                                                                                                                <RadioGroupItem 
                                                                                                                    value="read" 
                                                                                                                    id={`${fieldName}-read`}
                                                                                                                />
                                                                                                                <Label 
                                                                                                                    htmlFor={`${fieldName}-read`} 
                                                                                                                    className="text-sm cursor-pointer"
                                                                                                                >
                                                                                                                    Read only
                                                                                                                </Label>
                                                                                                            </div>
                                                                                                            <div className="flex items-center space-x-2">
                                                                                                                <RadioGroupItem 
                                                                                                                    value="write" 
                                                                                                                    id={`${fieldName}-write`}
                                                                                                                />
                                                                                                                <Label 
                                                                                                                    htmlFor={`${fieldName}-write`} 
                                                                                                                    className="text-sm cursor-pointer"
                                                                                                                >
                                                                                                                    Write
                                                                                                                </Label>
                                                                                                            </div>
                                                                                                        </RadioGroup>
                                                                                                        {/* Debug info in development */}
                                                                                                        {typeof window !== 'undefined' && process.env.NODE_ENV === 'development' && (
                                                                                                            <div className="mt-2 text-xs text-neutral-500">
                                                                                                                IDs: invisible={invisiblePermId}, read={readPermId}, write={writePermId} | State: {state} | Current Perms: {JSON.stringify(data.permissions?.slice(0, 5))}
                                                                                                            </div>
                                                                                                        )}
                                                                                                    </div>
                                                                                                );
                                                                                            })}
                                                                                        </div>
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="p-3 grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
                                                                                        {(() => {
                                                                                            // Remove duplicate permissions based on formatted action name
                                                                                            // If both 'update' and 'edit' exist, keep only 'edit'
                                                                                            // If both 'approve' and 'set-approved' exist, keep only 'set-approved'
                                                                                            // If both 'reject' and 'set-rejected' exist, keep only 'set-rejected'
                                                                                            
                                                                                            // First, check which permissions exist
                                                                                            const hasApprove = entityPermissions.some(p => {
                                                                                                const pAction = p.action || p.name.split('.')[2];
                                                                                                return pAction === 'approve';
                                                                                            });
                                                                                            const hasSetApproved = entityPermissions.some(p => {
                                                                                                const pAction = p.action || p.name.split('.')[2];
                                                                                                return pAction === 'set-approved';
                                                                                            });
                                                                                            const hasReject = entityPermissions.some(p => {
                                                                                                const pAction = p.action || p.name.split('.')[2];
                                                                                                return pAction === 'reject';
                                                                                            });
                                                                                            const hasSetRejected = entityPermissions.some(p => {
                                                                                                const pAction = p.action || p.name.split('.')[2];
                                                                                                return pAction === 'set-rejected';
                                                                                            });
                                                                                            
                                                                                            const seenActions = new Set<string>();
                                                                                            const filteredPermissions = entityPermissions.filter((permission) => {
                                                                                                const action = permission.action || permission.name.split('.')[2];
                                                                                                const formattedAction = formatPermissionAction(action);
                                                                                                
                                                                                                // For drivers.drivers entity, if both 'update' and 'edit' exist, keep only 'edit'
                                                                                                if (moduleName === 'drivers' && entityName === 'drivers') {
                                                                                                    if (formattedAction === 'Edit') {
                                                                                                        if (seenActions.has('Edit')) {
                                                                                                            // If 'Edit' already seen, keep only the one with action 'edit' (not 'update')
                                                                                                            if (action === 'update') {
                                                                                                                return false; // Skip 'update' if 'edit' already exists
                                                                                                            }
                                                                                                        } else {
                                                                                                            seenActions.add('Edit');
                                                                                                        }
                                                                                                    }
                                                                                                }
                                                                                                
                                                                                                // For drivers.driverdocuments entity, handle approve/reject duplicates
                                                                                                if (moduleName === 'drivers' && entityName === 'driverdocuments') {
                                                                                                    // If both 'approve' and 'set-approved' exist, keep only 'set-approved'
                                                                                                    if (hasSetApproved && action === 'approve') {
                                                                                                        return false; // Skip 'approve' if 'set-approved' exists
                                                                                                    }
                                                                                                    
                                                                                                    // If both 'reject' and 'set-rejected' exist, keep only 'set-rejected'
                                                                                                    if (hasSetRejected && action === 'reject') {
                                                                                                        return false; // Skip 'reject' if 'set-rejected' exists
                                                                                                    }
                                                                                                }
                                                                                                
                                                                                                // For other cases, check if we've seen this formatted action
                                                                                                if (seenActions.has(formattedAction)) {
                                                                                                    return false;
                                                                                                }
                                                                                                seenActions.add(formattedAction);
                                                                                                return true;
                                                                                            });
                                                                                            
                                                                                            return filteredPermissions.map((permission) => (
                                                                                                <div
                                                                                                    key={permission.id}
                                                                                                    className="flex items-center gap-2"
                                                                                                >
                                                                                                    <Checkbox
                                                                                                        id={`permission-${permission.id}`}
                                                                                                        checked={data.permissions?.includes(permission.id)}
                                                                                                        onCheckedChange={(checked) =>
                                                                                                            handlePermissionToggle(permission.id, checked as boolean)
                                                                                                        }
                                                                                                    />
                                                                                                    <Label
                                                                                                        htmlFor={`permission-${permission.id}`}
                                                                                                        className="text-sm font-normal cursor-pointer"
                                                                                                    >
                                                                                                        {formatPermissionAction(
                                                                                                            permission.action || permission.name.split('.')[2]
                                                                                                        )}
                                                                                                    </Label>
                                                                                                </div>
                                                                                            ));
                                                                                        })()}
                                                                                    </div>
                                                                                )}
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                );
                                                            }
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                                {errors.permissions && (
                                    <p className="text-sm text-red-500">{errors.permissions}</p>
                                )}
                            </div>
                        )}

                        <div className="flex justify-end gap-4">
                            <Link href={`/core/companies/${company.id}`}>
                                <Button type="button" variant="outline">
                                    Cancel
                                </Button>
                            </Link>
                            <Button type="submit" disabled={processing}>
                                {processing ? 'Updating...' : 'Update Role'}
                            </Button>
                        </div>
                    </form>
                </Card>
            </div>
        </AppLayout>
    );
}

