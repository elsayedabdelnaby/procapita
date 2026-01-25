import { ActivityLog } from '@/components/core/activity-log';
import { DataTable } from '@/components/core/data-table';
import { DeleteDialog } from '@/components/core/delete-dialog';
import { CompanyDeleteDialog } from '@/components/core/company-delete-dialog';
import { RoleTree } from '@/components/core/role-tree';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { Company, CoreUser, Role } from '@/types/core';
import { Head, Link, router } from '@inertiajs/react';
import { Activity, Building2, ChevronLeft, ChevronRight, Mail, MapPin, Network, Phone, ShieldCheck, Users as UsersIcon, X, RotateCcw, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

interface RidingCompany {
    id: number;
    name: string;
}

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
    deletedUsers?: CoreUser[];
    roles?: Role[];
    roleHierarchy?: Role[];
    ridingCompanies?: RidingCompany[];
    availableCompanies?: Array<{
        id: number;
        name: string;
    }>;
    documentRequirements?: Array<{
        id: number;
        name: string;
        type: string;
        required: boolean;
        active: boolean;
        status: string;
        riding_companies?: Array<{
            id: number;
            name: string;
        }>;
    }>;
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

export default function CompanyShow({ company, statistics, users, deletedUsers = [], roles, roleHierarchy, ridingCompanies = [], availableCompanies = [], documentRequirements = [], activities = [] }: CompanyShowProps) {
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'roles' | 'hierarchy' | 'updates'>('overview');
    const [deleteUserDialog, setDeleteUserDialog] = useState<{ open: boolean; user: CoreUser | null }>({
        open: false,
        user: null,
    });
    const [reassignToUserId, setReassignToUserId] = useState<string>('');
    const [deleteRoleDialog, setDeleteRoleDialog] = useState<{ open: boolean; role: Role | null }>({
        open: false,
        role: null,
    });
    const [userFilters, setUserFilters] = useState<Record<string, string>>({
        name: '',
        email: '',
        ridingCompany: '',
        roles: '',
        status: '',
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(100);


    const handleToggleStatus = () => {
        const action = company.is_active ? 'deactivate' : 'activate';
        router.post(`/core/companies/${company.id}/${action}`);
    };

    const handleDeleteUser = (user: CoreUser) => {
        setDeleteUserDialog({ open: true, user });
    };

    const confirmDeleteUser = () => {
        if (deleteUserDialog.user) {
            // Check if user has assigned drivers - if so, require reassignment
            if (!reassignToUserId) {
                // Try to delete without reassignment - backend will check and return error if needed
                router.delete(`/core/companies/${company.id}/users/${deleteUserDialog.user.id}`, {
                    onError: (errors) => {
                        // Error will be shown by backend validation
                    },
                });
                return;
            }
            
            const url = `/core/companies/${company.id}/users/${deleteUserDialog.user.id}`;
            router.delete(url, {
                data: { reassign_to_user_id: reassignToUserId },
                onSuccess: () => {
                    setDeleteUserDialog({ open: false, user: null });
                    setReassignToUserId('');
                },
                onError: () => {
                    // Keep dialog open on error
                },
            });
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

    const handleUserFilterChange = (key: string, value: string) => {
        setUserFilters((prev) => ({
            ...prev,
            [key]: value === '__all__' ? '' : value,
        }));
    };

    const clearUserFilter = (key: string) => {
        setUserFilters((prev) => ({
            ...prev,
            [key]: '',
        }));
    };

    const filteredUsers = useMemo(() => {
        if (!users) {
            return [];
        }

        return users.filter((user) => {
            const nameMatch = !userFilters.name || 
                user.name.toLowerCase().includes(userFilters.name.toLowerCase());
            
            const emailMatch = !userFilters.email || 
                user.email.toLowerCase().includes(userFilters.email.toLowerCase());
            
            const ridingCompanyMatch = !userFilters.ridingCompany || 
                userFilters.ridingCompany === '' ||
                (user.riding_company_id && user.riding_company_id.toString() === userFilters.ridingCompany);
            
            const rolesMatch = !userFilters.roles || 
                userFilters.roles === '' ||
                (user.roles && user.roles.length > 0 && 
                    user.roles.some((r: any) => 
                        r.id.toString() === userFilters.roles
                    ));
            
            const statusMatch = !userFilters.status || 
                userFilters.status === '' ||
                (userFilters.status === 'active' && user.is_active) ||
                (userFilters.status === 'inactive' && !user.is_active);

            return nameMatch && emailMatch && ridingCompanyMatch && rolesMatch && statusMatch;
        });
    }, [users, userFilters]);

    // Pagination
    const totalUsers = filteredUsers.length;
    const totalPages = Math.ceil(totalUsers / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [userFilters]);

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
                    </nav>
                </div>

                <CompanyDeleteDialog
                    open={deleteDialogOpen}
                    onOpenChange={setDeleteDialogOpen}
                    company={company}
                    availableCompanies={availableCompanies}
                    ridingCompaniesCount={ridingCompanies.length}
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

                        {/* Document Requirements */}
                        <Card className="p-6">
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="text-lg font-semibold">Document Requirements</h2>
                                <div className="flex gap-2">
                                    <Link href="/drivers/driver-documents">
                                        <Button variant="outline" size="sm">View All</Button>
                                    </Link>
                                    <Link href="/drivers/driver-documents/create">
                                        <Button size="sm">Create New Requirement</Button>
                                    </Link>
                                </div>
                            </div>
                            {documentRequirements && documentRequirements.length > 0 ? (
                                <div className="space-y-3">
                                    {documentRequirements.map((req) => (
                                        <div
                                            key={req.id}
                                            className="flex items-center justify-between rounded-md border p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                                        >
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <Link
                                                        href={`/drivers/driver-documents/${req.id}/edit`}
                                                        className="font-medium hover:underline"
                                                    >
                                                        {req.name}
                                                    </Link>
                                                    <Badge variant={req.active ? 'default' : 'secondary'} className="text-xs">
                                                        {req.active ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                    {req.required && (
                                                        <Badge variant="destructive" className="text-xs">
                                                            Required
                                                        </Badge>
                                                    )}
                                                </div>
                                                {req.riding_companies && req.riding_companies.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-2">
                                                        {req.riding_companies.map((rc) => (
                                                            <Badge key={rc.id} variant="outline" className="text-xs">
                                                                {rc.name}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                <Link href={`/drivers/driver-documents/${req.id}/edit`}>
                                                    <Button variant="ghost" size="sm">
                                                        Edit
                                                    </Button>
                                                </Link>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-8 text-center text-neutral-500">
                                    <p className="mb-2">No document requirements found.</p>
                                    <Link href="/drivers/driver-documents/create">
                                        <Button size="sm" className="mt-2">Create First Document Requirement</Button>
                                    </Link>
                                </div>
                            )}
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
                            <div>
                                {/* Pagination */}
                                {totalUsers > 0 && (
                                    <div className="mb-4 flex items-center justify-between border-b pb-4">
                                        <div className="flex items-center gap-4">
                                            <div className="text-sm text-neutral-600 dark:text-neutral-400">
                                                Showing {startIndex + 1} to {Math.min(endIndex, totalUsers)} of {totalUsers}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-neutral-600 dark:text-neutral-400">Rows per page:</span>
                                                <select
                                                    value={rowsPerPage}
                                                    onChange={(e) => {
                                                        setRowsPerPage(Number(e.target.value));
                                                        setCurrentPage(1);
                                                    }}
                                                    className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                                                >
                                                    <option value={10}>10</option>
                                                    <option value={25}>25</option>
                                                    <option value={50}>50</option>
                                                    <option value={100}>100</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="text-sm text-neutral-600 dark:text-neutral-400">
                                                Page {currentPage} of {totalPages || 1}
                                            </div>
                                            <div className="text-sm text-neutral-600 dark:text-neutral-400">
                                                Total: {totalUsers} user(s)
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                                    disabled={currentPage === 1}
                                                >
                                                    <ChevronLeft className="h-4 w-4" />
                                                    Previous
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                                    disabled={currentPage >= totalPages}
                                                >
                                                    Next
                                                    <ChevronRight className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div className="overflow-x-auto rounded-lg border">
                                    <table className="w-full">
                                    <thead className="bg-neutral-100/60 dark:bg-neutral-800/60 backdrop-blur-sm">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                Name
                                            </th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                Email
                                            </th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                Mobile 1
                                            </th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                Mobile 2
                                            </th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                Riding Company
                                            </th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                Roles
                                            </th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                Status
                                            </th>
                                            <th className="px-4 py-3 text-right text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                Actions
                                            </th>
                                        </tr>
                                        <tr>
                                            <th className="px-4 py-2">
                                                <div className="relative">
                                                    <Input
                                                        type="text"
                                                        placeholder="Search Name..."
                                                        value={userFilters.name}
                                                        onChange={(e) => handleUserFilterChange('name', e.target.value)}
                                                        className="w-full text-xs h-8 pr-8"
                                                    />
                                                    {userFilters.name && (
                                                        <button
                                                            onClick={() => clearUserFilter('name')}
                                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-red-500 hover:text-red-700"
                                                            title="Clear filter"
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    )}
                                                </div>
                                            </th>
                                            <th className="px-4 py-2">
                                                <div className="relative">
                                                    <Input
                                                        type="text"
                                                        placeholder="Search Email..."
                                                        value={userFilters.email}
                                                        onChange={(e) => handleUserFilterChange('email', e.target.value)}
                                                        className="w-full text-xs h-8 pr-8"
                                                    />
                                                    {userFilters.email && (
                                                        <button
                                                            onClick={() => clearUserFilter('email')}
                                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-red-500 hover:text-red-700"
                                                            title="Clear filter"
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    )}
                                                </div>
                                            </th>
                                            <th className="px-4 py-2"></th>
                                            <th className="px-4 py-2"></th>
                                            <th className="px-4 py-2">
                                                <Select
                                                    value={userFilters.ridingCompany || undefined}
                                                    onValueChange={(value) => handleUserFilterChange('ridingCompany', value || '')}
                                                >
                                                    <SelectTrigger className="w-full text-xs h-8">
                                                        <SelectValue placeholder="All Riding Companies" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="__all__">All Riding Companies</SelectItem>
                                                        {ridingCompanies && ridingCompanies.length > 0 ? (
                                                            ridingCompanies.map((rc) => (
                                                                <SelectItem key={rc.id} value={rc.id.toString()}>
                                                                    {rc.name}
                                                                </SelectItem>
                                                            ))
                                                        ) : null}
                                                    </SelectContent>
                                                </Select>
                                            </th>
                                            <th className="px-4 py-2">
                                                <Select
                                                    value={userFilters.roles || undefined}
                                                    onValueChange={(value) => handleUserFilterChange('roles', value || '')}
                                                >
                                                    <SelectTrigger className="w-full text-xs h-8">
                                                        <SelectValue placeholder="All Roles" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="__all__">All Roles</SelectItem>
                                                        {roles && roles.length > 0 ? (
                                                            roles.map((role) => (
                                                                <SelectItem key={role.id} value={role.id.toString()}>
                                                                    {role.name}
                                                                </SelectItem>
                                                            ))
                                                        ) : null}
                                                    </SelectContent>
                                                </Select>
                                            </th>
                                            <th className="px-4 py-2">
                                                <Select
                                                    value={userFilters.status || undefined}
                                                    onValueChange={(value) => handleUserFilterChange('status', value || '')}
                                                >
                                                    <SelectTrigger className="w-full text-xs h-8">
                                                        <SelectValue placeholder="All Status" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="__all__">All Status</SelectItem>
                                                        <SelectItem value="active">Active</SelectItem>
                                                        <SelectItem value="inactive">Inactive</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </th>
                                            <th className="px-4 py-2"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                                        {paginatedUsers.length === 0 ? (
                                            <tr>
                                                <td
                                                    colSpan={8}
                                                    className="px-4 py-8 text-center text-sm text-neutral-500"
                                                >
                                                    No users found
                                                </td>
                                            </tr>
                                        ) : (
                                            paginatedUsers.map((user, index) => (
                                                <tr
                                                    key={user.id}
                                                    className={`
                                                        transition-colors duration-150
                                                        ${
                                                            index === 0
                                                                ? 'bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100/70 dark:hover:bg-blue-950/40'
                                                                : index % 2 === 0
                                                                  ? 'bg-white dark:bg-neutral-950 hover:bg-neutral-50 dark:hover:bg-neutral-900/50'
                                                                  : 'bg-neutral-50/80 dark:bg-neutral-900/30 hover:bg-neutral-100 dark:hover:bg-neutral-900/60'
                                                        }
                                                    `}
                                                >
                                                    <td className="px-4 py-3 text-sm">{user.name}</td>
                                                    <td className="px-4 py-3 text-sm">{user.email}</td>
                                                    <td className="px-4 py-3 text-sm">{user.mobile1 || '-'}</td>
                                                    <td className="px-4 py-3 text-sm">{user.mobile2 || '-'}</td>
                                                    <td className="px-4 py-3 text-sm">
                                                        {user.ridingCompany?.name || '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        {user.roles && user.roles.length > 0
                                                            ? user.roles.map((r: any) => r.name).join(', ')
                                                            : 'No roles'}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        <Badge variant={user.is_active ? 'default' : 'secondary'}>
                                                            {user.is_active ? 'Active' : 'Inactive'}
                                            </Badge>
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-sm">
                                                        <div className="flex justify-end gap-2">
                                                            <Link href={`/core/companies/${company.id}/users/${user.id}/edit`}>
                                            <Button variant="ghost" size="sm">
                                                Edit
                                            </Button>
                                        </Link>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                                                onClick={() => handleToggleUserStatus(user.id, user.is_active)}
                                        >
                                                                {user.is_active ? 'Deactivate' : 'Activate'}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                                                onClick={() => handleDeleteUser(user)}
                                        >
                                            Delete
                                        </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                )}
                                    </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            <div className="py-8 text-center text-neutral-500">
                                <p>No users found for this company.</p>
                                <Link href={`/core/companies/${company.id}/users/create`}>
                                    <Button className="mt-4">Add First User</Button>
                                </Link>
                            </div>
                        )}

                        <Dialog open={deleteUserDialog.open} onOpenChange={(open) => {
                            setDeleteUserDialog({ open, user: null });
                            setReassignToUserId('');
                        }}>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Delete User</DialogTitle>
                                    <DialogDescription>
                                        Are you sure you want to delete "{deleteUserDialog.user?.name}"? This will revoke their access immediately.
                                        {deleteUserDialog.user && (
                                            <div className="mt-4">
                                                <Label htmlFor="reassign_to_user" className="text-sm font-medium">
                                                    Reassign Leads To <span className="text-red-500">*</span>
                                                </Label>
                                                <Select
                                                    value={reassignToUserId}
                                                    onValueChange={setReassignToUserId}
                                                    required
                                                >
                                                    <SelectTrigger className="mt-2">
                                                        <SelectValue placeholder="Select user to reassign leads to..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {users
                                                            .filter(u => u.id !== deleteUserDialog.user?.id)
                                                            .map((user) => (
                                                                <SelectItem key={user.id} value={String(user.id)}>
                                                                    {user.name}
                                                                </SelectItem>
                                                            ))}
                                                    </SelectContent>
                                                </Select>
                                                <p className="text-xs text-neutral-500 mt-2">
                                                    All drivers assigned to this user will be transferred to the selected user. The resigned user's name will be recorded in the "Resigned Leads" field of each transferred driver.
                                                </p>
                                            </div>
                                        )}
                                    </DialogDescription>
                                </DialogHeader>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => {
                                        setDeleteUserDialog({ open: false, user: null });
                                        setReassignToUserId('');
                                    }}>
                                        Cancel
                                    </Button>
                                    <Button 
                                        variant="destructive" 
                                        onClick={confirmDeleteUser}
                                    >
                                        Delete User
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </Card>
                )}

                {activeTab === 'users' && deletedUsers && deletedUsers.length > 0 && (
                    <Card className="p-6 mt-6">
                        <div className="mb-4">
                            <h2 className="text-xl font-semibold">Deleted Users</h2>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                Deleted records that can be restored
                            </p>
                        </div>
                        <div className="overflow-x-auto rounded-lg border">
                            <table className="w-full">
                                <thead className="bg-neutral-100/60 dark:bg-neutral-800/60 backdrop-blur-sm">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                            Name
                                        </th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                            Email
                                        </th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                            Mobile 1
                                        </th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                            Mobile 2
                                        </th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                            Riding Company
                                        </th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                            Roles
                                        </th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                            Deleted At
                                        </th>
                                        <th className="px-4 py-3 text-right text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                                    {deletedUsers.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={8}
                                                className="px-4 py-8 text-center text-sm text-neutral-500"
                                            >
                                                No deleted users found
                                            </td>
                                        </tr>
                                    ) : (
                                        deletedUsers.map((user, index) => (
                                            <tr
                                                key={user.id}
                                                className={`
                                                    transition-colors duration-150
                                                    ${
                                                        index % 2 === 0
                                                            ? 'bg-white dark:bg-neutral-950 hover:bg-neutral-50 dark:hover:bg-neutral-900/50'
                                                            : 'bg-neutral-50/80 dark:bg-neutral-900/30 hover:bg-neutral-100 dark:hover:bg-neutral-900/60'
                                                    }
                                                `}
                                            >
                                                <td className="px-4 py-3 text-sm">{user.name}</td>
                                                <td className="px-4 py-3 text-sm">{user.email}</td>
                                                <td className="px-4 py-3 text-sm">{user.mobile1 || '-'}</td>
                                                <td className="px-4 py-3 text-sm">{user.mobile2 || '-'}</td>
                                                <td className="px-4 py-3 text-sm">
                                                    {user.ridingCompany?.name || '-'}
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    {user.roles && user.roles.length > 0
                                                        ? user.roles.map((r: any) => r.name).join(', ')
                                                        : 'No roles'}
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    {user.deleted_at ? new Date(user.deleted_at).toLocaleString() : '-'}
                                                </td>
                                                <td className="px-4 py-3 text-right text-sm">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => {
                                                                if (confirm('Are you sure you want to restore this user?')) {
                                                                    router.post(`/core/companies/${company.id}/users/${user.id}/restore`, {}, {
                                                                        preserveScroll: true,
                                                                        onSuccess: () => {
                                                                            router.reload({ only: ['users', 'deletedUsers'] });
                                                                        },
                                                                    });
                                                                }
                                                            }}
                                                        >
                                                            Restore
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => {
                                                                if (confirm('Are you sure you want to permanently delete this user? This action cannot be undone.')) {
                                                                    router.delete(`/core/companies/${company.id}/users/${user.id}/force`, {
                                                                        preserveScroll: true,
                                                                        onSuccess: () => {
                                                                            router.reload({ only: ['users', 'deletedUsers'] });
                                                                        },
                                                                    });
                                                                }
                                                            }}
                                                        >
                                                            Delete Permanently
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
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

            </div>
        </AppLayout>
    );
}

