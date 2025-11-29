import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/core/data-table';
import { DeleteDialog } from '@/components/core/delete-dialog';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { Trash2, RotateCcw, Eye, ArrowLeft, Trash } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';

interface DeletedRecord {
    id: number;
    display_name: string;
    deleted_at: string;
    deleted_at_human?: string;
    deleted_by?: {
        id: number;
        name: string;
    };
}

interface AvailableModel {
    key: string;
    name: string;
    module: string;
}

interface RecycleBinIndexProps {
    modelType: string;
    modelName: string;
    records: DeletedRecord[];
    availableModels: AvailableModel[];
}

export default function RecycleBinIndex({ modelType, modelName, records }: RecycleBinIndexProps) {
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<DeletedRecord | null>(null);
    const [restoringId, setRestoringId] = useState<number | null>(null);

    const handleRestore = (record: DeletedRecord) => {
        setRestoringId(record.id);
        router.post(
            `/recyclebin/${modelType}/${record.id}/restore`,
            {},
            {
                onFinish: () => setRestoringId(null),
                onSuccess: () => {
                    router.reload({ only: ['records'] });
                },
            }
        );
    };

    const handleDelete = (record: DeletedRecord) => {
        setSelectedRecord(record);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (!selectedRecord) return;

        router.delete(`/recyclebin/${modelType}/${selectedRecord.id}`, {
            onSuccess: () => {
                setDeleteDialogOpen(false);
                setSelectedRecord(null);
                router.reload({ only: ['records'] });
            },
        });
    };

    const columns = [
        {
            header: 'Name',
            accessorKey: 'display_name',
        },
        {
            header: 'Deleted At',
            accessorKey: 'deleted_at',
            cell: ({ row }: { row: { original: DeletedRecord } }) => {
                const record = row.original;
                return (
                    <div className="flex flex-col">
                        <span className="text-sm">
                            {record.deleted_at_human || formatDistanceToNow(new Date(record.deleted_at), { addSuffix: true })}
                        </span>
                        <span className="text-xs text-neutral-600 dark:text-neutral-400">
                            {new Date(record.deleted_at).toLocaleString()}
                        </span>
                    </div>
                );
            },
        },
        {
            header: 'Deleted By',
            accessorKey: 'deleted_by',
            cell: ({ row }: { row: { original: DeletedRecord } }) => {
                const record = row.original;
                return record.deleted_by ? (
                    <span className="text-sm">{record.deleted_by.name}</span>
                ) : (
                    <span className="text-sm text-neutral-500">Unknown</span>
                );
            },
        },
        {
            header: 'Actions',
            id: 'actions',
            cell: ({ row }: { row: { original: DeletedRecord } }) => {
                const record = row.original;
                const isRestoring = restoringId === record.id;

                return (
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.visit(`/recyclebin/${modelType}/${record.id}`)}
                        >
                            <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRestore(record)}
                            disabled={isRestoring}
                        >
                            <RotateCcw className={`h-4 w-4 ${isRestoring ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(record)}
                            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        >
                            <Trash className="h-4 w-4" />
                        </Button>
                    </div>
                );
            },
        },
    ];

    return (
        <AppLayout>
            <Head title={`Recycle Bin - ${modelName}`} />
            <div className="p-6">
                <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/recyclebin">
                            <Button variant="ghost" size="sm">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold">{modelName}</h1>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                Deleted records that can be restored
                            </p>
                        </div>
                    </div>
                </div>

                {records.length === 0 ? (
                    <Card className="p-8 text-center">
                        <Trash2 className="mx-auto h-12 w-12 text-neutral-400 mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No Deleted Records</h3>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            There are no deleted {modelName.toLowerCase()} records.
                        </p>
                    </Card>
                ) : (
                    <Card>
                        <DataTable
                            columns={columns}
                            data={records}
                            searchKey="display_name"
                            searchPlaceholder={`Search ${modelName.toLowerCase()}...`}
                        />
                    </Card>
                )}

                <DeleteDialog
                    open={deleteDialogOpen}
                    onOpenChange={setDeleteDialogOpen}
                    onConfirm={confirmDelete}
                    title="Permanently Delete Record"
                    description={`Are you sure you want to permanently delete this ${modelName.toLowerCase()}? This action cannot be undone.`}
                />
            </div>
        </AppLayout>
    );
}

