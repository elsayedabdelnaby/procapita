import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Trash2, RotateCcw, Eye, FileText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useEffect, useState } from 'react';

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

interface DeletedRecordsGroup {
    type: string;
    name: string;
    module: string;
    display_field: string;
    count: number;
    records: DeletedRecord[];
}

interface AvailableModel {
    key: string;
    name: string;
    module: string;
}

interface RecycleBinOverviewProps {
    deletedRecords: Record<string, DeletedRecordsGroup>;
    availableModels: AvailableModel[];
}

export default function RecycleBinOverview({ deletedRecords, availableModels }: RecycleBinOverviewProps) {
    const hasDeletedRecords = Object.keys(deletedRecords).length > 0;
    const page = usePage();
    const [showAvailableModels, setShowAvailableModels] = useState(true);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const selectedModelType = urlParams.get('type');
        setShowAvailableModels(!selectedModelType);
    }, [page.url]);

    return (
        <AppLayout>
            <Head title="Recycle Bin" />
            <div className="p-6">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Recycle Bin</h1>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            View and restore deleted records
                        </p>
                    </div>
                </div>

                {/* Available Models List - Show first */}
                {showAvailableModels && availableModels.length > 0 && (
                    <Card className="mb-6 p-6">
                        <h3 className="text-lg font-semibold mb-4">Available Models</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                            {availableModels.map((model) => (
                                <button
                                    key={model.key}
                                    onClick={() => router.visit(`/recyclebin?type=${model.key}`)}
                                    className="p-3 border border-neutral-200 dark:border-neutral-800 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors text-left"
                                >
                                    <div className="flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-neutral-500" />
                                        <span className="text-sm font-medium">{model.name}</span>
                                    </div>
                                    <Badge variant="outline" className="mt-2 text-xs">
                                        {model.module}
                                    </Badge>
                                </button>
                            ))}
                        </div>
                    </Card>
                )}

                {!hasDeletedRecords ? (
                    <Card className="p-8 text-center">
                        <Trash2 className="mx-auto h-12 w-12 text-neutral-400 mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No Deleted Records</h3>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            There are no deleted records to display.
                        </p>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {Object.values(deletedRecords).map((group) => (
                            <Card key={group.type} className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <FileText className="h-5 w-5 text-neutral-500" />
                                        <div>
                                            <h3 className="text-lg font-semibold">{group.name}</h3>
                                            <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                                {group.count} deleted record{group.count !== 1 ? 's' : ''}
                                            </p>
                                        </div>
                                    </div>
                                    <Link href={`/recyclebin?type=${group.type}`}>
                                        <Button variant="outline" size="sm">
                                            View All
                                        </Button>
                                    </Link>
                                </div>

                                <div className="space-y-2">
                                    {group.records.slice(0, 5).map((record) => (
                                        <div
                                            key={record.id}
                                            className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg"
                                        >
                                            <div className="flex-1">
                                                <p className="font-medium">{record.display_name}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs text-neutral-600 dark:text-neutral-400">
                                                        Deleted {record.deleted_at_human || formatDistanceToNow(new Date(record.deleted_at), { addSuffix: true })}
                                                    </span>
                                                    {record.deleted_by && (
                                                        <>
                                                            <span className="text-xs text-neutral-400">•</span>
                                                            <span className="text-xs text-neutral-600 dark:text-neutral-400">
                                                                by {record.deleted_by.name}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => router.visit(`/recyclebin/${group.type}/${record.id}`)}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                    {group.records.length > 5 && (
                                        <p className="text-sm text-neutral-600 dark:text-neutral-400 text-center pt-2">
                                            and {group.records.length - 5} more...
                                        </p>
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

