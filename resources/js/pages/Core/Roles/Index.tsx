import { DataTable } from '@/components/core/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { Role } from '@/types/core';
import { Head, Link, router } from '@inertiajs/react';

interface RolesIndexProps {
    roles: Role[];
}

export default function RolesIndex({ roles }: RolesIndexProps) {
    const handleDelete = (id: number) => {
        if (confirm('Are you sure you want to delete this role?')) {
            router.delete(`/core/roles/${id}`);
        }
    };

    return (
        <AppLayout>
            <Head title="Roles" />
            <div className="p-6">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Roles</h1>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            Manage roles and permissions
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Link href="/core/roles/hierarchy">
                            <Button variant="outline">View Hierarchy</Button>
                        </Link>
                        <Link href="/core/roles/create">
                            <Button>Create Role</Button>
                        </Link>
                    </div>
                </div>

                <DataTable
                    data={roles}
                    columns={[
                        {
                            header: 'Name',
                            accessor: (row) => (
                                <Link
                                    href={`/core/roles/${row.id}`}
                                    className="font-medium hover:underline"
                                >
                                    {row.name}
                                </Link>
                            ),
                        },
                        {
                            header: 'Type',
                            accessor: (row) => (
                                <Badge variant={row.is_root ? 'default' : 'secondary'}>
                                    {row.is_root ? 'Root' : 'Standard'}
                                </Badge>
                            ),
                        },
                        {
                            header: 'Level',
                            accessor: 'hierarchy_level',
                        },
                        {
                            header: 'Module',
                            accessor: (row) => row.module_name || '-',
                        },
                        {
                            header: 'Permissions',
                            accessor: (row) => row.permissions?.length || 0,
                        },
                    ]}
                    actions={(row) => (
                        <>
                            <Link href={`/core/roles/${row.id}`}>
                                <Button variant="ghost" size="sm">
                                    View
                                </Button>
                            </Link>
                            <Link href={`/core/roles/${row.id}/edit`}>
                                <Button variant="ghost" size="sm">
                                    Edit
                                </Button>
                            </Link>
                            {!row.is_root && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(row.id)}
                                >
                                    Delete
                                </Button>
                            )}
                        </>
                    )}
                />
            </div>
        </AppLayout>
    );
}

