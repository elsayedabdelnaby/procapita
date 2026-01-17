import { FormField } from '@/components/core/form-field';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { Company, CoreUser, Role } from '@/types/core';
import { Head, Link, useForm } from '@inertiajs/react';
import axios from 'axios';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';

interface RidingCompany {
    id: number;
    name: string;
}

interface Permission {
    id: number;
    name: string;
    action?: string;
    module_name?: string | null;
    entity_name?: string | null;
}

interface UserEditProps {
    user: CoreUser;
    companies?: Company[];
    roles: Role[];
    userRoles: number[];
    company?: Company;
    ridingCompanies: RidingCompany[];
    permissions?: Record<string, Record<string, Permission[]>>;
    userPermissionIds?: number[];
}

export default function UserEdit({ user, companies, roles, userRoles, company, ridingCompanies: initialRidingCompanies = [], permissions = {}, userPermissionIds = [] }: UserEditProps) {
    const [ridingCompanies, setRidingCompanies] = useState<RidingCompany[]>(initialRidingCompanies);
    const [loadingRidingCompanies, setLoadingRidingCompanies] = useState(false);
    const [teamLeaders, setTeamLeaders] = useState<Array<{id: number; name: string; email: string}>>([]);
    const [loadingTeamLeaders, setLoadingTeamLeaders] = useState(false);
    const [accountManagers, setAccountManagers] = useState<Array<{id: number; name: string; email: string}>>([]);
    const [loadingAccountManagers, setLoadingAccountManagers] = useState(false);
    const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
    const [expandedEntities, setExpandedEntities] = useState<Record<string, boolean>>({});
    const [showCompanyAdminConfirm, setShowCompanyAdminConfirm] = useState(false);

    // Get user's current permissions - use userPermissionIds from backend if available, otherwise fallback to user.permissions
    const userPermissions = userPermissionIds.length > 0 ? userPermissionIds : (user.permissions?.map((p) => p.id) || []);

    const { data, setData, put, processing, errors } = useForm({
        name: user.name || '',
        email: user.email || '',
        mobile1: user.mobile1 || '',
        mobile2: user.mobile2 || '',
        password: '',
        password_confirmation: '',
        company_id: user.company_id || '',
        riding_company_id: user.riding_company_id || '',
        team_leader_id: user.team_leader_id || '',
        account_manager_id: user.account_manager_id || '',
        role_id: userRoles && userRoles.length > 0 ? userRoles[0] : null,
        roles: userRoles || [], // Keep for backward compatibility
        permissions: userPermissions,
        is_company_admin: user.is_company_admin || false,
        is_active: user.is_active ?? true,
    });

    // Load riding companies when company_id changes
    useEffect(() => {
        const companyId = data.company_id ? Number(data.company_id) : null;
        
        if (companyId) {
            setLoadingRidingCompanies(true);
            axios
                .get(`/api/drivers/companies/${companyId}/riding-companies`)
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
    }, [data.company_id]);

    // When is_company_admin is checked, clear riding_company_id
    const handleCompanyAdminChange = (checked: boolean) => {
        if (checked && data.riding_company_id) {
            // Clear riding company when setting as company admin
            setData('riding_company_id', '');
        }
        setData('is_company_admin', checked);
    };

    // When riding_company_id is selected, uncheck is_company_admin
    const handleRidingCompanyChange = (value: string) => {
        if (value && data.is_company_admin) {
            // Uncheck company admin when selecting a riding company
            setData('is_company_admin', false);
        }
        setData('riding_company_id', value);
        // Reset team_leader_id when riding company changes
        setData('team_leader_id', '');
    };

    // Load team leaders when riding_company_id changes
    useEffect(() => {
        const ridingCompanyId = data.riding_company_id ? Number(data.riding_company_id) : null;
        
        if (ridingCompanyId) {
            setLoadingTeamLeaders(true);
            axios
                .get('/core/api/users/by-riding-company', {
                    params: { riding_company_id: ridingCompanyId }
                })
                .then((response) => {
                    setTeamLeaders(response.data.users || []);
                    // Reset team_leader_id if current selection is not in the new list
                    if (data.team_leader_id) {
                        const currentTeamLeaderId = Number(data.team_leader_id);
                        const exists = response.data.users?.some((tl: any) => tl.id === currentTeamLeaderId);
                        if (!exists) {
                            setData('team_leader_id', '');
                        }
                    }
                })
                .catch((error) => {
                    console.error('Error fetching team leaders:', error);
                    setTeamLeaders([]);
                })
                .finally(() => {
                    setLoadingTeamLeaders(false);
                });
        } else {
            setTeamLeaders([]);
            setData('team_leader_id', '');
        }
    }, [data.riding_company_id]);

    // Load account managers on component mount
    useEffect(() => {
        setLoadingAccountManagers(true);
        axios
            .get('/core/api/users/without-riding-company')
            .then((response) => {
                setAccountManagers(response.data.users || []);
            })
            .catch((error) => {
                console.error('Error fetching account managers:', error);
                setAccountManagers([]);
            })
            .finally(() => {
                setLoadingAccountManagers(false);
            });
    }, []);

    // Get company name for confirmation dialog
    const getCompanyName = () => {
        if (company) return company.name;
        if (companies && data.company_id) {
            const comp = companies.find(c => c.id === Number(data.company_id));
            return comp?.name || '';
        }
        return '';
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Check if company admin is selected - show confirmation
        if (data.is_company_admin) {
            setShowCompanyAdminConfirm(true);
            return;
        }
        
        submitForm();
    };

    const submitForm = () => {
        // Ensure permissions is always an array
        setData('permissions', data.permissions || []);
        if (company) {
            put(`/core/companies/${company.id}/users/${user.id}`);
        } else {
            put(`/core/users/${user.id}`);
        }
    };

    const handleCompanyAdminConfirm = () => {
        setShowCompanyAdminConfirm(false);
        submitForm();
    };

    const handleRoleChange = (roleId: number) => {
        // If selecting a role, clear all direct permissions
        setData('permissions', []);
        setData('role_id', roleId);
        setData('roles', [roleId]); // Keep for backward compatibility
    };

    const handlePermissionToggle = (permissionId: number, checked: boolean) => {
        if (checked) {
            // If selecting a direct permission, clear all roles
            setData('roles', []);
            setData('permissions', [...(data.permissions || []), permissionId]);
        } else {
            setData('permissions', (data.permissions || []).filter((id) => id !== permissionId));
        }
    };

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

    const handleSelectAllModule = (moduleName: string, checked: boolean) => {
        const modulePermissions = Object.values(permissions[moduleName] || {})
            .flat()
            .map((p) => p.id);
        
        if (checked) {
            // If selecting permissions, clear all roles
            setData('roles', []);
            setData('permissions', [...new Set([...(data.permissions || []), ...modulePermissions])]);
        } else {
            setData('permissions', (data.permissions || []).filter((id) => !modulePermissions.includes(id)));
        }
    };

    const handleSelectAllEntity = (moduleName: string, entityName: string, checked: boolean) => {
        const entityPermissions = (permissions[moduleName]?.[entityName] || []).map((p) => p.id);
        
        if (checked) {
            // If selecting permissions, clear all roles
            setData('roles', []);
            setData('permissions', [...new Set([...(data.permissions || []), ...entityPermissions])]);
        } else {
            setData('permissions', (data.permissions || []).filter((id) => !entityPermissions.includes(id)));
        }
    };

    return (
        <AppLayout>
            <Head title={`Edit ${user.name}`} />
            <div className="p-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold">Edit User</h1>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        Update user information and permissions
                    </p>
                </div>

                <Card className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold">User Information</h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    label="Full Name"
                                    name="name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    error={errors.name}
                                    required
                                />

                                <FormField
                                    label="Email"
                                    name="email"
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    error={errors.email}
                                    required
                                />

                                <FormField
                                    label="Mobile 1"
                                    name="mobile1"
                                    value={data.mobile1}
                                    onChange={(e) => setData('mobile1', e.target.value)}
                                    error={errors.mobile1}
                                    required
                                />

                                <FormField
                                    label="Mobile 2"
                                    name="mobile2"
                                    value={data.mobile2}
                                    onChange={(e) => setData('mobile2', e.target.value)}
                                    error={errors.mobile2}
                                />

                                {companies && companies.length > 0 && (
                                    <div className="space-y-2">
                                        <Label htmlFor="company_id">Company</Label>
                                        <select
                                            id="company_id"
                                            name="company_id"
                                            value={data.company_id}
                                            onChange={(e) => setData('company_id', e.target.value)}
                                            className="w-full rounded-md border px-3 py-2"
                                            required
                                        >
                                            <option value="">Select a company</option>
                                            {companies.map((comp) => (
                                                <option key={comp.id} value={comp.id}>
                                                    {comp.name}
                                                </option>
                                            ))}
                                        </select>
                                        {errors.company_id && (
                                            <p className="text-sm text-red-500">{errors.company_id}</p>
                                        )}
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label htmlFor="riding_company_id">Riding Company</Label>
                                    <select
                                        id="riding_company_id"
                                        name="riding_company_id"
                                        value={data.riding_company_id}
                                        onChange={(e) => handleRidingCompanyChange(e.target.value)}
                                        className="w-full rounded-md border px-3 py-2"
                                        disabled={loadingRidingCompanies || !data.company_id}
                                    >
                                        <option value="">
                                            {loadingRidingCompanies
                                                ? 'Loading...'
                                                : !data.company_id
                                                  ? 'Select company first'
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
                                    {!loadingRidingCompanies && data.company_id && ridingCompanies.length === 0 && (
                                        <p className="text-xs text-neutral-500">
                                            No riding companies available for this company
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="team_leader_id">Team Leader</Label>
                                    <select
                                        id="team_leader_id"
                                        name="team_leader_id"
                                        value={data.team_leader_id}
                                        onChange={(e) => setData('team_leader_id', e.target.value)}
                                        className="w-full rounded-md border px-3 py-2"
                                        disabled={loadingTeamLeaders || !data.riding_company_id}
                                    >
                                        <option value="">
                                            {loadingTeamLeaders
                                                ? 'Loading...'
                                                : !data.riding_company_id
                                                  ? 'Select riding company first'
                                                  : 'Select a team leader (optional)'}
                                        </option>
                                        {teamLeaders.map((teamLeader) => (
                                            <option key={teamLeader.id} value={teamLeader.id}>
                                                {teamLeader.name} ({teamLeader.email})
                                            </option>
                                        ))}
                                    </select>
                                    {errors.team_leader_id && (
                                        <p className="text-sm text-red-500">{errors.team_leader_id}</p>
                                    )}
                                    {!loadingTeamLeaders && data.riding_company_id && teamLeaders.length === 0 && (
                                        <p className="text-xs text-neutral-500">
                                            No team leaders available for this riding company
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="account_manager_id">Account Manager</Label>
                                    <select
                                        id="account_manager_id"
                                        name="account_manager_id"
                                        value={data.account_manager_id}
                                        onChange={(e) => setData('account_manager_id', e.target.value)}
                                        className="w-full rounded-md border px-3 py-2"
                                        disabled={loadingAccountManagers}
                                    >
                                        <option value="">
                                            {loadingAccountManagers
                                                ? 'Loading...'
                                                : 'Select an account manager (optional)'}
                                        </option>
                                        {accountManagers.map((accountManager) => (
                                            <option key={accountManager.id} value={accountManager.id}>
                                                {accountManager.name} ({accountManager.email})
                                            </option>
                                        ))}
                                    </select>
                                    {errors.account_manager_id && (
                                        <p className="text-sm text-red-500">{errors.account_manager_id}</p>
                                    )}
                                    {!loadingAccountManagers && accountManagers.length === 0 && (
                                        <p className="text-xs text-neutral-500">
                                            No account managers available (users without riding company)
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="rounded-md bg-blue-50 p-4 dark:bg-blue-900/20">
                                <p className="text-sm text-blue-900 dark:text-blue-100">
                                    Leave password fields empty to keep the current password.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    label="New Password (optional)"
                                    name="password"
                                    type="password"
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    error={errors.password}
                                />

                                <FormField
                                    label="Confirm New Password"
                                    name="password_confirmation"
                                    type="password"
                                    value={data.password_confirmation}
                                    onChange={(e) => setData('password_confirmation', e.target.value)}
                                    error={errors.password_confirmation}
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold">Roles & Permissions</h2>
                            
                            <div className="rounded-md bg-blue-50 p-4 dark:bg-blue-900/20">
                                <p className="text-sm text-blue-900 dark:text-blue-100">
                                    <strong>Choose one of the following:</strong>
                                </p>
                                <ul className="mt-2 list-disc list-inside text-sm text-blue-900 dark:text-blue-100 space-y-1">
                                    <li><strong>Assign Roles:</strong> User will inherit permissions from selected roles (hierarchy-based)</li>
                                    <li><strong>Direct Permissions:</strong> User will have specific permissions assigned directly (outside hierarchy)</li>
                                </ul>
                            </div>

                            {roles && roles.length > 0 ? (
                                <div className="space-y-2">
                                    <Label>Assign Roles (from hierarchy)</Label>
                                    <div className="space-y-2 rounded-md border p-4">
                                        {roles.map((role) => (
                                            <div key={role.id} className="flex items-center space-x-2">
                                                <input
                                                    type="radio"
                                                    id={`role-${role.id}`}
                                                    name="role_id"
                                                    value={role.id}
                                                    checked={data.role_id === role.id || data.roles.includes(role.id)}
                                                    onChange={() => handleRoleChange(role.id)}
                                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                                />
                                                <Label
                                                    htmlFor={`role-${role.id}`}
                                                    className="font-normal cursor-pointer"
                                                >
                                                    {role.name}
                                                    {role.hierarchy_path && (
                                                        <span className="ml-2 text-xs text-neutral-500">
                                                            ({role.hierarchy_path})
                                                        </span>
                                                    )}
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                    {(errors.role_id || errors.roles) && (
                                        <p className="text-sm text-red-500">{errors.role_id || errors.roles}</p>
                                    )}
                                </div>
                            ) : (
                                <p className="text-sm text-neutral-500">
                                    No roles available. Create roles first.
                                </p>
                            )}

                            {Object.keys(permissions).length > 0 && (
                                <div className="space-y-2">
                                    <Label>Direct Permissions (outside hierarchy)</Label>
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

                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="is_company_admin"
                                    checked={data.is_company_admin}
                                    onCheckedChange={(checked) =>
                                        handleCompanyAdminChange(checked as boolean)
                                    }
                                />
                                <Label htmlFor="is_company_admin">Company Administrator</Label>
                            </div>

                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="is_active"
                                    checked={data.is_active}
                                    onCheckedChange={(checked) =>
                                        setData('is_active', checked as boolean)
                                    }
                                />
                                <Label htmlFor="is_active">Active</Label>
                            </div>
                        </div>

                        <div className="flex justify-end gap-4">
                            <Link
                                href={
                                    user.company_id
                                        ? `/core/companies/${user.company_id}`
                                        : '/core/users'
                                }
                            >
                                <Button type="button" variant="outline">
                                    Cancel
                                </Button>
                            </Link>
                            <Button type="submit" disabled={processing}>
                                {processing ? 'Updating...' : 'Update User'}
                            </Button>
                        </div>
                    </form>
                </Card>
            </div>

            {/* Company Admin Confirmation Dialog */}
            <Dialog open={showCompanyAdminConfirm} onOpenChange={setShowCompanyAdminConfirm}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Company Administrator Confirmation</DialogTitle>
                        <DialogDescription className="pt-4">
                            By setting <strong>{data.name || 'this user'}</strong> as a Company Administrator for <strong>{getCompanyName()}</strong>, 
                            they will have access to view and manage <strong>all Riding Companies</strong> belonging to {getCompanyName()}.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setShowCompanyAdminConfirm(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCompanyAdminConfirm}>
                            OK
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

