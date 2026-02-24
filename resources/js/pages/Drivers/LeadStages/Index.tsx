import { DataTable } from '@/components/core/data-table';
import { DeleteDialog } from '@/components/core/delete-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { usePermissions } from '@/hooks/use-permissions';

interface LeadStage {
    id: number;
    name: string;
    slug: string;
    description?: string;
    color?: string;
    order: number;
    active: boolean;
    requires_all_documents_approved: boolean;
    created_at: string;
    updated_at: string;
}

interface LeadStagesIndexProps {
    leadStages: LeadStage[];
}

export default function LeadStagesIndex({ leadStages }: LeadStagesIndexProps) {
    const { can } = usePermissions();
    const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; stage: LeadStage | null }>({
        open: false,
        stage: null,
    });

    const handleDelete = (stage: LeadStage) => {
        setDeleteDialog({ open: true, stage });
    };

    const confirmDelete = () => {
        if (deleteDialog.stage) {
            router.delete(`/leads/lead-stages/${deleteDialog.stage.id}`);
        }
    };

    const handleToggleStatus = (id: number) => {
        router.post(`/leads/lead-stages/${id}/toggle-active`);
    };

    const handleMoveUp = (id: number) => {
        router.post(`/leads/lead-stages/${id}/move-up`, {}, {
            preserveScroll: true,
            onSuccess: () => {
                router.reload({ only: ['leadStages'] });
            },
        });
    };

    const handleMoveDown = (id: number) => {
        router.post(`/leads/lead-stages/${id}/move-down`, {}, {
            preserveScroll: true,
            onSuccess: () => {
                router.reload({ only: ['leadStages'] });
            },
        });
    };

    return (
        <AppLayout>
            <Head title="Stages" />

            <div className="p-6">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Stages</h1>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            Manage stages for tracking lead progress
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {can('drivers', 'leadstages', 'export') && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    window.location.href = '/leads/lead-stages/export';
                                }}
                            >
                                Export
                            </Button>
                        )}
                        {can('drivers', 'leadstages', 'import') && (
                            <Link href="/leads/lead-stages/import">
                                <Button type="button" variant="outline">
                                    Import
                                </Button>
                            </Link>
                        )}
                        {can('drivers', 'leadstages', 'create') && (
                            <Link href="/leads/lead-stages/create">
                                <Button>Create Stage</Button>
                            </Link>
                        )}
                    </div>
                </div>

                <Card className="p-6">
                    {leadStages.length > 0 ? (
                        <DataTable
                            data={leadStages}
                            columns={[
                                {
                                    header: 'Trip',
                                    accessor: (row) => {
                                        const index = leadStages.findIndex((s) => s.id === row.id);
                                        return (
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-neutral-700 dark:text-neutral-300 min-w-[2rem]">
                                                    {row.order}
                                                </span>
                                                <div className="flex flex-col gap-0.5">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 w-6 p-0"
                                                        onClick={() => handleMoveUp(row.id)}
                                                        disabled={index === 0}
                                                        title="Move Up"
                                                    >
                                                        <ArrowUp className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 w-6 p-0"
                                                        onClick={() => handleMoveDown(row.id)}
                                                        disabled={index === leadStages.length - 1}
                                                        title="Move Down"
                                                    >
                                                        <ArrowDown className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    },
                                },
                                {
                                    header: 'Name',
                                    accessor: (row) => (
                                        <Link
                                            href={`/leads/lead-stages/${row.id}`}
                                            className="font-medium hover:underline"
                                        >
                                            {row.name}
                                        </Link>
                                    ),
                                },
                                {
                                    header: 'Color',
                                    accessor: (row) =>
                                        row.color ? (
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="h-4 w-4 rounded-full border"
                                                    style={{ backgroundColor: row.color }}
                                                />
                                                <span className="text-xs">{row.color}</span>
                                            </div>
                                        ) : (
                                            '-'
                                        ),
                                },
                                {
                                    header: 'Requires Documents',
                                    accessor: (row) => (
                                        <Badge variant={row.requires_all_documents_approved ? 'default' : 'secondary'}>
                                            {row.requires_all_documents_approved ? 'Yes' : 'No'}
                                        </Badge>
                                    ),
                                },
                                {
                                    header: 'Status',
                                    accessor: (row) => (
                                        <Badge variant={row.active ? 'default' : 'secondary'}>
                                            {row.active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    ),
                                },
                                {
                                    header: 'Actions',
                                    accessor: (row) => (
                                        <div className="flex items-center gap-2">
                                            {can('drivers', 'leadstages', 'read') && (
                                                <Link href={`/leads/lead-stages/${row.id}`}>
                                                    <Button type="button" variant="outline" size="sm">
                                                        View
                                                    </Button>
                                                </Link>
                                            )}
                                            {can('drivers', 'leadstages', 'update') && (
                                                <>
                                                    <Link href={`/leads/lead-stages/${row.id}/edit`}>
                                                        <Button type="button" variant="outline" size="sm">
                                                            Edit
                                                        </Button>
                                                    </Link>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleToggleStatus(row.id)}
                                                    >
                                                        {row.active ? 'Deactivate' : 'Activate'}
                                                    </Button>
                                                </>
                                            )}
                                            {can('drivers', 'leadstages', 'delete') && (
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => handleDelete(row)}
                                                >
                                                    Delete
                                                </Button>
                                            )}
                                        </div>
                                    ),
                                },
                            ]}
                        />
                    ) : (
                        <div className="py-12 text-center">
                            <p className="text-neutral-500">No stages found.</p>
                            {can('drivers', 'leadstages', 'create') && (
                                <Link href="/leads/lead-stages/create" className="mt-4 inline-block">
                                    <Button>Create First Stage</Button>
                                </Link>
                            )}
                        </div>
                    )}
                </Card>

                <DeleteDialog
                    open={deleteDialog.open}
                    onOpenChange={(open) => setDeleteDialog({ open, stage: null })}
                    onConfirm={confirmDelete}
                    title="Delete Stage"
                    description={`Are you sure you want to delete "${deleteDialog.stage?.name}"? This action cannot be undone.`}
                />
            </div>
        </AppLayout>
    );
}

