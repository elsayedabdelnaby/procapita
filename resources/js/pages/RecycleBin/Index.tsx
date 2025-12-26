import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { DeleteDialog } from '@/components/core/delete-dialog';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { Trash2, RotateCcw, Eye, ArrowLeft, Trash, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useState, useMemo } from 'react';

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
    const [selectedRecords, setSelectedRecords] = useState<Set<number>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [searchTerm, setSearchTerm] = useState('');

    // Filter records by search term
    const filteredRecords = useMemo(() => {
        if (!searchTerm) return records;
        return records.filter((record) =>
            record.display_name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [records, searchTerm]);

    // Pagination
    const totalRecords = filteredRecords.length;
    const totalPages = Math.ceil(totalRecords / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginatedRecords = filteredRecords.slice(startIndex, endIndex);

    // Select all checkbox
    const allSelected = paginatedRecords.length > 0 && paginatedRecords.every((r) => selectedRecords.has(r.id));
    const someSelected = paginatedRecords.some((r) => selectedRecords.has(r.id)) && !allSelected;

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            const newSelected = new Set(selectedRecords);
            paginatedRecords.forEach((record) => newSelected.add(record.id));
            setSelectedRecords(newSelected);
        } else {
            const newSelected = new Set(selectedRecords);
            paginatedRecords.forEach((record) => newSelected.delete(record.id));
            setSelectedRecords(newSelected);
        }
    };

    const handleSelectRecord = (recordId: number, checked: boolean) => {
        const newSelected = new Set(selectedRecords);
        if (checked) {
            newSelected.add(recordId);
        } else {
            newSelected.delete(recordId);
        }
        setSelectedRecords(newSelected);
    };

    const handleRestore = (record: DeletedRecord) => {
        setRestoringId(record.id);
        router.post(
            `/recyclebin/${modelType}/${record.id}/restore`,
            {},
            {
                onFinish: () => setRestoringId(null),
                onSuccess: () => {
                    setSelectedRecords((prev) => {
                        const newSet = new Set(prev);
                        newSet.delete(record.id);
                        return newSet;
                    });
                    router.reload({ only: ['records'] });
                },
            }
        );
    };

    const handleMassRestore = () => {
        if (selectedRecords.size === 0) return;

        const ids = Array.from(selectedRecords);
        router.post(
            `/recyclebin/${modelType}/restore-multiple`,
            { ids },
            {
                onSuccess: () => {
                    setSelectedRecords(new Set());
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
                setSelectedRecords((prev) => {
                    const newSet = new Set(prev);
                    newSet.delete(selectedRecord.id);
                    return newSet;
                });
                router.reload({ only: ['records'] });
            },
        });
    };

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
                    {selectedRecords.size > 0 && (
                        <Button onClick={handleMassRestore} variant="default">
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Restore Selected ({selectedRecords.size})
                        </Button>
                    )}
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
                        <div className="p-4">
                            {/* Search */}
                            <div className="mb-4">
                                <input
                                    type="text"
                                    placeholder={`Search ${modelName.toLowerCase()}...`}
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                />
                            </div>

                            {/* Table */}
                            <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800 shadow-sm">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border-b-2 border-blue-200 dark:border-blue-800/50">
                                            <th className="px-4 py-4 text-left">
                                                <Checkbox
                                                    checked={allSelected}
                                                    onCheckedChange={handleSelectAll}
                                                    ref={(el) => {
                                                        if (el) {
                                                            (el as any).indeterminate = someSelected;
                                                        }
                                                    }}
                                                />
                                            </th>
                                            <th className="px-4 py-4 text-left text-sm font-semibold text-blue-900 dark:text-blue-100 uppercase tracking-wide">
                                                Name
                                            </th>
                                            <th className="px-4 py-4 text-left text-sm font-semibold text-blue-900 dark:text-blue-100 uppercase tracking-wide">
                                                Deleted At
                                            </th>
                                            <th className="px-4 py-4 text-left text-sm font-semibold text-blue-900 dark:text-blue-100 uppercase tracking-wide">
                                                Deleted By
                                            </th>
                                            <th className="px-4 py-4 text-right text-sm font-semibold text-blue-900 dark:text-blue-100 uppercase tracking-wide">
                                                Restore
                                            </th>
                                            <th className="px-4 py-4 text-right text-sm font-semibold text-blue-900 dark:text-blue-100 uppercase tracking-wide">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
                                        {paginatedRecords.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-4 py-8 text-center text-sm text-neutral-500 dark:text-neutral-400 bg-white dark:bg-neutral-950">
                                                    No records found
                                                </td>
                                            </tr>
                                        ) : (
                                            paginatedRecords.map((record, index) => {
                                                const isRestoring = restoringId === record.id;
                                                const isSelected = selectedRecords.has(record.id);

                                                return (
                                                    <tr
                                                        key={record.id}
                                                        className={`
                                                            transition-all duration-200 ease-in-out
                                                            ${
                                                                index % 2 === 0
                                                                    ? 'bg-white dark:bg-neutral-950 hover:bg-blue-50/30 dark:hover:bg-blue-950/20'
                                                                    : 'bg-neutral-50/60 dark:bg-neutral-900/40 hover:bg-blue-50/40 dark:hover:bg-blue-950/30'
                                                            }
                                                        `}
                                                    >
                                                        <td className="px-4 py-3">
                                                            <Checkbox
                                                                checked={isSelected}
                                                                onCheckedChange={(checked) =>
                                                                    handleSelectRecord(record.id, checked as boolean)
                                                                }
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300">{record.display_name}</td>
                                                        <td className="px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300">
                                                            <div className="flex flex-col">
                                                                <span>
                                                                    {record.deleted_at_human ||
                                                                        formatDistanceToNow(new Date(record.deleted_at), {
                                                                            addSuffix: true,
                                                                        })}
                                                                </span>
                                                                <span className="text-xs text-neutral-600 dark:text-neutral-400">
                                                                    {new Date(record.deleted_at).toLocaleString()}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300">
                                                            {record.deleted_by ? (
                                                                record.deleted_by.name
                                                            ) : (
                                                                <span className="text-neutral-500 dark:text-neutral-400">Unknown</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleRestore(record)}
                                                                disabled={isRestoring}
                                                            >
                                                                <RotateCcw
                                                                    className={`h-4 w-4 ${isRestoring ? 'animate-spin' : ''}`}
                                                                />
                                                                <span className="ml-2">Restore</span>
                                                            </Button>
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() =>
                                                                        router.visit(`/recyclebin/${modelType}/${record.id}`)
                                                                    }
                                                                >
                                                                    <Eye className="h-4 w-4" />
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
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            <div className="mt-4 flex items-center justify-between border-t pt-4">
                                <div className="flex items-center gap-4">
                                    <div className="text-sm text-neutral-600 dark:text-neutral-400">
                                        Showing {startIndex + 1} to {Math.min(endIndex, totalRecords)} of {totalRecords}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-neutral-600 dark:text-neutral-400">Rows per page:</span>
                                        <select
                                            value={rowsPerPage}
                                            onChange={(e) => {
                                                setRowsPerPage(Number(e.target.value));
                                                setCurrentPage(1);
                                            }}
                                            className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                                        >
                                            <option value={5}>5</option>
                                            <option value={10}>10</option>
                                            <option value={25}>25</option>
                                            <option value={50}>50</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="text-sm text-neutral-600 dark:text-neutral-400">
                                        Page {currentPage} of {totalPages || 1} Total: {totalRecords}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                            Previous
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                            disabled={currentPage >= totalPages}
                                        >
                                            Next
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
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
