import { DataTable } from '@/components/core/data-table';
import { DeleteDialog } from '@/components/core/delete-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

interface Driver {
    id: number;
    full_name: string;
}

interface StageTemplate {
    id: number;
    name: string;
}

interface DriverStage {
    id: number;
    driver?: Driver;
    stage_template?: StageTemplate;
    stage_order: number;
    status: string;
    completed_at?: string;
    created_at: string;
}

interface DriverStagesIndexProps {
    driverStages: DriverStage[];
}

export default function DriverStagesIndex({ driverStages }: DriverStagesIndexProps) {
    const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; stage: DriverStage | null }>({
        open: false,
        stage: null,
    });

    const handleDelete = (stage: DriverStage) => {
        setDeleteDialog({ open: true, stage });
    };

    const confirmDelete = () => {
        if (deleteDialog.stage) {
            router.delete(`/drivers/driver-stages/${deleteDialog.stage.id}`);
        }
    };

    const handleComplete = (id: number) => {
        router.post(`/drivers/driver-stages/${id}/complete`);
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
            completed: 'default',
            pending: 'secondary',
            in_progress: 'outline',
            rejected: 'destructive',
        };

        return (
            <Badge variant={variants[status] || 'secondary'}>
                {status.replace('_', ' ').toUpperCase()}
            </Badge>
        );
    };

    return (
        <AppLayout>
            <Head title="Driver Stages" />

            <div className="p-6">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Driver Stages</h1>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            Manage driver onboarding stages
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                window.location.href = '/drivers/driver-stages/export';
                            }}
                        >
                            Export
                        </Button>
                        <Link href="/drivers/driver-stages/create">
                            <Button>Create Driver Stage</Button>
                        </Link>
                    </div>
                </div>

                <Card className="p-6">
                    {driverStages.length > 0 ? (
                        <DataTable
                            data={driverStages}
                            columns={[
                                {
                                    header: 'Driver',
                                    accessor: (row) => row.driver?.full_name || '-',
                                },
                                {
                                    header: 'Stage Template',
                                    accessor: (row) => row.stage_template?.name || '-',
                                },
                                {
                                    header: 'Order',
                                    accessor: (row) => row.stage_order,
                                },
                                {
                                    header: 'Status',
                                    accessor: (row) => getStatusBadge(row.status),
                                },
                                {
                                    header: 'Completed At',
                                    accessor: (row) =>
                                        row.completed_at
                                            ? new Date(row.completed_at).toLocaleDateString()
                                            : '-',
                                },
                                {
                                    header: 'Actions',
                                    accessor: (row) => (
                                        <div className="flex items-center gap-2">
                                            <Link href={`/drivers/driver-stages/${row.id}/edit`}>
                                                <Button type="button" variant="outline" size="sm">
                                                    Edit
                                                </Button>
                                            </Link>
                                            {row.status !== 'completed' && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleComplete(row.id)}
                                                >
                                                    Complete
                                                </Button>
                                            )}
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => handleDelete(row)}
                                            >
                                                Delete
                                            </Button>
                                        </div>
                                    ),
                                },
                            ]}
                        />
                    ) : (
                        <div className="py-12 text-center">
                            <p className="text-neutral-500">No driver stages found.</p>
                            <Link href="/drivers/driver-stages/create" className="mt-4 inline-block">
                                <Button>Create First Driver Stage</Button>
                            </Link>
                        </div>
                    )}
                </Card>

                <DeleteDialog
                    open={deleteDialog.open}
                    onOpenChange={(open) => setDeleteDialog({ open, stage: null })}
                    onConfirm={confirmDelete}
                    title="Delete Driver Stage"
                    description={`Are you sure you want to delete this driver stage? This action cannot be undone.`}
                />
            </div>
        </AppLayout>
    );
}

