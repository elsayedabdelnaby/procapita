import { DataTable } from '@/components/core/data-table';
import { DeleteDialog } from '@/components/core/delete-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

interface Company {
    id: number;
    name: string;
}

interface CampaignStatus {
    id: number;
    name: string;
    slug: string;
    description?: string;
    color?: string;
    is_active: boolean;
    is_final: boolean;
    sort_order: number;
    company_id: number;
    company?: Company;
}

interface CampaignStatusesIndexProps {
    campaignStatuses: CampaignStatus[];
}

export default function CampaignStatusesIndex({ campaignStatuses }: CampaignStatusesIndexProps) {
    const [deleteDialog, setDeleteDialog] = useState<{
        open: boolean;
        campaignStatus: CampaignStatus | null;
    }>({
        open: false,
        campaignStatus: null,
    });

    const handleDelete = (campaignStatus: CampaignStatus) => {
        setDeleteDialog({ open: true, campaignStatus });
    };

    const confirmDelete = () => {
        if (deleteDialog.campaignStatus) {
            router.delete(`/marketing/campaign-statuses/${deleteDialog.campaignStatus.id}`);
        }
    };

    return (
        <AppLayout>
            <Head title="Campaign Statuses" />

            <div className="p-6">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Campaign Statuses</h1>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            Manage campaign workflow statuses
                        </p>
                    </div>
                    <Link href="/marketing/campaign-statuses/create">
                        <Button>Create Status</Button>
                    </Link>
                </div>

                <Card className="p-6">
                    {campaignStatuses.length > 0 ? (
                        <DataTable
                            data={campaignStatuses}
                            columns={[
                                { header: 'Name', accessor: 'name' },
                                { header: 'Slug', accessor: 'slug' },
                                {
                                    header: 'Company',
                                    accessor: (row) => row.company?.name || '-',
                                },
                                {
                                    header: 'Type',
                                    accessor: (row) => (
                                        <Badge variant={row.is_final ? 'outline' : 'default'}>
                                            {row.is_final ? 'Final' : 'Active'}
                                        </Badge>
                                    ),
                                },
                                {
                                    header: 'Status',
                                    accessor: (row) => (
                                        <Badge variant={row.is_active ? 'default' : 'secondary'}>
                                            {row.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    ),
                                },
                                { header: 'Sort Order', accessor: 'sort_order' },
                            ]}
                            actions={(row) => (
                                <>
                                    <Link href={`/marketing/campaign-statuses/${row.id}/edit`}>
                                        <Button variant="ghost" size="sm">
                                            Edit
                                        </Button>
                                    </Link>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDelete(row)}
                                    >
                                        Delete
                                    </Button>
                                </>
                            )}
                        />
                    ) : (
                        <div className="py-8 text-center text-neutral-500">
                            <p>No campaign statuses found.</p>
                            <Link href="/marketing/campaign-statuses/create">
                                <Button className="mt-4">Create First Status</Button>
                            </Link>
                        </div>
                    )}
                </Card>

                <DeleteDialog
                    open={deleteDialog.open}
                    onOpenChange={(open) => setDeleteDialog({ open, campaignStatus: null })}
                    onConfirm={confirmDelete}
                    title="Delete Campaign Status"
                    description={`Are you sure you want to delete "${deleteDialog.campaignStatus?.name}"?`}
                />
            </div>
        </AppLayout>
    );
}

