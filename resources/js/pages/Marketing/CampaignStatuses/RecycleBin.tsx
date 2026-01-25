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

interface CampaignStatus {
    id: number;
    name: string;
    slug: string;
    description?: string;
    color?: string;
    sort_order: number;
    active: boolean;
    company_id?: number;
    created_at: string;
    updated_at: string;
    deleted_at?: string;
}

interface CampaignStatusesRecycleBinProps {
    campaignStatuses: CampaignStatus[];
}

export default function CampaignStatusesRecycleBin({ campaignStatuses = [] }: CampaignStatusesRecycleBinProps) {
    const [selectedCampaignStatuses, setSelectedCampaignStatuses] = useState<Set<number>>(new Set());
    const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; status: CampaignStatus | null }>({
        open: false,
        status: null,
    });
    const [massDeleteDialog, setMassDeleteDialog] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [sortField, setSortField] = useState<string | null>('deleted_at');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [searchTerm, setSearchTerm] = useState('');

    // Filter and sort campaign statuses
    const filteredAndSortedCampaignStatuses = useMemo(() => {
        let filtered = campaignStatuses;

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
                let aValue: any = a[sortField as keyof CampaignStatus];
                let bValue: any = b[sortField as keyof CampaignStatus];

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
    }, [campaignStatuses, searchTerm, sortField, sortDirection]);

    // Pagination
    const paginatedCampaignStatuses = useMemo(() => {
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        return filteredAndSortedCampaignStatuses.slice(startIndex, endIndex);
    }, [filteredAndSortedCampaignStatuses, currentPage, pageSize]);

    const totalPages = useMemo(() => {
        return Math.ceil(filteredAndSortedCampaignStatuses.length / pageSize);
    }, [filteredAndSortedCampaignStatuses.length, pageSize]);

    // Select all checkbox
    const isAllSelected = useMemo(() => {
        if (paginatedCampaignStatuses.length === 0) return false;
        return paginatedCampaignStatuses.every((s) => selectedCampaignStatuses.has(s.id));
    }, [paginatedCampaignStatuses, selectedCampaignStatuses]);

    const isIndeterminate = useMemo(() => {
        return paginatedCampaignStatuses.some((s) => selectedCampaignStatuses.has(s.id)) && !isAllSelected;
    }, [paginatedCampaignStatuses, selectedCampaignStatuses, isAllSelected]);

    const handleSelectAll = (checked: boolean) => {
        const newSelected = new Set(selectedCampaignStatuses);
        if (checked) {
            paginatedCampaignStatuses.forEach((s) => newSelected.add(s.id));
        } else {
            paginatedCampaignStatuses.forEach((s) => newSelected.delete(s.id));
        }
        setSelectedCampaignStatuses(newSelected);
    };

    const handleSelectCampaignStatus = (statusId: number, checked: boolean) => {
        const newSelected = new Set(selectedCampaignStatuses);
        if (checked) {
            newSelected.add(statusId);
        } else {
            newSelected.delete(statusId);
        }
        setSelectedCampaignStatuses(newSelected);
    };

    const handleRestore = (status: CampaignStatus) => {
        router.post(`/recyclebin/campaign_statuses/${status.id}/restore`, {}, {
            preserveScroll: true,
            onSuccess: () => {
                router.reload({ only: ['campaignStatuses'] });
            },
        });
    };

    const handleRestoreMultiple = () => {
        if (selectedCampaignStatuses.size === 0) return;
        const ids = Array.from(selectedCampaignStatuses);
        router.post('/recyclebin/campaign_statuses/restore-multiple', { ids }, {
            preserveScroll: true,
            onSuccess: () => {
                setSelectedCampaignStatuses(new Set());
                router.reload({ only: ['campaignStatuses'] });
            },
        });
    };

    const handleDelete = (status: CampaignStatus) => {
        setDeleteDialog({ open: true, status });
    };

    const confirmDelete = () => {
        if (deleteDialog.status) {
            router.delete(`/recyclebin/campaign_statuses/${deleteDialog.status.id}`, {
                preserveScroll: true,
                onSuccess: () => {
                    setDeleteDialog({ open: false, status: null });
                    router.reload({ only: ['campaignStatuses'] });
                },
            });
        }
    };

    const handleMassDelete = () => {
        setMassDeleteDialog(true);
    };

    const confirmMassDelete = () => {
        if (selectedCampaignStatuses.size === 0) return;
        
        const ids = Array.from(selectedCampaignStatuses);
        let completed = 0;
        const total = ids.length;
        
        const deleteNext = () => {
            if (completed >= total) {
                setSelectedCampaignStatuses(new Set());
                setMassDeleteDialog(false);
                router.reload({ only: ['campaignStatuses'] });
                return;
            }
            
            const id = ids[completed];
            router.delete(`/recyclebin/campaign_statuses/${id}`, {
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
            <Head title="Deleted Campaign Statuses - Recycle Bin" />
            <div className="p-6">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Deleted Campaign Statuses</h1>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            Deleted records that can be restored
                        </p>
                    </div>
                    <Link href="/marketing/campaign-statuses">
                        <Button variant="outline">Back to Campaign Statuses</Button>
                    </Link>
                </div>

                <Card className="p-6">
                    {campaignStatuses.length > 0 ? (
                        <>
                            {/* Mass Actions Bar */}
                            {selectedCampaignStatuses.size > 0 && (
                                <div className="mb-4 p-3 bg-muted rounded-md flex items-center justify-between">
                                    <span className="text-sm font-medium">
                                        {selectedCampaignStatuses.size} campaign status(es) selected
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
                                    placeholder="Search campaign statuses..."
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
                                        {paginatedCampaignStatuses.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-4 py-8 text-center text-sm text-neutral-500">
                                                    No campaign statuses found
                                                </td>
                                            </tr>
                                        ) : (
                                            paginatedCampaignStatuses.map((status, index) => (
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
                                                            checked={selectedCampaignStatuses.has(status.id)}
                                                            onCheckedChange={(checked) =>
                                                                handleSelectCampaignStatus(status.id, checked as boolean)
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
                                        Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredAndSortedCampaignStatuses.length)} of {filteredAndSortedCampaignStatuses.length}
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
                            <p className="text-neutral-500">No deleted campaign statuses found.</p>
                        </div>
                    )}
                </Card>

                <DeleteDialog
                    open={deleteDialog.open}
                    onOpenChange={(open) => setDeleteDialog({ open, status: null })}
                    onConfirm={confirmDelete}
                    title="Permanently Delete Campaign Status"
                    description={`Are you sure you want to permanently delete "${deleteDialog.status?.name}"? This action cannot be undone.`}
                />

                <DeleteDialog
                    open={massDeleteDialog}
                    onOpenChange={setMassDeleteDialog}
                    onConfirm={confirmMassDelete}
                    title="Permanently Delete Selected Campaign Statuses"
                    description={`Are you sure you want to permanently delete ${selectedCampaignStatuses.size} campaign status(es)? This action cannot be undone.`}
                />
            </div>
        </AppLayout>
    );
}
