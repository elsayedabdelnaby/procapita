import { FormField } from '@/components/core/form-field';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { Company, Role } from '@/types/core';
import { Head, Link, useForm } from '@inertiajs/react';
import axios from 'axios';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Permission {
    id: number;
    name: string;
    module_name?: string;
    entity_name?: string;
    action?: string;
}

interface RidingCompany {
    id: number;
    name: string;
}

interface RoleEditProps {
    company: Company;
    role: Role;
    availableRoles: Role[];
    permissions?: Record<string, Record<string, Permission[]>>;
    ridingCompanies: RidingCompany[];
}

export default function RoleEdit({
    company,
    role,
    availableRoles,
    permissions = {},
    ridingCompanies: initialRidingCompanies = [],
}: RoleEditProps) {
    const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
    const [expandedEntities, setExpandedEntities] = useState<Record<string, boolean>>({});
    const [ridingCompanies, setRidingCompanies] = useState<RidingCompany[]>(initialRidingCompanies);
    const [loadingRidingCompanies, setLoadingRidingCompanies] = useState(false);

    const { data, setData, put, processing, errors } = useForm({
        name: role.name || '',
        parent_id: role.parent_id || '',
        module_name: role.module_name || '',
        entity_name: role.entity_name || '',
        riding_company_id: role.riding_company_id || '',
        permissions: (role.permissions || []).map((p: Permission) => p.id) as number[],
    });

    // Load riding companies when company changes (company is fixed in edit, but we still need to load)
    useEffect(() => {
        if (company.id) {
            setLoadingRidingCompanies(true);
            axios
                .get(`/api/drivers/companies/${company.id}/riding-companies`)
                .then((response) => {
                    setRidingCompanies(response.data);
                    // Reset riding_company_id if current selection is not in the new list
                    if (data.riding_company_id) {
                        const currentRidingCompanyId = Number(data.riding_company_id);
                        const exists = response.data.some((rc: RidingCompany) => rc.id === currentRidingCompanyId);
                        if (!exists) {
                            setData('riding_company_id', '');
                        }
                    }
                })
                .catch((error) => {
                    console.error('Error fetching riding companies:', error);
                    setRidingCompanies([]);
                })
                .finally(() => {
                    setLoadingRidingCompanies(false);
                });
        } else {
            setRidingCompanies([]);
            setData('riding_company_id', '');
        }
    }, [company.id]);

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

        Object.values(permissions[moduleName] || {}).forEach((entityPermissions) => {
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
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
                                <Label htmlFor="riding_company_id">Riding Company</Label>
                                <select
                                    id="riding_company_id"
                                    name="riding_company_id"
                                    value={data.riding_company_id}
                                    onChange={(e) => setData('riding_company_id', e.target.value)}
                                    className="w-full rounded-md border px-3 py-2"
                                    disabled={loadingRidingCompanies}
                                >
                                    <option value="">
                                        {loadingRidingCompanies
                                            ? 'Loading...'
                                            : 'Select a riding company (optional)'}
                                    </option>
                                    {ridingCompanies.map((ridingCompany) => (
                                        <option key={ridingCompany.id} value={ridingCompany.id}>
                                            {ridingCompany.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.riding_company_id && (
                                    <p className="text-sm text-red-500">{errors.riding_company_id}</p>
                                )}
                                {!loadingRidingCompanies && ridingCompanies.length === 0 && (
                                    <p className="text-xs text-neutral-500">
                                        No riding companies available for this company
                                    </p>
                                )}
                            </div>

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
                                        const modulePermissions = Object.values(entities)
                                            .flat()
                                            .map((p) => p.id);
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
                                                        {moduleName} Module
                                                    </Label>
                                                    <span className="text-xs text-neutral-500">
                                                        ({modulePermissions.length} permissions)
                                                    </span>
                                                </div>

                                                {isModuleExpanded && (
                                                    <div className="p-3 space-y-3">
                                                        {Object.entries(entities).map(
                                                            ([entityName, entityPermissions]) => {
                                                                const entityPermissionIds =
                                                                    entityPermissions.map(
                                                                        (p) => p.id
                                                                    );
                                                                const allEntitySelected =
                                                                    entityPermissionIds.length > 0 &&
                                                                    entityPermissionIds.every((id) =>
                                                                        data.permissions?.includes(id)
                                                                    );
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
                                                                                htmlFor={`entity-${moduleName}-${entityName}`}
                                                                                className="flex-1 cursor-pointer font-medium capitalize"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    toggleEntity(
                                                                                        moduleName,
                                                                                        entityName
                                                                                    );
                                                                                }}
                                                                            >
                                                                                {entityName}
                                                                            </Label>
                                                                            <span className="text-xs text-neutral-500">
                                                                                ({entityPermissionIds.length}{' '}
                                                                                permissions)
                                                                            </span>
                                                                        </div>

                                                                        {isEntityExpanded && (
                                                                            <div className="p-3 grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
                                                                                {entityPermissions.map(
                                                                                    (permission) => (
                                                                                        <div
                                                                                            key={
                                                                                                permission.id
                                                                                            }
                                                                                            className="flex items-center gap-2"
                                                                                        >
                                                                                            <Checkbox
                                                                                                id={`permission-${permission.id}`}
                                                                                                checked={data.permissions?.includes(
                                                                                                    permission.id
                                                                                                )}
                                                                                                onCheckedChange={(
                                                                                                    checked
                                                                                                ) =>
                                                                                                    handlePermissionToggle(
                                                                                                        permission.id,
                                                                                                        checked as boolean
                                                                                                    )
                                                                                                }
                                                                                            />
                                                                                            <Label
                                                                                                htmlFor={`permission-${permission.id}`}
                                                                                                className="text-sm font-normal capitalize cursor-pointer"
                                                                                            >
                                                                                                {permission.action ||
                                                                                                    permission.name.split(
                                                                                                        '.'
                                                                                                    )[2]}
                                                                                            </Label>
                                                                                        </div>
                                                                                    )
                                                                                )}
                                                                            </div>
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

