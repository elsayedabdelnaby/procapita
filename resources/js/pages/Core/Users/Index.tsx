import { DataTable } from '@/components/core/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { CoreUser } from '@/types/core';
import { Head, Link, router } from '@inertiajs/react';
import { RotateCcw, Trash2 } from 'lucide-react';
import { formatDate } from '@/utils/date-format';

interface UsersIndexProps {
    users: CoreUser[];
    deletedUsers?: CoreUser[];
}

export default function UsersIndex({ users, deletedUsers = [] }: UsersIndexProps) {
    const handleDelete = (id: number) => {
        if (confirm('Are you sure you want to delete this user?')) {
            router.delete(`/core/users/${id}`);
        }
    };

    const handleToggleStatus = (id: number, isActive: boolean) => {
        const action = isActive ? 'deactivate' : 'activate';
        router.post(`/core/users/${id}/${action}`);
    };

    const handleRestore = (id: number) => {
        if (confirm('Are you sure you want to restore this user?')) {
            router.post(`/core/users/${id}/restore`, {}, {
                preserveScroll: true,
                onSuccess: () => {
                    router.reload({ only: ['users', 'deletedUsers'] });
                },
            });
        }
    };

    const handleForceDelete = (id: number) => {
        if (confirm('Are you sure you want to permanently delete this user? This action cannot be undone.')) {
            router.delete(`/core/users/${id}/force`, {
                preserveScroll: true,
                onSuccess: () => {
                    router.reload({ only: ['users', 'deletedUsers'] });
                },
            });
        }
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

                {deletedUsers && deletedUsers.length > 0 && (
                    <Card className="mt-6 p-6">
                        <div className="mb-4">
                            <h2 className="text-xl font-semibold">Deleted Users</h2>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                Deleted records that can be restored
                            </p>
                        </div>
                        <DataTable
                            data={deletedUsers}
                            columns={[
                                {
                                    header: 'Name',
                                    accessor: (row) => row.name,
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
                                    header: 'Deleted At',
                                    accessor: (row) => row.deleted_at ? formatDate(row.deleted_at) : '-',
                                },
                            ]}
                            actions={(row) => (
                                <>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRestore(row.id)}
                                    >
                                        <RotateCcw className="h-4 w-4 mr-1" />
                                        Restore
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleForceDelete(row.id)}
                                    >
                                        <Trash2 className="h-4 w-4 mr-1" />
                                        Delete Permanently
                                    </Button>
                                </>
                            )}
                        />
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}

