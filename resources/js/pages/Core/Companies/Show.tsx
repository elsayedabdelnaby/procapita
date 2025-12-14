import { ActivityLog } from '@/components/core/activity-log';
import { DataTable } from '@/components/core/data-table';
import { DeleteDialog } from '@/components/core/delete-dialog';
import { RoleTree } from '@/components/core/role-tree';
import { WhatsAppLinkDeviceTab } from '@/components/whatsapp/whatsapp-link-device-tab';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { Company, CoreUser, Role } from '@/types/core';
import { Head, Link, router } from '@inertiajs/react';
import { Activity, Building2, Mail, MapPin, MessageCircle, Network, Phone, ShieldCheck, Users as UsersIcon } from 'lucide-react';
import { useState } from 'react';

interface CompanyShowProps {
    company: Company;
    statistics: {
        total_users: number;
        active_users: number;
        total_roles: number;
        total_modules: number;
        active_modules: number;
    };
    users?: CoreUser[];
    roles?: Role[];
    roleHierarchy?: Role[];
    activities?: Array<{
        id: number;
        description: string;
        event?: string;
        properties?: {
            old?: Record<string, any>;
            attributes?: Record<string, any>;
        };
        causer?: {
            id: number;
            name: string;
            email?: string;
        } | null;
        created_at: string;
    }>;
}

