import { DataTable } from '@/components/core/data-table';
import { LeadSourceDeleteDialog } from '@/components/core/lead-source-delete-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { useState, useMemo } from 'react';

interface LeadSource {
    id: number;
    name: string;
    slug: string;
    description?: string;
    active: boolean;
    created_at: string;
    updated_at: string;
}

interface LeadSourcesIndexProps {
    leadSources: LeadSource[];
    driversCounts?: Record<number, number>;
    availableLeadSources?: LeadSource[];
}

export default function LeadSourcesIndex({ 
    leadSources, 
    driversCounts = {}, 
    availableLeadSources = [] 
}: LeadSourcesIndexProps) {
    const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; source: LeadSource | null }>({
        open: false,
        source: null,
    });

    const handleDelete = (source: LeadSource) => {
        setDeleteDialog({ open: true, source });
    };

    // Filter available lead sources for transfer (exclude the one being deleted)
    const availableForTransfer = useMemo(() => {
        if (!deleteDialog.source) {
            return availableLeadSources;
        }
        return availableLeadSources.filter((ls) => ls.id !== deleteDialog.source?.id);
    }, [availableLeadSources, deleteDialog.source]);

    const handleToggleStatus = (id: number) => {
        router.post(`/drivers/lead-sources/${id}/toggle-active`);
    };

    return (
        <AppLayout>
            <Head title="Lead Sources" />

            <div className="p-6">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Lead Sources</h1>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            Manage lead sources for tracking lead origins
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                window.location.href = '/drivers/lead-sources/export';
                            }}
                        >
                                Export
                            </Button>
                        <Link href="/drivers/lead-sources/import">
                            <Button type="button" variant="outline">
                                Import
                            </Button>
                        </Link>
                        <Link href="/drivers/lead-sources/create">
                            <Button>Create Lead Source</Button>
                        </Link>
                    </div>
                </div>

                <Card className="p-6">
                    {leadSources.length > 0 ? (
                        <DataTable
                            data={leadSources}
                            columns={[
                                {
                                    header: 'Name',
                                    accessor: (row) => (
                                        <Link
                                            href={`/drivers/lead-sources/${row.id}`}
                                            className="font-medium hover:underline"
                                        >
                                            {row.name}
                                        </Link>
                                    ),
                                },
                                {
                                    header: 'Slug',
                                    accessor: (row) => (
                                        <span className="font-mono text-xs">{row.slug}</span>
                                    ),
                                },
                                {
                                    header: 'Description',
                                    accessor: (row) => row.description || '-',
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
                                            <Link href={`/drivers/lead-sources/${row.id}/edit`}>
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
                                {
                                    header: 'Leads',
                                    accessor: (row) => driversCounts[row.id] || 0,
                                },
                            ]}
                        />
                    ) : (
                        <div className="py-12 text-center">
                            <p className="text-neutral-500">No lead sources found.</p>
                            <Link href="/drivers/lead-sources/create" className="mt-4 inline-block">
                                <Button>Create First Lead Source</Button>
                            </Link>
                        </div>
                    )}
                </Card>

                <LeadSourceDeleteDialog
                    open={deleteDialog.open}
                    onOpenChange={(open) => setDeleteDialog({ open, source: null })}
                    leadSource={deleteDialog.source}
                    availableLeadSources={availableForTransfer}
                    driversCount={deleteDialog.source ? driversCounts[deleteDialog.source.id] || 0 : 0}
                />
            </div>
        </AppLayout>
    );
}

