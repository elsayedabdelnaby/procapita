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

interface CampaignType {
    id: number;
    name: string;
    slug: string;
    description?: string;
    icon?: string;
    color?: string;
    is_active: boolean;
    sort_order: number;
    company_id: number;
    channels?: any[];
    company?: Company;
}

interface CampaignTypesIndexProps {
    campaignTypes: CampaignType[];
}

export default function CampaignTypesIndex({ campaignTypes }: CampaignTypesIndexProps) {
    const [deleteDialog, setDeleteDialog] = useState<{
        open: boolean;
        campaignType: CampaignType | null;
    }>({
        open: false,
        campaignType: null,
    });

    const handleDelete = (campaignType: CampaignType) => {
        setDeleteDialog({ open: true, campaignType });
    };

    const confirmDelete = () => {
        if (deleteDialog.campaignType) {
            router.delete(`/marketing/campaign-types/${deleteDialog.campaignType.id}`);
        }
    };

    return (
        <AppLayout>
            <Head title="Campaign Types" />

            <div className="p-6">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Campaign Types</h1>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            Manage campaign types and their channels
                        </p>
                    </div>
                    <Link href="/marketing/campaign-types/create">
                        <Button>Create Type</Button>
                    </Link>
                </div>

                <Card className="p-6">
                    {campaignTypes.length > 0 ? (
                        <DataTable
                            data={campaignTypes}
                            columns={[
                                { header: 'Name', accessor: 'name' },
                                { header: 'Slug', accessor: 'slug' },
                                {
                                    header: 'Company',
                                    accessor: (row) => row.company?.name || '-',
                                },
                                {
                                    header: 'Status',
                                    accessor: (row) => (
                                        <Badge variant={row.is_active ? 'default' : 'secondary'}>
                                            {row.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    ),
                                },
                                {
                                    header: 'Channels',
                                    accessor: (row) => row.channels?.length || 0,
                                },
                                { header: 'Sort Order', accessor: 'sort_order' },
                            ]}
                            actions={(row) => (
                                <>
                                    <Link href={`/marketing/campaign-types/${row.id}/edit`}>
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
                            <p>No campaign types found.</p>
                            <Link href="/marketing/campaign-types/create">
                                <Button className="mt-4">Create First Type</Button>
                            </Link>
                        </div>
                    )}
                </Card>

                <DeleteDialog
                    open={deleteDialog.open}
                    onOpenChange={(open) => setDeleteDialog({ open, campaignType: null })}
                    onConfirm={confirmDelete}
                    title="Delete Campaign Type"
                    description={`Are you sure you want to delete "${deleteDialog.campaignType?.name}"? This will also delete all associated channels.`}
                />
            </div>
        </AppLayout>
    );
}

