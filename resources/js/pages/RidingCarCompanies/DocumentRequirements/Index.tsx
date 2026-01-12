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

interface DocumentRequirement {
    id: number;
    riding_company_id: number;
    riding_company?: {
        id: number;
        name: string;
    };
    riding_companies?: Array<{
        id: number;
        name: string;
    }>;
    name: string;
    type: string;
    required: boolean;
    instructions?: string;
    active: boolean;
    default_status?: string;
    created_at: string;
    driver_count?: number;
}

interface DocumentRequirementsIndexProps {
    ridingCompany: RidingCompany;
    documentRequirements: DocumentRequirement[];
}

export default function DocumentRequirementsIndex({
    ridingCompany,
    documentRequirements,
}: DocumentRequirementsIndexProps) {
    const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; requirement: DocumentRequirement | null }>({
        open: false,
        requirement: null,
    });

    const handleDelete = (requirement: DocumentRequirement) => {
        setDeleteDialog({ open: true, requirement });
    };

    const confirmDelete = () => {
        if (deleteDialog.requirement) {
            router.delete(`/ridingcarcompanies/document-requirements/${deleteDialog.requirement.id}`);
        }
    };

    const handleToggleStatus = (id: number) => {
        router.post(`/ridingcarcompanies/document-requirements/${id}/toggle-active`);
    };

    return (
        <AppLayout>
            <Head title={`Document Requirements - ${ridingCompany.name}`} />

            <div className="p-6">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Document Requirements</h1>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            Manage document requirements for riding companies
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Link href={`/ridingcarcompanies/riding-companies/${ridingCompany.id}`}>
                            <Button variant="outline">Back to Company</Button>
                        </Link>
                        <Link
                            href={`/ridingcarcompanies/riding-companies/${ridingCompany.id}/document-requirements/create`}
                        >
                            <Button>Create Document Requirement</Button>
                        </Link>
                    </div>
                </div>

                <Card className="p-6">
                    {documentRequirements.length > 0 ? (
                        <DataTable
                            data={documentRequirements}
                            columns={[
                                {
                                    header: 'Name',
                                    accessor: (row) => (
                                        <div>
                                            <Link
                                                href={`/ridingcarcompanies/document-requirements/${row.id}/edit`}
                                                className="font-medium hover:underline"
                                            >
                                                {row.name}
                                            </Link>
                                            {row.driver_count !== undefined && row.driver_count > 0 && (
                                                <p className="text-xs text-neutral-500 mt-1">
                                                    Used by {row.driver_count} driver(s)
                                                </p>
                                            )}
                                        </div>
                                    ),
                                },
                                {
                                    header: 'Riding Companies',
                                    accessor: (row) => {
                                        if (row.riding_companies && row.riding_companies.length > 0) {
                                            return (
                                                <div className="flex flex-wrap gap-1">
                                                    {row.riding_companies.map((company, index) => (
                                                        <Badge key={company.id} variant="outline" className="text-xs">
                                                            {company.name}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            );
                                        }
                                        return row.riding_company?.name || '-';
                                    },
                                },
                                {
                                    header: 'Type',
                                    accessor: (row) => (
                                        <Badge variant="outline" className="capitalize">
                                            {row.type}
                                        </Badge>
                                    ),
                                },
                                {
                                    header: 'Required',
                                    accessor: (row) => (
                                        <Badge variant={row.required ? 'destructive' : 'secondary'}>
                                            {row.required ? 'Required' : 'Optional'}
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
                                    header: 'Instructions',
                                    accessor: (row) => row.instructions || '-',
                                },
                            ]}
                            actions={(row) => (
                                <>
                                    <Link href={`/ridingcarcompanies/document-requirements/${row.id}/edit`}>
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
                            <p>No document requirements found.</p>
                            <Link
                                href={`/ridingcarcompanies/riding-companies/${ridingCompany.id}/document-requirements/create`}
                            >
                                <Button className="mt-4">Create First Document Requirement</Button>
                            </Link>
                        </div>
                    )}
                </Card>

                <DeleteDialog
                    open={deleteDialog.open}
                    onOpenChange={(open) => setDeleteDialog({ open, requirement: null })}
                    onConfirm={confirmDelete}
                    title="Delete Document Requirement"
                    description={`Are you sure you want to delete "${deleteDialog.requirement?.name}"? This action cannot be undone.`}
                />
            </div>
        </AppLayout>
    );
}

