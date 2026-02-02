import { DataTable } from '@/components/core/data-table';
import { LeadStatusDeleteDialog } from '@/components/core/lead-status-delete-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { useState, useMemo } from 'react';
import { ArrowUp, ArrowDown, GripVertical } from 'lucide-react';

interface LeadStatus {
    id: number;
    name: string;
    slug: string;
    description?: string;
    color?: string;
    order: number;
    active: boolean;
    created_at: string;
    updated_at: string;
}

interface LeadStatusesIndexProps {
    leadStatuses: LeadStatus[];
    driversCounts?: Record<number, number>;
    availableLeadStatuses?: LeadStatus[];
}

export default function LeadStatusesIndex({ 
    leadStatuses, 
    driversCounts = {}, 
    availableLeadStatuses = [] 
}: LeadStatusesIndexProps) {
    const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; status: LeadStatus | null }>({
        open: false,
        status: null,
    });

    const handleDelete = (status: LeadStatus) => {
        setDeleteDialog({ open: true, status });
    };

    // Filter available lead statuses for transfer (exclude the one being deleted)
    const availableForTransfer = useMemo(() => {
        if (!deleteDialog.status) {
            return availableLeadStatuses;
        }
        return availableLeadStatuses.filter((ls) => ls.id !== deleteDialog.status?.id);
    }, [availableLeadStatuses, deleteDialog.status]);

    const handleToggleStatus = (id: number) => {
        router.post(`/drivers/lead-statuses/${id}/toggle-active`);
    };

    const handleMoveUp = (id: number) => {
        router.post(`/drivers/lead-statuses/${id}/move-up`, {}, {
            preserveScroll: true,
            onSuccess: () => {
                router.reload({ only: ['leadStatuses'] });
            },
        });
    };

    const handleMoveDown = (id: number) => {
        router.post(`/drivers/lead-statuses/${id}/move-down`, {}, {
            preserveScroll: true,
            onSuccess: () => {
                router.reload({ only: ['leadStatuses'] });
            },
        });
    };

    return (
        <AppLayout>
            <Head title="Lead Statuses" />

            <div className="p-6">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Lead Statuses</h1>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            Manage lead statuses for tracking lead progress
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                window.location.href = '/drivers/lead-statuses/export';
                            }}
                        >
                                Export
                            </Button>
                        <Link href="/drivers/lead-statuses/import">
                            <Button type="button" variant="outline">
                                Import
                            </Button>
                        </Link>
                        <Link href="/drivers/lead-statuses/create">
                            <Button>Create Lead Status</Button>
                        </Link>
                    </div>
                </div>

                <Card className="p-6">
                    {leadStatuses.length > 0 ? (
                        <DataTable
                            data={leadStatuses}
                            columns={[
                                {
                                    header: 'Order',
                                    accessor: (row) => {
                                        const index = leadStatuses.findIndex((s) => s.id === row.id);
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
                                                        disabled={index === leadStatuses.length - 1}
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
                                            href={`/drivers/lead-statuses/${row.id}`}
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
                                            <Link href={`/drivers/lead-statuses/${row.id}/edit`}>
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
                            <p className="text-neutral-500">No lead statuses found.</p>
                            <Link href="/drivers/lead-statuses/create" className="mt-4 inline-block">
                                <Button>Create First Lead Status</Button>
                            </Link>
                        </div>
                    )}
                </Card>

                <LeadStatusDeleteDialog
                    open={deleteDialog.open}
                    onOpenChange={(open) => setDeleteDialog({ open, status: null })}
                    leadStatus={deleteDialog.status}
                    availableLeadStatuses={availableForTransfer}
                    driversCount={deleteDialog.status ? driversCounts[deleteDialog.status.id] || 0 : 0}
                />
            </div>
        </AppLayout>
    );
}

