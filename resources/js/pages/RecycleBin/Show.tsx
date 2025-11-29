import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { RotateCcw, ArrowLeft, Trash, Calendar, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
import { DeleteDialog } from '@/components/core/delete-dialog';

interface RecordDetails {
    id: number;
    type: string;
    name: string;
    display_name: string;
    deleted_at: string;
    deleted_by?: {
        id: number;
        name: string;
    };
    data: Record<string, any>;
}

interface RecycleBinShowProps {
    record: RecordDetails;
}

export default function RecycleBinShow({ record }: RecycleBinShowProps) {
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [restoring, setRestoring] = useState(false);

    const handleRestore = () => {
        setRestoring(true);
        router.post(
            `/recyclebin/${record.type}/${record.id}/restore`,
            {},
            {
                onFinish: () => setRestoring(false),
                onSuccess: () => {
                    router.visit('/recyclebin');
                },
            }
        );
    };

    const handleDelete = () => {
        setDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        router.delete(`/recyclebin/${record.type}/${record.id}`, {
            onSuccess: () => {
                router.visit('/recyclebin');
            },
        });
    };

    return (
        <AppLayout>
            <Head title={`Recycle Bin - ${record.display_name}`} />
            <div className="p-6">
                <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href={`/recyclebin?type=${record.type}`}>
                            <Button variant="ghost" size="sm">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold">{record.display_name}</h1>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                {record.name} - Deleted Record Details
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={handleRestore}
                            disabled={restoring}
                        >
                            <RotateCcw className={`h-4 w-4 mr-2 ${restoring ? 'animate-spin' : ''}`} />
                            {restoring ? 'Restoring...' : 'Restore'}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                        >
                            <Trash className="h-4 w-4 mr-2" />
                            Delete Permanently
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <Card className="p-6">
                            <h2 className="text-lg font-semibold mb-4">Record Information</h2>
                            <div className="space-y-4">
                                {Object.entries(record.data).map(([key, value]) => {
                                    // Skip deleted_at as it's shown separately
                                    if (key === 'deleted_at' || key === 'updated_at' || key === 'created_at') {
                                        return null;
                                    }

                                    // Format the key for display
                                    const displayKey = key
                                        .replace(/_/g, ' ')
                                        .replace(/\b\w/g, (l) => l.toUpperCase());

                                    return (
                                        <div key={key} className="border-b border-neutral-200 dark:border-neutral-800 pb-3">
                                            <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                                                {displayKey}
                                            </p>
                                            <p className="text-sm">
                                                {value === null || value === '' ? (
                                                    <span className="text-neutral-400">—</span>
                                                ) : typeof value === 'object' ? (
                                                    <pre className="text-xs bg-neutral-100 dark:bg-neutral-900 p-2 rounded">
                                                        {JSON.stringify(value, null, 2)}
                                                    </pre>
                                                ) : (
                                                    String(value)
                                                )}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        <Card className="p-6">
                            <h2 className="text-lg font-semibold mb-4">Deletion Information</h2>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Calendar className="h-4 w-4 text-neutral-500" />
                                        <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                                            Deleted At
                                        </p>
                                    </div>
                                    <p className="text-sm font-medium">
                                        {formatDistanceToNow(new Date(record.deleted_at), { addSuffix: true })}
                                    </p>
                                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                                        {new Date(record.deleted_at).toLocaleString()}
                                    </p>
                                </div>

                                {record.deleted_by && (
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <User className="h-4 w-4 text-neutral-500" />
                                            <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                                                Deleted By
                                            </p>
                                        </div>
                                        <p className="text-sm font-medium">{record.deleted_by.name}</p>
                                    </div>
                                )}

                                <div>
                                    <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">
                                        Record Type
                                    </p>
                                    <Badge variant="outline">{record.name}</Badge>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>

                <DeleteDialog
                    open={deleteDialogOpen}
                    onOpenChange={setDeleteDialogOpen}
                    onConfirm={confirmDelete}
                    title="Permanently Delete Record"
                    description={`Are you sure you want to permanently delete this ${record.name.toLowerCase()}? This action cannot be undone.`}
                />
            </div>
        </AppLayout>
    );
}

