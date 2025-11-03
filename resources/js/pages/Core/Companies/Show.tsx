import { DeleteDialog } from '@/components/core/delete-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { Company } from '@/types/core';
import { Head, Link, router } from '@inertiajs/react';
import { Building2, Mail, MapPin, Phone, Users } from 'lucide-react';
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
}

export default function CompanyShow({ company, statistics }: CompanyShowProps) {
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const handleDelete = () => {
        router.delete(`/core/companies/${company.id}`);
    };

    const handleToggleStatus = () => {
        const action = company.is_active ? 'deactivate' : 'activate';
        router.post(`/core/companies/${company.id}/${action}`);
    };

    return (
        <AppLayout>
            <Head title={company.name} />
            <div className="p-6">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">{company.name}</h1>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            Company Details
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

                <DeleteDialog
                    open={deleteDialogOpen}
                    onOpenChange={setDeleteDialogOpen}
                    onConfirm={handleDelete}
                    title="Delete Company"
                    description={`Are you sure you want to delete "${company.name}"? This action cannot be undone and will remove all associated data including users, roles, and permissions.`}
                />

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
                                    <Users className="h-8 w-8 text-blue-500" />
                                    <div>
                                        <p className="text-sm text-neutral-500">Total Users</p>
                                        <p className="text-2xl font-bold">{statistics.total_users}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div className="flex items-center gap-3">
                                    <Users className="h-8 w-8 text-green-500" />
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
            </div>
        </AppLayout>
    );
}

