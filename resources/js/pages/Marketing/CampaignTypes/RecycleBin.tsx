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

interface CampaignType {
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

interface CampaignTypesRecycleBinProps {
    campaignTypes: CampaignType[];
}

export default function CampaignTypesRecycleBin({ campaignTypes = [] }: CampaignTypesRecycleBinProps) {
    const [selectedCampaignTypes, setSelectedCampaignTypes] = useState<Set<number>>(new Set());
    const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; type: CampaignType | null }>({
        open: false,
        type: null,
    });
    const [massDeleteDialog, setMassDeleteDialog] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [sortField, setSortField] = useState<string | null>('deleted_at');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [searchTerm, setSearchTerm] = useState('');

    // Filter and sort campaign types
    const filteredAndSortedCampaignTypes = useMemo(() => {
        let filtered = campaignTypes;

        // Apply search filter
        if (searchTerm) {
            filtered = filtered.filter((type) =>
                type.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (type.slug && type.slug.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }

        // Apply sorting
        if (sortField) {
            filtered = [...filtered].sort((a, b) => {
                let aValue: any = a[sortField as keyof CampaignType];
                let bValue: any = b[sortField as keyof CampaignType];

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
    }, [campaignTypes, searchTerm, sortField, sortDirection]);

    // Pagination
    const paginatedCampaignTypes = useMemo(() => {
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        return filteredAndSortedCampaignTypes.slice(startIndex, endIndex);
    }, [filteredAndSortedCampaignTypes, currentPage, pageSize]);

    const totalPages = useMemo(() => {
        return Math.ceil(filteredAndSortedCampaignTypes.length / pageSize);
    }, [filteredAndSortedCampaignTypes.length, pageSize]);

    // Select all checkbox
    const isAllSelected = useMemo(() => {
        if (paginatedCampaignTypes.length === 0) return false;
        return paginatedCampaignTypes.every((t) => selectedCampaignTypes.has(t.id));
    }, [paginatedCampaignTypes, selectedCampaignTypes]);

    const isIndeterminate = useMemo(() => {
        return paginatedCampaignTypes.some((t) => selectedCampaignTypes.has(t.id)) && !isAllSelected;
    }, [paginatedCampaignTypes, selectedCampaignTypes, isAllSelected]);

    const handleSelectAll = (checked: boolean) => {
        const newSelected = new Set(selectedCampaignTypes);
        if (checked) {
            paginatedCampaignTypes.forEach((t) => newSelected.add(t.id));
        } else {
            paginatedCampaignTypes.forEach((t) => newSelected.delete(t.id));
        }
        setSelectedCampaignTypes(newSelected);
    };

    const handleSelectCampaignType = (typeId: number, checked: boolean) => {
        const newSelected = new Set(selectedCampaignTypes);
        if (checked) {
            newSelected.add(typeId);
        } else {
            newSelected.delete(typeId);
        }
        setSelectedCampaignTypes(newSelected);
    };

    const handleRestore = (type: CampaignType) => {
        router.post(`/recyclebin/campaign_types/${type.id}/restore`, {}, {
            preserveScroll: true,
            onSuccess: () => {
                router.reload({ only: ['campaignTypes'] });
            },
        });
    };

    const handleRestoreMultiple = () => {
        if (selectedCampaignTypes.size === 0) return;
        const ids = Array.from(selectedCampaignTypes);
        router.post('/recyclebin/campaign_types/restore-multiple', { ids }, {
            preserveScroll: true,
            onSuccess: () => {
                setSelectedCampaignTypes(new Set());
                router.reload({ only: ['campaignTypes'] });
            },
        });
    };

    const handleDelete = (type: CampaignType) => {
        setDeleteDialog({ open: true, type });
    };

    const confirmDelete = () => {
        if (deleteDialog.type) {
            router.delete(`/recyclebin/campaign_types/${deleteDialog.type.id}`, {
                preserveScroll: true,
                onSuccess: () => {
                    setDeleteDialog({ open: false, type: null });
                    router.reload({ only: ['campaignTypes'] });
                },
            });
        }
    };

    const handleMassDelete = () => {
        setMassDeleteDialog(true);
    };

    const confirmMassDelete = () => {
        if (selectedCampaignTypes.size === 0) return;
        
        const ids = Array.from(selectedCampaignTypes);
        let completed = 0;
        const total = ids.length;
        
        const deleteNext = () => {
            if (completed >= total) {
                setSelectedCampaignTypes(new Set());
                setMassDeleteDialog(false);
                router.reload({ only: ['campaignTypes'] });
                return;
            }
            
            const id = ids[completed];
            router.delete(`/recyclebin/campaign_types/${id}`, {
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
            <Head title="Deleted Campaign Types - Recycle Bin" />
            <div className="p-6">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Deleted Campaign Types</h1>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            Deleted records that can be restored
                        </p>
                    </div>
                    <Link href="/marketing/campaign-types">
                        <Button variant="outline">Back to Campaign Types</Button>
                    </Link>
                </div>

                <Card className="p-6">
                    {campaignTypes.length > 0 ? (
                        <>
                            {/* Mass Actions Bar */}
                            {selectedCampaignTypes.size > 0 && (
                                <div className="mb-4 p-3 bg-muted rounded-md flex items-center justify-between">
                                    <span className="text-sm font-medium">
                                        {selectedCampaignTypes.size} campaign type(s) selected
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
                                    placeholder="Search campaign types..."
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
                                        {paginatedCampaignTypes.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-4 py-8 text-center text-sm text-neutral-500">
                                                    No campaign types found
                                                </td>
                                            </tr>
                                        ) : (
                                            paginatedCampaignTypes.map((type, index) => (
                                                <tr
                                                    key={type.id}
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
                                                            checked={selectedCampaignTypes.has(type.id)}
                                                            onCheckedChange={(checked) =>
                                                                handleSelectCampaignType(type.id, checked as boolean)
                                                            }
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 text-sm font-medium">
                                                        {type.name}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        <span className="font-mono text-xs">{type.slug}</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        {type.color ? (
                                                            <Badge 
                                                                style={{ 
                                                                    backgroundColor: type.color,
                                                                    color: '#fff',
                                                                    borderColor: type.color
                                                                }}
                                                            >
                                                                {type.color}
                                                            </Badge>
                                                        ) : '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        <Badge variant={type.active ? 'default' : 'secondary'}>
                                                            {type.active ? 'Active' : 'Inactive'}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        {type.deleted_at ? formatDate(type.deleted_at) : '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleRestore(type)}
                                                            >
                                                                <RotateCcw className="h-4 w-4 mr-1" />
                                                                Restore
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleDelete(type)}
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
                                        Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredAndSortedCampaignTypes.length)} of {filteredAndSortedCampaignTypes.length}
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
                            <p className="text-neutral-500">No deleted campaign types found.</p>
                        </div>
                    )}
                </Card>

                <DeleteDialog
                    open={deleteDialog.open}
                    onOpenChange={(open) => setDeleteDialog({ open, type: null })}
                    onConfirm={confirmDelete}
                    title="Permanently Delete Campaign Type"
                    description={`Are you sure you want to permanently delete "${deleteDialog.type?.name}"? This action cannot be undone.`}
                />

                <DeleteDialog
                    open={massDeleteDialog}
                    onOpenChange={setMassDeleteDialog}
                    onConfirm={confirmMassDelete}
                    title="Permanently Delete Selected Campaign Types"
                    description={`Are you sure you want to permanently delete ${selectedCampaignTypes.size} campaign type(s)? This action cannot be undone.`}
                />
            </div>
        </AppLayout>
    );
}