export default function CompanyShow({ company, statistics, users, roles, roleHierarchy, activities = [] }: CompanyShowProps) {
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'roles' | 'hierarchy' | 'updates' | 'whatsapp'>('overview');
    const [deleteUserDialog, setDeleteUserDialog] = useState<{ open: boolean; user: CoreUser | null }>({
        open: false,
        user: null,
    });
    const [deleteRoleDialog, setDeleteRoleDialog] = useState<{ open: boolean; role: Role | null }>({
        open: false,
        role: null,
    });

    const handleDelete = () => {
        router.delete(`/core/companies/${company.id}`);
    };

    const handleToggleStatus = () => {
        const action = company.is_active ? 'deactivate' : 'activate';
        router.post(`/core/companies/${company.id}/${action}`);
    };

    const handleDeleteUser = (user: CoreUser) => {
        setDeleteUserDialog({ open: true, user });
    };

    const confirmDeleteUser = () => {
        if (deleteUserDialog.user) {
            router.delete(`/core/companies/${company.id}/users/${deleteUserDialog.user.id}`);
        }
    };

    const handleToggleUserStatus = (userId: number, isActive: boolean) => {
        const action = isActive ? 'deactivate' : 'activate';
        router.post(`/core/companies/${company.id}/users/${userId}/${action}`);
    };

    const handleDeleteRole = (role: Role) => {
        setDeleteRoleDialog({ open: true, role });
    };

    const confirmDeleteRole = () => {
        if (deleteRoleDialog.role) {
            router.delete(`/core/companies/${company.id}/roles/${deleteRoleDialog.role.id}`);
        }
    };

    return (
        <AppLayout>
            <Head title={company.name} />
            <div className="p-6">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">{company.name}</h1>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            Company Management
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Link href="/core/companies">
                            <Button variant="outline">Back to List</Button>
                        </Link>
                        <Link href={`/core/companies/${company.id}/edit`}>
                            <Button variant="outline">Edit</Button>
                        </Link>
                        <Button
                            variant="outline"
                            onClick={handleToggleStatus}
                        >
                            {company.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => setDeleteDialogOpen(true)}
                        >
                            Delete
                        </Button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="mb-6 border-b">
                    <nav className="flex gap-6">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                                activeTab === 'overview'
                                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                                    : 'border-transparent text-neutral-600 hover:border-neutral-300 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4" />
                                Overview
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab('users')}
                            className={`border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                                activeTab === 'users'
                                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                                    : 'border-transparent text-neutral-600 hover:border-neutral-300 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <UsersIcon className="h-4 w-4" />
                                Users ({statistics.total_users})
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab('roles')}
                            className={`border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                                activeTab === 'roles'
                                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                                    : 'border-transparent text-neutral-600 hover:border-neutral-300 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4" />
                                Roles ({statistics.total_roles})
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab('hierarchy')}
                            className={`border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                                activeTab === 'hierarchy'
                                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                                    : 'border-transparent text-neutral-600 hover:border-neutral-300 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <Network className="h-4 w-4" />
                                Hierarchy
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab('updates')}
                            className={`border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                                activeTab === 'updates'
                                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                                    : 'border-transparent text-neutral-600 hover:border-neutral-300 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <Activity className="h-4 w-4" />
                                Updates ({activities.length})
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab('whatsapp')}
                            className={`border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                                activeTab === 'whatsapp'
                                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                                    : 'border-transparent text-neutral-600 hover:border-neutral-300 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <MessageCircle className="h-4 w-4" />
                                WhatsApp Link Device
                            </div>
                        </button>
                    </nav>
                </div>

                <DeleteDialog
                    open={deleteDialogOpen}
                    onOpenChange={setDeleteDialogOpen}
                    onConfirm={handleDelete}
                    title="Delete Company"
                    description={`Are you sure you want to delete "${company.name}"? This action cannot be undone and will remove all associated data including users, roles, and permissions.`}
                />

                {/* Tab Content */}
                {activeTab === 'overview' && (
                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Company Information */}
                        <Card className="p-6">
                            <h2 className="mb-4 text-lg font-semibold">Company Information</h2>
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <Building2 className="mt-0.5 h-5 w-5 text-neutral-500" />
                                    <div className="flex-1">
                                        <p className="text-sm text-neutral-500">Company Name</p>
                                        <p className="font-medium">{company.name}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5 h-5 w-5" />
                                    <div className="flex-1">
                                        <p className="text-sm text-neutral-500">Slug</p>
                                        <p className="font-medium">{company.slug}</p>
                                    </div>
                                </div>

                                {company.email && (
                                    <div className="flex items-start gap-3">
                                        <Mail className="mt-0.5 h-5 w-5 text-neutral-500" />
                                        <div className="flex-1">
                                            <p className="text-sm text-neutral-500">Email</p>
                                            <p className="font-medium">{company.email}</p>
                                        </div>
                                    </div>
                                )}

                                {company.phone && (
                                    <div className="flex items-start gap-3">
                                        <Phone className="mt-0.5 h-5 w-5 text-neutral-500" />
                                        <div className="flex-1">
                                            <p className="text-sm text-neutral-500">Phone</p>
                                            <p className="font-medium">{company.phone}</p>
                                        </div>
                                    </div>
                                )}

                                {company.address && (
                                    <div className="flex items-start gap-3">
                                        <MapPin className="mt-0.5 h-5 w-5 text-neutral-500" />
                                        <div className="flex-1">
                                            <p className="text-sm text-neutral-500">Address</p>
                                            <p className="font-medium">{company.address}</p>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5 h-5 w-5" />
                                    <div className="flex-1">
                                        <p className="text-sm text-neutral-500">Status</p>
                                        <Badge variant={company.is_active ? 'default' : 'secondary'}>
                                            {company.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5 h-5 w-5" />
                                    <div className="flex-1">
                                        <p className="text-sm text-neutral-500">Created At</p>
                                        <p className="font-medium">
                                            {new Date(company.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* Statistics */}
                        <Card className="p-6">
                            <h2 className="mb-4 text-lg font-semibold">Statistics</h2>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between rounded-lg border p-4">
                                    <div className="flex items-center gap-3">
                                        <UsersIcon className="h-8 w-8 text-blue-500" />
                                        <div>
                                            <p className="text-sm text-neutral-500">Total Users</p>
                                            <p className="text-2xl font-bold">{statistics.total_users}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between rounded-lg border p-4">
                                    <div className="flex items-center gap-3">
                                        <UsersIcon className="h-8 w-8 text-green-500" />
                                        <div>
                                            <p className="text-sm text-neutral-500">Active Users</p>
                                            <p className="text-2xl font-bold">{statistics.active_users}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between rounded-lg border p-4">
                                    <div className="flex items-center gap-3">
                                        <Building2 className="h-8 w-8 text-purple-500" />
                                        <div>
                                            <p className="text-sm text-neutral-500">Total Roles</p>
                                            <p className="text-2xl font-bold">{statistics.total_roles}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between rounded-lg border p-4">
                                    <div className="flex items-center gap-3">
                                        <Building2 className="h-8 w-8 text-orange-500" />
                                        <div>
                                            <p className="text-sm text-neutral-500">Active Modules</p>
                                            <p className="text-2xl font-bold">
                                                {statistics.active_modules} / {statistics.total_modules}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>
                )}

                {activeTab === 'users' && (
                    <Card className="p-6">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-lg font-semibold">Company Users</h2>
                            <Link href={`/core/companies/${company.id}/users/create`}>
                                <Button>Add User</Button>
                            </Link>
                        </div>
                        
                        {users && users.length > 0 ? (
                            <DataTable
                                data={users}
                                columns={[
                                    { header: 'Name', accessor: 'name' },
                                    { header: 'Email', accessor: 'email' },
                                    {
                                        header: 'Roles',
                                        accessor: (row) =>
                                            row.roles && row.roles.length > 0
                                                ? row.roles.map((r: any) => r.name).join(', ')
                                                : 'No roles',
                                    },
                                    {
                                        header: 'Status',
                                        accessor: (row) => (
                                            <Badge variant={row.is_active ? 'default' : 'secondary'}>
                                                {row.is_active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        ),
                                    },
                                ]}
                                actions={(row) => (
                                    <>
                                        <Link href={`/core/companies/${company.id}/users/${row.id}/edit`}>
                                            <Button variant="ghost" size="sm">
                                                Edit
                                            </Button>
                                        </Link>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleToggleUserStatus(row.id, row.is_active)}
                                        >
                                            {row.is_active ? 'Deactivate' : 'Activate'}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDeleteUser(row)}
                                        >
                                            Delete
                                        </Button>
                                    </>
                                )}
                            />
                        ) : (
                            <div className="py-8 text-center text-neutral-500">
                                <p>No users found for this company.</p>
                                <Link href={`/core/companies/${company.id}/users/create`}>
                                    <Button className="mt-4">Add First User</Button>
                                </Link>
                            </div>
                        )}

                        <DeleteDialog
                            open={deleteUserDialog.open}
                            onOpenChange={(open) => setDeleteUserDialog({ open, user: null })}
                            onConfirm={confirmDeleteUser}
                            title="Delete User"
                            description={`Are you sure you want to delete "${deleteUserDialog.user?.name}"? This will revoke their access immediately.`}
                        />
                    </Card>
                )}

                {activeTab === 'roles' && (
                    <Card className="p-6">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-lg font-semibold">Company Roles</h2>
                            <Link href={`/core/companies/${company.id}/roles/create`}>
                                <Button>Create Role</Button>
                            </Link>
                        </div>
                        
                        {roles && roles.length > 0 ? (
                            <DataTable
                                data={roles}
                                columns={[
                                    { header: 'Name', accessor: 'name' },
                                    {
                                        header: 'Level',
                                        accessor: (row) => `Level ${row.hierarchy_level}`,
                                    },
                                    {
                                        header: 'Parent Role',
                                        accessor: (row) => row.parent?.name || 'Root',
                                    },
                                    {
                                        header: 'Hierarchy Path',
                                        accessor: 'hierarchy_path',
                                    },
                                    {
                                        header: 'Type',
                                        accessor: (row) => {
                                            // Show "Root" only if is_root = true AND no parent_id
                                            const isActualRoot = row.is_root && !row.parent_id;
                                            return (
                                                <Badge variant={isActualRoot ? 'default' : 'secondary'}>
                                                    {isActualRoot ? 'Root' : 'Child'}
                                            </Badge>
                                            );
                                        },
                                    },
                                ]}
                                actions={(row) => (
                                    <>
                                        <Link href={`/core/companies/${company.id}/roles/${row.id}/edit`}>
                                            <Button variant="ghost" size="sm">
                                                Edit
                                            </Button>
                                        </Link>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDeleteRole(row)}
                                        >
                                            Delete
                                        </Button>
                                    </>
                                )}
                            />
                        ) : (
                            <div className="py-8 text-center text-neutral-500">
                                <p>No roles found for this company.</p>
                                <Link href={`/core/companies/${company.id}/roles/create`}>
                                    <Button className="mt-4">Create First Role</Button>
                                </Link>
                            </div>
                        )}

                        <DeleteDialog
                            open={deleteRoleDialog.open}
                            onOpenChange={(open) => setDeleteRoleDialog({ open, role: null })}
                            onConfirm={confirmDeleteRole}
                            title="Delete Role"
                            description={`Are you sure you want to delete role "${deleteRoleDialog.role?.name}"? All users with this role will lose their permissions.`}
                        />
                    </Card>
                )}

                {activeTab === 'hierarchy' && (
                    <Card className="p-6">
                        <h2 className="mb-4 text-lg font-semibold">Role Hierarchy</h2>
                        
                        {roleHierarchy && roleHierarchy.length > 0 ? (
                            <div className="mt-4">
                                <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">
                                    Visual representation of the company's role structure showing parent-child
                                    relationships.
                                </p>
                                <RoleTree roles={roleHierarchy} companyId={company.id} />
                            </div>
                        ) : (
                            <div className="py-8 text-center text-neutral-500">
                                <p>No role hierarchy found.</p>
                                <p className="mt-2 text-sm">Create roles to build your company's hierarchy structure.</p>
                                <Link href={`/core/companies/${company.id}/roles/create`}>
                                    <Button className="mt-4">Create First Role</Button>
                                </Link>
                            </div>
                        )}
                    </Card>
                )}

                {activeTab === 'updates' && (
                    <Card className="p-6">
                        <h2 className="mb-4 text-lg font-semibold">Activity Log</h2>
                        <ActivityLog activities={activities} />
                    </Card>
                )}

                {activeTab === 'whatsapp' && (
                    <Card className="p-6">
                        <WhatsAppLinkDeviceTab companyId={company.id} />
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}

