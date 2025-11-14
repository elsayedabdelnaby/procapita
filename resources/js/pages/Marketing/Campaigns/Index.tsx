import { DataTable } from '@/components/core/data-table';
import { DeleteDialog } from '@/components/core/delete-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type Campaign } from '@/types/marketing';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

interface CampaignsIndexProps {
    campaigns: Campaign[];
}

export default function CampaignsIndex({ campaigns }: CampaignsIndexProps) {
    const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; campaign: Campaign | null }>({
        open: false,
        campaign: null,
    });

    const handleDelete = (campaign: Campaign) => {
        setDeleteDialog({ open: true, campaign });
    };

    const confirmDelete = () => {
        if (deleteDialog.campaign) {
            router.delete(`/marketing/campaigns/${deleteDialog.campaign.id}`);
        }
    };

    const handleToggleStatus = (campaign: Campaign) => {
        const statusSlug = campaign.status?.slug || '';
        const action = statusSlug === 'active' ? 'pause' : 'activate';
        router.post(`/marketing/campaigns/${campaign.id}/${action}`);
    };

    const getStatusColor = (statusSlug: string) => {
        switch (statusSlug) {
            case 'active':
                return 'default';
            case 'paused':
                return 'secondary';
            case 'completed':
                return 'outline';
            case 'cancelled':
                return 'destructive';
            default:
                return 'secondary';
        }
    };

    return (
        <AppLayout>
            <Head title="Campaigns" />

            <div className="p-6">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Campaigns</h1>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            Manage your marketing campaigns
                        </p>
                    </div>
                    <Link href="/marketing/campaigns/create">
                        <Button>Create Campaign</Button>
                    </Link>
                </div>

                <Card className="p-6">
                    {campaigns.length > 0 ? (
                        <DataTable
                            data={campaigns}
                            columns={[
                                { header: 'Name', accessor: 'name' },
                                {
                                    header: 'Type',
                                    accessor: (row) => (
                                        <Badge style={{ backgroundColor: row.type?.color }}>
                                            {row.type?.name || '-'}
                                        </Badge>
                                    ),
                                },
                                {
                                    header: 'Status',
                                    accessor: (row) => (
                                        <Badge
                                            variant={getStatusColor(row.status?.slug || '')}
                                            style={{ backgroundColor: row.status?.color }}
                                        >
                                            {row.status?.name || '-'}
                                        </Badge>
                                    ),
                                },
                                {
                                    header: 'Start Date',
                                    accessor: (row) =>
                                        row.start_date
                                            ? new Date(row.start_date).toLocaleDateString()
                                            : '-',
                                },
                                {
                                    header: 'Expected Budget',
                                    accessor: (row) =>
                                        row.expected_budget
                                            ? `$${row.expected_budget.toLocaleString()}`
                                            : '-',
                                },
                                {
                                    header: 'Expected Leads',
                                    accessor: (row) =>
                                        row.expected_leads
                                            ? row.expected_leads.toLocaleString()
                                            : '-',
                                },
                            ]}
                            actions={(row) => (
                                <>
                                    <Link href={`/marketing/campaigns/${row.id}`}>
                                        <Button variant="ghost" size="sm">
                                            View
                                        </Button>
                                    </Link>
                                    <Link href={`/marketing/campaigns/${row.id}/edit`}>
                                        <Button variant="ghost" size="sm">
                                            Edit
                                        </Button>
                                    </Link>
                                    {(row.status?.slug === 'active' ||
                                        row.status?.slug === 'paused') && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleToggleStatus(row)}
                                        >
                                            {row.status?.slug === 'active' ? 'Pause' : 'Activate'}
                                        </Button>
                                    )}
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
                            <p>No campaigns found.</p>
                            <Link href="/marketing/campaigns/create">
                                <Button className="mt-4">Create First Campaign</Button>
                            </Link>
                        </div>
                    )}
                </Card>

                <DeleteDialog
                    open={deleteDialog.open}
                    onOpenChange={(open) => setDeleteDialog({ open, campaign: null })}
                    onConfirm={confirmDelete}
                    title="Delete Campaign"
                    description={`Are you sure you want to delete "${deleteDialog.campaign?.name}"? This action cannot be undone.`}
                />
            </div>
        </AppLayout>
    );
}

