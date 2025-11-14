import { DataTable } from '@/components/core/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { CoreUser } from '@/types/core';
import { Head, Link, router } from '@inertiajs/react';

interface UsersIndexProps {
    users: CoreUser[];
}

export default function UsersIndex({ users }: UsersIndexProps) {
    const handleDelete = (id: number) => {
        if (confirm('Are you sure you want to delete this user?')) {
            router.delete(`/core/users/${id}`);
        }
    };

    const handleToggleStatus = (id: number, isActive: boolean) => {
        const action = isActive ? 'deactivate' : 'activate';
        router.post(`/core/users/${id}/${action}`);
    };

    return (
        <AppLayout>
            <Head title="Users" />
            <div className="p-6">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Users</h1>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            Manage system users
                        </p>
                    </div>
                    <Link href="/core/users/create">
                        <Button>Create User</Button>
                    </Link>
                </div>

                <DataTable
                    data={users}
                    columns={[
                        {
                            header: 'Name',
                            accessor: (row) => (
                                <Link
                                    href={`/core/users/${row.id}`}
                                    className="font-medium hover:underline"
                                >
                                    {row.name}
                                </Link>
                            ),
                        },
                        {
                            header: 'Email',
                            accessor: 'email',
                        },
                        {
                            header: 'Company',
                            accessor: (row) => row.company?.name || '-',
                        },
                        {
                            header: 'Type',
                            accessor: (row) => {
                                if (row.is_super_admin) {
                                    return <Badge variant="destructive">Super Admin</Badge>;
                                }
                                if (row.is_company_admin) {
                                    return <Badge variant="default">Company Admin</Badge>;
                                }
                                return <Badge variant="secondary">User</Badge>;
                            },
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
                            <Link href={`/core/users/${row.id}`}>
                                <Button variant="ghost" size="sm">
                                    View
                                </Button>
                            </Link>
                            <Link href={`/core/users/${row.id}/edit`}>
                                <Button variant="ghost" size="sm">
                                    Edit
                                </Button>
                            </Link>
                            {!row.is_super_admin && (
                                <>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleToggleStatus(row.id, row.is_active)}
                                    >
                                        {row.is_active ? 'Deactivate' : 'Activate'}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDelete(row.id)}
                                    >
                                        Delete
                                    </Button>
                                </>
                            )}
                        </>
                    )}
                />
            </div>
        </AppLayout>
    );
}

