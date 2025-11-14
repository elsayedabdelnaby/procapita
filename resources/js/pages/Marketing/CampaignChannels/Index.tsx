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

interface CampaignChannel {
    id: number;
    campaign_type_id: number;
    name: string;
    slug: string;
    description?: string;
    icon?: string;
    is_active: boolean;
    sort_order: number;
    company_id: number;
    campaign_type?: {
        id: number;
        name: string;
    };
    company?: Company;
}

interface CampaignChannelsIndexProps {
    campaignChannels: CampaignChannel[];
}

export default function CampaignChannelsIndex({
    campaignChannels,
}: CampaignChannelsIndexProps) {
    const [deleteDialog, setDeleteDialog] = useState<{
        open: boolean;
        campaignChannel: CampaignChannel | null;
    }>({
        open: false,
        campaignChannel: null,
    });

    const handleDelete = (campaignChannel: CampaignChannel) => {
        setDeleteDialog({ open: true, campaignChannel });
    };

    const confirmDelete = () => {
        if (deleteDialog.campaignChannel) {
            router.delete(`/marketing/campaign-channels/${deleteDialog.campaignChannel.id}`);
        }
    };

    return (
        <AppLayout>
            <Head title="Campaign Channels" />

            <div className="p-6">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Campaign Channels</h1>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            Manage channels for each campaign type
                        </p>
                    </div>
                    <Link href="/marketing/campaign-channels/create">
                        <Button>Create Channel</Button>
                    </Link>
                </div>

                <Card className="p-6">
                    {campaignChannels.length > 0 ? (
                        <DataTable
                            data={campaignChannels}
                            columns={[
                                { header: 'Name', accessor: 'name' },
                                {
                                    header: 'Type',
                                    accessor: (row) => row.campaign_type?.name || '-',
                                },
                                {
                                    header: 'Company',
                                    accessor: (row) => row.company?.name || '-',
                                },
                                { header: 'Slug', accessor: 'slug' },
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
                                    <Link href={`/marketing/campaign-channels/${row.id}/edit`}>
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
                            <p>No campaign channels found.</p>
                            <Link href="/marketing/campaign-channels/create">
                                <Button className="mt-4">Create First Channel</Button>
                            </Link>
                        </div>
                    )}
                </Card>

                <DeleteDialog
                    open={deleteDialog.open}
                    onOpenChange={(open) => setDeleteDialog({ open, campaignChannel: null })}
                    onConfirm={confirmDelete}
                    title="Delete Campaign Channel"
                    description={`Are you sure you want to delete "${deleteDialog.campaignChannel?.name}"?`}
                />
            </div>
        </AppLayout>
    );
}

