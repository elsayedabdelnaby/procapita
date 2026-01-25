import { DataTable } from '@/components/core/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { DeleteDialog } from '@/components/core/delete-dialog';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { RotateCcw, Trash2 } from 'lucide-react';
import { useState, useMemo } from 'react';
import { formatDate } from '@/utils/date-format';

interface LeadSource {
    id: number;
    name: string;
    slug: string;
    description?: string;
    active: boolean;
    created_at: string;
    updated_at: string;
    deleted_at?: string;
}

interface LeadSourcesRecycleBinProps {
    leadSources: LeadSource[];
    driversCounts?: Record<number, number>;
}

export default function LeadSourcesRecycleBin({ leadSources = [], driversCounts = {} }: LeadSourcesRecycleBinProps) {
    const [selectedLeadSources, setSelectedLeadSources] = useState<Set<number>>(new Set());
    const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; source: LeadSource | null }>({
        open: false,
        source: null,
    });
    const [massDeleteDialog, setMassDeleteDialog] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [sortField, setSortField] = useState<string | null>('deleted_at');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [searchTerm, setSearchTerm] = useState('');

    // Filter and sort lead sources
    const filteredAndSortedLeadSources = useMemo(() => {
        let filtered = leadSources;

        // Apply search filter
        if (searchTerm) {
            filtered = filtered.filter((source) =>
                source.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (source.slug && source.slug.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }

        // Apply sorting
        if (sortField) {
            filtered = [...filtered].sort((a, b) => {
                let aValue: any = a[sortField as keyof LeadSource];
                let bValue: any = b[sortField as keyof LeadSource];

                if (sortField === 'deleted_at' || sortField === 'created_at' || sortField === 'updated_at') {
                    aValue = aValue ? new Date(aValue).getTime() : 0;
                    bValue = bValue ? new Date(bValue).getTime() : 0;
                } else if (typeof aValue === 'string') {
                    aValue = aValue.toLowerCase();
                    bValue = (bValue || '').toLowerCase();
                }

                if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return filtered;
    }, [leadSources, searchTerm, sortField, sortDirection]);

    // Pagination
    const paginatedLeadSources = useMemo(() => {
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        return filteredAndSortedLeadSources.slice(startIndex, endIndex);
    }, [filteredAndSortedLeadSources, currentPage, pageSize]);

    const totalPages = useMemo(() => {
        return Math.ceil(filteredAndSortedLeadSources.length / pageSize);
    }, [filteredAndSortedLeadSources.length, pageSize]);

    // Select all checkbox
    const isAllSelected = useMemo(() => {
        if (paginatedLeadSources.length === 0) return false;
        return paginatedLeadSources.every((s) => selectedLeadSources.has(s.id));
    }, [paginatedLeadSources, selectedLeadSources]);

    const isIndeterminate = useMemo(() => {
        return paginatedLeadSources.some((s) => selectedLeadSources.has(s.id)) && !isAllSelected;
    }, [paginatedLeadSources, selectedLeadSources, isAllSelected]);

    const handleSelectAll = (checked: boolean) => {
        const newSelected = new Set(selectedLeadSources);
        if (checked) {
            paginatedLeadSources.forEach((s) => newSelected.add(s.id));
        } else {
            paginatedLeadSources.forEach((s) => newSelected.delete(s.id));
        }
        setSelectedLeadSources(newSelected);
    };

    const handleSelectLeadSource = (sourceId: number, checked: boolean) => {
        const newSelected = new Set(selectedLeadSources);
        if (checked) {
            newSelected.add(sourceId);
        } else {
            newSelected.delete(sourceId);
        }
        setSelectedLeadSources(newSelected);
    };

    const handleRestore = (source: LeadSource) => {
        router.post(`/recyclebin/lead_sources/${source.id}/restore`, {}, {
            preserveScroll: true,
            onSuccess: () => {
                router.reload({ only: ['leadSources'] });
            },
        });
    };

    const handleRestoreMultiple = () => {
        if (selectedLeadSources.size === 0) return;
        const ids = Array.from(selectedLeadSources);
        router.post('/recyclebin/lead_sources/restore-multiple', { ids }, {
            preserveScroll: true,
            onSuccess: () => {
                setSelectedLeadSources(new Set());
                router.reload({ only: ['leadSources'] });
            },
        });
    };

    const handleDelete = (source: LeadSource) => {
        setDeleteDialog({ open: true, source });
    };

    const confirmDelete = () => {
        if (deleteDialog.source) {
            router.delete(`/recyclebin/lead_sources/${deleteDialog.source.id}`, {
                preserveScroll: true,
                onSuccess: () => {
                    setDeleteDialog({ open: false, source: null });
                    router.reload({ only: ['leadSources'] });
                },
            });
        }
    };

    const handleMassDelete = () => {
        setMassDeleteDialog(true);
    };

    const confirmMassDelete = () => {
        if (selectedLeadSources.size === 0) return;
        
        const ids = Array.from(selectedLeadSources);
        let completed = 0;
        const total = ids.length;
        
        const deleteNext = () => {
            if (completed >= total) {
                setSelectedLeadSources(new Set());
                setMassDeleteDialog(false);
                router.reload({ only: ['leadSources'] });
                return;
            }
            
            const id = ids[completed];
            router.delete(`/recyclebin/lead_sources/${id}`, {
                preserveScroll: true,
                onSuccess: () => {
                    completed++;
                    deleteNext();
                },
                onError: () => {
                    completed++;
                    deleteNext();
                },
            });
        };
        
        deleteNext();
    };

    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    return (
        <AppLayout>
            <Head title="Deleted Lead Sources - Recycle Bin" />
            <div className="p-6">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Deleted Lead Sources</h1>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            Deleted records that can be restored
                        </p>
                    </div>
                    <Link href="/drivers/lead-sources">
                        <Button variant="outline">Back to Lead Sources</Button>
                    </Link>
                </div>

                <Card className="p-6">
                    {leadSources.length > 0 ? (
                        <>
                            {/* Mass Actions Bar */}
                            {selectedLeadSources.size > 0 && (
                                <div className="mb-4 p-3 bg-muted rounded-md flex items-center justify-between">
                                    <span className="text-sm font-medium">
                                        {selectedLeadSources.size} lead source(s) selected
                                    </span>
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            variant="default"
                                            size="sm"
                                            onClick={handleRestoreMultiple}
                                        >
                                            <RotateCcw className="h-4 w-4 mr-2" />
                                            Restore Selected
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            size="sm"
                                            onClick={handleMassDelete}
                                        >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Delete Selected
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Search */}
                            <div className="mb-4">
                                <input
                                    type="text"
                                    placeholder="Search lead sources..."
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                />
                            </div>

                            {/* Table */}
                            <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
                                <table className="w-full">
                                    <thead className="bg-neutral-100/60 dark:bg-neutral-800/60 backdrop-blur-sm">
                                        <tr>
                                            <th className="px-4 py-3 text-left">
                                                <Checkbox
                                                    checked={isAllSelected}
                                                    onCheckedChange={handleSelectAll}
                                                    ref={(el) => {
                                                        if (el) {
                                                            (el as any).indeterminate = isIndeterminate;
                                                        }
                                                    }}
                                                />
                                            </th>
                                            <th 
                                                className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300 cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-700"
                                                onClick={() => handleSort('name')}
                                            >
                                                Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                                            </th>
                                            <th 
                                                className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300 cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-700"
                                                onClick={() => handleSort('slug')}
                                            >
                                                Slug {sortField === 'slug' && (sortDirection === 'asc' ? '↑' : '↓')}
                                            </th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                Description
                                            </th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                Status
                                            </th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                Drivers
                                            </th>
                                            <th 
                                                className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300 cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-700"
                                                onClick={() => handleSort('deleted_at')}
                                            >
                                                Deleted At {sortField === 'deleted_at' && (sortDirection === 'asc' ? '↑' : '↓')}
                                            </th>
                                            <th className="px-4 py-3 text-right text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                                        {paginatedLeadSources.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} className="px-4 py-8 text-center text-sm text-neutral-500">
                                                    No lead sources found
                                                </td>
                                            </tr>
                                        ) : (
                                            paginatedLeadSources.map((source, index) => (
                                                <tr
                                                    key={source.id}
                                                    className={`
                                                        transition-colors duration-150
                                                        ${
                                                            index % 2 === 0
                                                                ? 'bg-white dark:bg-neutral-950 hover:bg-neutral-50 dark:hover:bg-neutral-900/50'
                                                                : 'bg-neutral-50/80 dark:bg-neutral-900/30 hover:bg-neutral-100 dark:hover:bg-neutral-900/60'
                                                        }
                                                    `}
                                                >
                                                    <td className="px-4 py-3">
                                                        <Checkbox
                                                            checked={selectedLeadSources.has(source.id)}
                                                            onCheckedChange={(checked) =>
                                                                handleSelectLeadSource(source.id, checked as boolean)
                                                            }
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 text-sm font-medium">
                                                        {source.name}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        <span className="font-mono text-xs">{source.slug}</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">{source.description || '-'}</td>
                                                    <td className="px-4 py-3 text-sm">
                                                        <Badge variant={source.active ? 'default' : 'secondary'}>
                                                            {source.active ? 'Active' : 'Inactive'}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        {driversCounts[source.id] || 0}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        {source.deleted_at ? formatDate(source.deleted_at) : '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleRestore(source)}
                                                            >
                                                                <RotateCcw className="h-4 w-4 mr-1" />
                                                                Restore
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleDelete(source)}
                                                            >
                                                                <Trash2 className="h-4 w-4 mr-1" />
                                                                Delete
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            <div className="mt-4 flex items-center justify-between border-t pt-4">
                                <div className="flex items-center gap-4">
                                    <div className="text-sm text-neutral-600 dark:text-neutral-400">
                                        Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredAndSortedLeadSources.length)} of {filteredAndSortedLeadSources.length}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-neutral-600 dark:text-neutral-400">Rows per page:</span>
                                        <select
                                            value={pageSize}
                                            onChange={(e) => {
                                                setPageSize(Number(e.target.value));
                                                setCurrentPage(1);
                                            }}
                                            className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                                        >
                                            <option value={10}>10</option>
                                            <option value={25}>25</option>
                                            <option value={50}>50</option>
                                            <option value={100}>100</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                    >
                                        Previous
                                    </Button>
                                    <div className="text-sm text-neutral-600 dark:text-neutral-400">
                                        Page {currentPage} of {totalPages || 1}
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                        disabled={currentPage >= totalPages}
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="py-12 text-center">
                            <p className="text-neutral-500">No deleted lead sources found.</p>
                        </div>
                    )}
                </Card>

                <DeleteDialog
                    open={deleteDialog.open}
                    onOpenChange={(open) => setDeleteDialog({ open, source: null })}
                    onConfirm={confirmDelete}
                    title="Permanently Delete Lead Source"
                    description={`Are you sure you want to permanently delete "${deleteDialog.source?.name}"? This action cannot be undone.`}
                />

                <DeleteDialog
                    open={massDeleteDialog}
                    onOpenChange={setMassDeleteDialog}
                    onConfirm={confirmMassDelete}
                    title="Permanently Delete Selected Lead Sources"
                    description={`Are you sure you want to permanently delete ${selectedLeadSources.size} lead source(s)? This action cannot be undone.`}
                />
            </div>
        </AppLayout>
    );
}
