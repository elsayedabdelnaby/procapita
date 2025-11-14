import { DataTable } from '@/components/core/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type MarketingTemplate } from '@/types/marketing';
import { Head, Link } from '@inertiajs/react';

interface TemplatesIndexProps {
    templates: MarketingTemplate[];
}

export default function TemplatesIndex({ templates }: TemplatesIndexProps) {
    return (
        <AppLayout>
            <Head title="Marketing Templates" />

            <div className="p-6">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Marketing Templates</h1>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            Manage your marketing templates
                        </p>
                    </div>
                    <Link href="/marketing/templates/create">
                        <Button>Create Template</Button>
                    </Link>
                </div>

                <Card className="p-6">
                    {templates.length > 0 ? (
                        <DataTable
                            data={templates}
                            columns={[
                                { header: 'Name', accessor: 'name' },
                                {
                                    header: 'Type',
                                    accessor: (row) => (
                                        <Badge variant="secondary">{row.type}</Badge>
                                    ),
                                },
                                {
                                    header: 'Subject',
                                    accessor: (row) => row.subject || '-',
                                },
                                {
                                    header: 'Status',
                                    accessor: (row) => (
                                        <Badge
                                            variant={
                                                row.is_active ? 'default' : 'secondary'
                                            }
                                        >
                                            {row.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    ),
                                },
                            ]}
                            actions={(row) => (
                                <>
                                    <Link href={`/marketing/templates/${row.id}`}>
                                        <Button variant="ghost" size="sm">
                                            View
                                        </Button>
                                    </Link>
                                    <Link href={`/marketing/templates/${row.id}/edit`}>
                                        <Button variant="ghost" size="sm">
                                            Edit
                                        </Button>
                                    </Link>
                                </>
                            )}
                        />
                    ) : (
                        <div className="py-8 text-center text-neutral-500">
                            <p>No templates found.</p>
                            <Link href="/marketing/templates/create">
                                <Button className="mt-4">Create First Template</Button>
                            </Link>
                        </div>
                    )}
                </Card>
            </div>
        </AppLayout>
    );
}

