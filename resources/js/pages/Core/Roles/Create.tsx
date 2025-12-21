import { FormField } from '@/components/core/form-field';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { Company, Role } from '@/types/core';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { type SharedData } from '@/types';
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

interface RoleCreateProps {
    company: Company;
    availableRoles: Role[];
    permissions?: Record<string, Record<string, Permission[]>>;
}

export default function RoleCreate({
    company,
    availableRoles,
    permissions = {},
}: RoleCreateProps) {
    const page = usePage<SharedData>();
    const { selectedCompany } = page.props;
    
    const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
    const [expandedEntities, setExpandedEntities] = useState<Record<string, boolean>>({});

    const { data, setData, post, processing, errors } = useForm({
        name: '',
        parent_id: '',
        module_name: '',
        entity_name: '',
        team_id: selectedCompany ? selectedCompany.id : company.id,
        permissions: [] as number[],
    });

    // Get parent_id from URL query parameter
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const parentId = urlParams.get('parent_id');
        if (parentId) {
            setData('parent_id', parentId);
        }
    }, []);

    // Update team_id when selectedCompany changes
    useEffect(() => {
        if (selectedCompany) {
            setData('team_id', selectedCompany.id);
        } else {
            setData('team_id', company.id);
        }
    }, [selectedCompany, company.id]);

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
        
        // Validation: Must select at least one permission
        if (!data.permissions || data.permissions.length === 0) {
            alert('Please select at least one Permission.');
            return;
        }
        
        const companyId = selectedCompany ? selectedCompany.id : company.id;
        post(`/core/companies/${companyId}/roles`);
    };

    return (
        <AppLayout>
            <Head title="Create Role" />
            <div className="p-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold">Create New Role</h1>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        Add a new role to {selectedCompany ? selectedCompany.name : company.name}
                    </p>
                </div>

                <Card className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold">Role Information</h2>

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
                                <Label htmlFor="parent_id">Parent Role (Optional)</Label>
                                <select
                                    id="parent_id"
                                    name="parent_id"
                                    value={data.parent_id}
                                    onChange={(e) => setData('parent_id', e.target.value)}
                                    className="w-full rounded-md border px-3 py-2"
                                >
                                    <option value="">No Parent (Root Role)</option>
                                    {availableRoles.map((role) => (
                                        <option key={role.id} value={role.id}>
                                            {role.name}
                                            {role.hierarchy_path && ` (${role.hierarchy_path})`}
                                        </option>
                                    ))}
                                </select>
                                {errors.parent_id && (
                                    <p className="text-sm text-red-500">{errors.parent_id}</p>
                                )}
                                <p className="text-xs text-neutral-500">
                                    Select a parent role to create a hierarchical structure. Leave empty to
                                    create a root role.
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

                            <div className="rounded-md bg-blue-50 p-4 dark:bg-blue-900/20">
                                <h3 className="mb-2 text-sm font-semibold text-blue-900 dark:text-blue-100">
                                    Hierarchy Information
                                </h3>
                                <ul className="space-y-1 text-xs text-blue-900 dark:text-blue-100">
                                    <li>
                                        • <strong>Root Role:</strong> A top-level role with no parent (e.g.,
                                        CEO)
                                    </li>
                                    <li>
                                        • <strong>Child Role:</strong> A role that reports to another role
                                        (e.g., Sales Manager reports to CEO)
                                    </li>
                                    <li>
                                        • <strong>Hierarchy Path:</strong> Automatically generated (e.g.,
                                        H1:H3:H5)
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
                                {processing ? 'Creating...' : 'Create Role'}
                            </Button>
                        </div>
                    </form>
                </Card>
            </div>
        </AppLayout>
    );
}

