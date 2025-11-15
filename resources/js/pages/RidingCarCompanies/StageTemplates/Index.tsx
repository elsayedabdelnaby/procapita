import { DataTable } from '@/components/core/data-table';
import { DeleteDialog } from '@/components/core/delete-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

interface RidingCompany {
    id: number;
    name: string;
}

interface StageTemplate {
    id: number;
    riding_company_id: number;
    name: string;
    order: number;
    target_value: number;
    target_unit: string;
    duration_days: number;
    strict_sequence: boolean;
    allow_cumulative: boolean;
    description?: string;
    active: boolean;
    created_at: string;
}

interface StageTemplatesIndexProps {
    ridingCompany: RidingCompany;
    stageTemplates: StageTemplate[];
}

export default function StageTemplatesIndex({
    ridingCompany,
    stageTemplates,
}: StageTemplatesIndexProps) {
    const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; template: StageTemplate | null }>({
        open: false,
        template: null,
    });

    const handleDelete = (template: StageTemplate) => {
        setDeleteDialog({ open: true, template });
    };

    const confirmDelete = () => {
        if (deleteDialog.template) {
            router.delete(`/ridingcarcompanies/stage-templates/${deleteDialog.template.id}`);
        }
    };

    const handleToggleStatus = (id: number) => {
        router.post(`/ridingcarcompanies/stage-templates/${id}/toggle-active`);
    };

    return (
        <AppLayout>
            <Head title={`Stage Templates - ${ridingCompany.name}`} />

            <div className="p-6">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Stage Templates</h1>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            Manage stage templates for <strong>{ridingCompany.name}</strong>
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Link href={`/ridingcarcompanies/riding-companies/${ridingCompany.id}`}>
                            <Button variant="outline">Back to Company</Button>
                        </Link>
                        <Link
                            href={`/ridingcarcompanies/riding-companies/${ridingCompany.id}/stage-templates/create`}
                        >
                            <Button>Create Stage Template</Button>
                        </Link>
                    </div>
                </div>

                <Card className="p-6">
                    {stageTemplates.length > 0 ? (
                        <DataTable
                            data={stageTemplates}
                            columns={[
                                {
                                    header: 'Order',
                                    accessor: (row) => row.order,
                                },
                                {
                                    header: 'Name',
                                    accessor: (row) => (
                                        <Link
                                            href={`/ridingcarcompanies/stage-templates/${row.id}/edit`}
                                            className="font-medium hover:underline"
                                        >
                                            {row.name}
                                        </Link>
                                    ),
                                },
                                {
                                    header: 'Target',
                                    accessor: (row) => `${row.target_value} ${row.target_unit}`,
                                },
                                {
                                    header: 'Duration',
                                    accessor: (row) => `${row.duration_days} days`,
                                },
                                {
                                    header: 'Strict Sequence',
                                    accessor: (row) => (
                                        <Badge variant={row.strict_sequence ? 'default' : 'secondary'}>
                                            {row.strict_sequence ? 'Yes' : 'No'}
                                        </Badge>
                                    ),
                                },
                                {
                                    header: 'Allow Cumulative',
                                    accessor: (row) => (
                                        <Badge variant={row.allow_cumulative ? 'default' : 'secondary'}>
                                            {row.allow_cumulative ? 'Yes' : 'No'}
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
                            ]}
                            actions={(row) => (
                                <>
                                    <Link href={`/ridingcarcompanies/stage-templates/${row.id}/edit`}>
                                        <Button variant="ghost" size="sm">
                                            Edit
                                        </Button>
                                    </Link>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleToggleStatus(row.id)}
                                    >
                                        {row.active ? 'Deactivate' : 'Activate'}
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleDelete(row)}>
                                        Delete
                                    </Button>
                                </>
                            )}
                        />
                    ) : (
                        <div className="py-8 text-center text-neutral-500">
                            <p>No stage templates found.</p>
                            <Link
                                href={`/ridingcarcompanies/riding-companies/${ridingCompany.id}/stage-templates/create`}
                            >
                                <Button className="mt-4">Create First Stage Template</Button>
                            </Link>
                        </div>
                    )}
                </Card>

                <DeleteDialog
                    open={deleteDialog.open}
                    onOpenChange={(open) => setDeleteDialog({ open, template: null })}
                    onConfirm={confirmDelete}
                    title="Delete Stage Template"
                    description={`Are you sure you want to delete "${deleteDialog.template?.name}"? This action cannot be undone.`}
                />
            </div>
        </AppLayout>
    );
}

