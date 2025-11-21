import { DataTable } from '@/components/core/data-table';
import { DeleteDialog } from '@/components/core/delete-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

interface Driver {
    id: number;
    full_name: string;
}

interface DocumentTemplate {
    id: number;
    name: string;
    type: string;
}

interface DriverDocument {
    id: number;
    driver?: Driver;
    document_template?: DocumentTemplate;
    status: string;
    uploaded_path?: string;
    created_at: string;
}

interface DriverDocumentsIndexProps {
    driverDocuments: DriverDocument[];
}

export default function DriverDocumentsIndex({ driverDocuments }: DriverDocumentsIndexProps) {
    const [deleteDialog, setDeleteDialog] = useState<{
        open: boolean;
        document: DriverDocument | null;
    }>({
        open: false,
        document: null,
    });

    const handleDelete = (document: DriverDocument) => {
        setDeleteDialog({ open: true, document });
    };

    const confirmDelete = () => {
        if (deleteDialog.document) {
            router.delete(`/drivers/driver-documents/${deleteDialog.document.id}`);
        }
    };

    const handleApprove = (id: number) => {
        router.post(`/drivers/driver-documents/${id}/approve`);
    };

    const handleReject = (id: number) => {
        router.post(`/drivers/driver-documents/${id}/reject`);
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
            approved: 'default',
            pending: 'secondary',
            rejected: 'destructive',
        };

        return (
            <Badge variant={variants[status] || 'secondary'}>
                {status.toUpperCase()}
            </Badge>
        );
    };

    return (
        <AppLayout>
            <Head title="Driver Documents" />

            <div className="p-6">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Driver Documents</h1>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            Manage driver documents and approvals
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Link href="/drivers/driver-documents/export">
                            <Button type="button" variant="outline">
                                Export
                            </Button>
                        </Link>
                        <Link href="/drivers/driver-documents/create">
                            <Button>Create Driver Document</Button>
                        </Link>
                    </div>
                </div>

                <Card className="p-6">
                    {driverDocuments.length > 0 ? (
                        <DataTable
                            data={driverDocuments}
                            columns={[
                                {
                                    header: 'Driver',
                                    accessor: (row) => row.driver?.full_name || '-',
                                },
                                {
                                    header: 'Document Template',
                                    accessor: (row) => row.document_template?.name || '-',
                                },
                                {
                                    header: 'Type',
                                    accessor: (row) => row.document_template?.type || '-',
                                },
                                {
                                    header: 'Status',
                                    accessor: (row) => getStatusBadge(row.status),
                                },
                                {
                                    header: 'File',
                                    accessor: (row) =>
                                        row.uploaded_path ? (
                                            <Link
                                                href={`/drivers/driver-documents/${row.id}/download`}
                                                className="text-blue-600 hover:underline"
                                            >
                                                Download
                                            </Link>
                                        ) : (
                                            <span className="text-neutral-500">No file</span>
                                        ),
                                },
                                {
                                    header: 'Actions',
                                    accessor: (row) => (
                                        <div className="flex items-center gap-2">
                                            <Link href={`/drivers/driver-documents/${row.id}/edit`}>
                                                <Button type="button" variant="outline" size="sm">
                                                    Edit
                                                </Button>
                                            </Link>
                                            {row.status === 'pending' && (
                                                <>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleApprove(row.id)}
                                                    >
                                                        Approve
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() => handleReject(row.id)}
                                                    >
                                                        Reject
                                                    </Button>
                                                </>
                                            )}
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
                            <p className="text-neutral-500">No driver documents found.</p>
                            <Link
                                href="/drivers/driver-documents/create"
                                className="mt-4 inline-block"
                            >
                                <Button>Create First Driver Document</Button>
                            </Link>
                        </div>
                    )}
                </Card>

                <DeleteDialog
                    open={deleteDialog.open}
                    onOpenChange={(open) => setDeleteDialog({ open, document: null })}
                    onConfirm={confirmDelete}
                    title="Delete Driver Document"
                    description={`Are you sure you want to delete this document? This action cannot be undone.`}
                />
            </div>
        </AppLayout>
    );
}

