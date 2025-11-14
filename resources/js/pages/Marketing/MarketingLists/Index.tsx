import { DataTable } from '@/components/core/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type MarketingList } from '@/types/marketing';
import { Head, Link } from '@inertiajs/react';

interface MarketingListsIndexProps {
    lists: MarketingList[];
}

export default function MarketingListsIndex({ lists }: MarketingListsIndexProps) {
    return (
        <AppLayout>
            <Head title="Marketing Lists" />

            <div className="p-6">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Marketing Lists</h1>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            Manage your contact lists
                        </p>
                    </div>
                    <Link href="/marketing/marketing-lists/create">
                        <Button>Create List</Button>
                    </Link>
                </div>

                <Card className="p-6">
                    {lists.length > 0 ? (
                        <DataTable
                            data={lists}
                            columns={[
                                { header: 'Name', accessor: 'name' },
                                {
                                    header: 'Type',
                                    accessor: (row) => (
                                        <Badge variant="secondary">{row.type}</Badge>
                                    ),
                                },
                                {
                                    header: 'Status',
                                    accessor: (row) => (
                                        <Badge
                                            variant={
                                                row.status === 'active'
                                                    ? 'default'
                                                    : 'secondary'
                                            }
                                        >
                                            {row.status}
                                        </Badge>
                                    ),
                                },
                                {
                                    header: 'Total Contacts',
                                    accessor: (row) => row.total_contacts.toLocaleString(),
                                },
                            ]}
                            actions={(row) => (
                                <>
                                    <Link href={`/marketing/marketing-lists/${row.id}`}>
                                        <Button variant="ghost" size="sm">
                                            View
                                        </Button>
                                    </Link>
                                    <Link href={`/marketing/marketing-lists/${row.id}/edit`}>
                                        <Button variant="ghost" size="sm">
                                            Edit
                                        </Button>
                                    </Link>
                                </>
                            )}
                        />
                    ) : (
                        <div className="py-8 text-center text-neutral-500">
                            <p>No marketing lists found.</p>
                            <Link href="/marketing/marketing-lists/create">
                                <Button className="mt-4">Create First List</Button>
                            </Link>
                        </div>
                    )}
                </Card>
            </div>
        </AppLayout>
    );
}

