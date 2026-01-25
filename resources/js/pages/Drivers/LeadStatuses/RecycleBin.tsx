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

interface LeadStatus {
    id: number;
    name: string;
    slug: string;
    description?: string;
    color?: string;
    order: number;
    active: boolean;
    created_at: string;
    updated_at: string;
    deleted_at?: string;
}

interface LeadStatusesRecycleBinProps {
    leadStatuses: LeadStatus[];
    driversCounts?: Record<number, number>;
}

export default function LeadStatusesRecycleBin({ leadStatuses = [], driversCounts = {} }: LeadStatusesRecycleBinProps) {
    const [selectedLeadStatuses, setSelectedLeadStatuses] = useState<Set<number>>(new Set());
    const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; status: LeadStatus | null }>({
        open: false,
        status: null,
    });
    const [massDeleteDialog, setMassDeleteDialog] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [sortField, setSortField] = useState<string | null>('deleted_at');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [searchTerm, setSearchTerm] = useState('');

    // Filter and sort lead statuses
    const filteredAndSortedLeadStatuses = useMemo(() => {
        let filtered = leadStatuses;

        // Apply search filter
        if (searchTerm) {
            filtered = filtered.filter((status) =>
                status.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (status.slug && status.slug.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }

        // Apply sorting
        if (sortField) {
            filtered = [...filtered].sort((a, b) => {
                let aValue: any = a[sortField as keyof LeadStatus];
                let bValue: any = b[sortField as keyof LeadStatus];

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
    }, [leadStatuses, searchTerm, sortField, sortDirection]);

    // Pagination
    const paginatedLeadStatuses = useMemo(() => {
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        return filteredAndSortedLeadStatuses.slice(startIndex, endIndex);
    }, [filteredAndSortedLeadStatuses, currentPage, pageSize]);

    const totalPages = useMemo(() => {
        return Math.ceil(filteredAndSortedLeadStatuses.length / pageSize);
    }, [filteredAndSortedLeadStatuses.length, pageSize]);

    // Select all checkbox
    const isAllSelected = useMemo(() => {
        if (paginatedLeadStatuses.length === 0) return false;
        return paginatedLeadStatuses.every((s) => selectedLeadStatuses.has(s.id));
    }, [paginatedLeadStatuses, selectedLeadStatuses]);

    const isIndeterminate = useMemo(() => {
        return paginatedLeadStatuses.some((s) => selectedLeadStatuses.has(s.id)) && !isAllSelected;
    }, [paginatedLeadStatuses, selectedLeadStatuses, isAllSelected]);

    const handleSelectAll = (checked: boolean) => {
        const newSelected = new Set(selectedLeadStatuses);
        if (checked) {
            paginatedLeadStatuses.forEach((s) => newSelected.add(s.id));
        } else {
            paginatedLeadStatuses.forEach((s) => newSelected.delete(s.id));
        }
        setSelectedLeadStatuses(newSelected);
    };

    const handleSelectLeadStatus = (statusId: number, checked: boolean) => {
        const newSelected = new Set(selectedLeadStatuses);
        if (checked) {
            newSelected.add(statusId);
        } else {
            newSelected.delete(statusId);
        }
        setSelectedLeadStatuses(newSelected);
    };

    const handleRestore = (status: LeadStatus) => {
        router.post(`/recyclebin/lead_statuses/${status.id}/restore`, {}, {
            preserveScroll: true,
            onSuccess: () => {
                router.reload({ only: ['leadStatuses'] });
            },
        });
    };

    const handleRestoreMultiple = () => {
        if (selectedLeadStatuses.size === 0) return;
        const ids = Array.from(selectedLeadStatuses);
        router.post('/recyclebin/lead_statuses/restore-multiple', { ids }, {
            preserveScroll: true,
            onSuccess: () => {
                setSelectedLeadStatuses(new Set());
                router.reload({ only: ['leadStatuses'] });
            },
        });
    };

    const handleDelete = (status: LeadStatus) => {
        setDeleteDialog({ open: true, status });
    };

    const confirmDelete = () => {
        if (deleteDialog.status) {
            router.delete(`/recyclebin/lead_statuses/${deleteDialog.status.id}`, {
                preserveScroll: true,
                onSuccess: () => {
                    setDeleteDialog({ open: false, status: null });
                    router.reload({ only: ['leadStatuses'] });
                },
            });
        }
    };

    const handleMassDelete = () => {
        setMassDeleteDialog(true);
    };

    const confirmMassDelete = () => {
        if (selectedLeadStatuses.size === 0) return;
        
        const ids = Array.from(selectedLeadStatuses);
        let completed = 0;
        const total = ids.length;
        
        const deleteNext = () => {
            if (completed >= total) {
                setSelectedLeadStatuses(new Set());
                setMassDeleteDialog(false);
                router.reload({ only: ['leadStatuses'] });
                return;
            }
            
            const id = ids[completed];
            router.delete(`/recyclebin/lead_statuses/${id}`, {
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
            <Head title="Deleted Lead Statuses - Recycle Bin" />
            <div className="p-6">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Deleted Lead Statuses</h1>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            Deleted records that can be restored
                        </p>
                    </div>
                    <Link href="/drivers/lead-statuses">
                        <Button variant="outline">Back to Lead Statuses</Button>
                    </Link>
                </div>

                <Card className="p-6">
                    {leadStatuses.length > 0 ? (
                        <>
                            {/* Mass Actions Bar */}
                            {selectedLeadStatuses.size > 0 && (
                                <div className="mb-4 p-3 bg-muted rounded-md flex items-center justify-between">
                                    <span className="text-sm font-medium">
                                        {selectedLeadStatuses.size} lead status(es) selected
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
                                    placeholder="Search lead statuses..."
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
                                                Color
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
                                        {paginatedLeadStatuses.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} className="px-4 py-8 text-center text-sm text-neutral-500">
                                                    No lead statuses found
                                                </td>
                                            </tr>
                                        ) : (
                                            paginatedLeadStatuses.map((status, index) => (
                                                <tr
                                                    key={status.id}
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
                                                            checked={selectedLeadStatuses.has(status.id)}
                                                            onCheckedChange={(checked) =>
                                                                handleSelectLeadStatus(status.id, checked as boolean)
                                                            }
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 text-sm font-medium">
                                                        {status.name}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        <span className="font-mono text-xs">{status.slug}</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        {status.color ? (
                                                            <Badge 
                                                                style={{ 
                                                                    backgroundColor: status.color,
                                                                    color: '#fff',
                                                                    borderColor: status.color
                                                                }}
                                                            >
                                                                {status.color}
                                                            </Badge>
                                                        ) : '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        <Badge variant={status.active ? 'default' : 'secondary'}>
                                                            {status.active ? 'Active' : 'Inactive'}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        {driversCounts[status.id] || 0}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        {status.deleted_at ? formatDate(status.deleted_at) : '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleRestore(status)}
                                                            >
                                                                <RotateCcw className="h-4 w-4 mr-1" />
                                                                Restore
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleDelete(status)}
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
                                        Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredAndSortedLeadStatuses.length)} of {filteredAndSortedLeadStatuses.length}
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
                            <p className="text-neutral-500">No deleted lead statuses found.</p>
                        </div>
                    )}
                </Card>

                <DeleteDialog
                    open={deleteDialog.open}
                    onOpenChange={(open) => setDeleteDialog({ open, status: null })}
                    onConfirm={confirmDelete}
                    title="Permanently Delete Lead Status"
                    description={`Are you sure you want to permanently delete "${deleteDialog.status?.name}"? This action cannot be undone.`}
                />

                <DeleteDialog
                    open={massDeleteDialog}
                    onOpenChange={setMassDeleteDialog}
                    onConfirm={confirmMassDelete}
                    title="Permanently Delete Selected Lead Statuses"
                    description={`Are you sure you want to permanently delete ${selectedLeadStatuses.size} lead status(es)? This action cannot be undone.`}
                />
            </div>
        </AppLayout>
    );
}
