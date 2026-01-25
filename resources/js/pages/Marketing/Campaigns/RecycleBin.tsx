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

interface Campaign {
    id: number;
    name: string;
    slug: string;
    description?: string;
    company_id?: number;
    campaign_type_id?: number;
    campaign_status_id?: number;
    campaign_channel_id?: number;
    start_date?: string;
    end_date?: string;
    expected_budget?: number;
    expected_roi?: number;
    expected_leads?: number;
    expected_conversions?: number;
    expected_revenue?: number;
    type?: { id: number; name: string };
    status?: { id: number; name: string };
    channel?: { id: number; name: string };
    created_at: string;
    updated_at: string;
    deleted_at?: string;
}

interface CampaignsRecycleBinProps {
    campaigns: Campaign[];
}

export default function CampaignsRecycleBin({ campaigns = [] }: CampaignsRecycleBinProps) {
    const [selectedCampaigns, setSelectedCampaigns] = useState<Set<number>>(new Set());
    const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; campaign: Campaign | null }>({
        open: false,
        campaign: null,
    });
    const [massDeleteDialog, setMassDeleteDialog] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [sortField, setSortField] = useState<string | null>('deleted_at');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [searchTerm, setSearchTerm] = useState('');

    // Filter and sort campaigns
    const filteredAndSortedCampaigns = useMemo(() => {
        let filtered = campaigns;

        // Apply search filter
        if (searchTerm) {
            filtered = filtered.filter((campaign) =>
                campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (campaign.slug && campaign.slug.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }

        // Apply sorting
        if (sortField) {
            filtered = [...filtered].sort((a, b) => {
                let aValue: any = a[sortField as keyof Campaign];
                let bValue: any = b[sortField as keyof Campaign];

                if (sortField === 'deleted_at' || sortField === 'created_at' || sortField === 'updated_at' || sortField === 'start_date' || sortField === 'end_date') {
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
    }, [campaigns, searchTerm, sortField, sortDirection]);

    // Pagination
    const paginatedCampaigns = useMemo(() => {
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        return filteredAndSortedCampaigns.slice(startIndex, endIndex);
    }, [filteredAndSortedCampaigns, currentPage, pageSize]);

    const totalPages = useMemo(() => {
        return Math.ceil(filteredAndSortedCampaigns.length / pageSize);
    }, [filteredAndSortedCampaigns.length, pageSize]);

    // Select all checkbox
    const isAllSelected = useMemo(() => {
        if (paginatedCampaigns.length === 0) return false;
        return paginatedCampaigns.every((c) => selectedCampaigns.has(c.id));
    }, [paginatedCampaigns, selectedCampaigns]);

    const isIndeterminate = useMemo(() => {
        return paginatedCampaigns.some((c) => selectedCampaigns.has(c.id)) && !isAllSelected;
    }, [paginatedCampaigns, selectedCampaigns, isAllSelected]);

    const handleSelectAll = (checked: boolean) => {
        const newSelected = new Set(selectedCampaigns);
        if (checked) {
            paginatedCampaigns.forEach((c) => newSelected.add(c.id));
        } else {
            paginatedCampaigns.forEach((c) => newSelected.delete(c.id));
        }
        setSelectedCampaigns(newSelected);
    };

    const handleSelectCampaign = (campaignId: number, checked: boolean) => {
        const newSelected = new Set(selectedCampaigns);
        if (checked) {
            newSelected.add(campaignId);
        } else {
            newSelected.delete(campaignId);
        }
        setSelectedCampaigns(newSelected);
    };

    const handleRestore = (campaign: Campaign) => {
        router.post(`/recyclebin/campaigns/${campaign.id}/restore`, {}, {
            preserveScroll: true,
            onSuccess: () => {
                router.reload({ only: ['campaigns'] });
            },
        });
    };

    const handleRestoreMultiple = () => {
        if (selectedCampaigns.size === 0) return;
        const ids = Array.from(selectedCampaigns);
        router.post('/recyclebin/campaigns/restore-multiple', { ids }, {
            preserveScroll: true,
            onSuccess: () => {
                setSelectedCampaigns(new Set());
                router.reload({ only: ['campaigns'] });
            },
        });
    };

    const handleDelete = (campaign: Campaign) => {
        setDeleteDialog({ open: true, campaign });
    };

    const confirmDelete = () => {
        if (deleteDialog.campaign) {
            router.delete(`/recyclebin/campaigns/${deleteDialog.campaign.id}`, {
                preserveScroll: true,
                onSuccess: () => {
                    setDeleteDialog({ open: false, campaign: null });
                    router.reload({ only: ['campaigns'] });
                },
            });
        }
    };

    const handleMassDelete = () => {
        setMassDeleteDialog(true);
    };

    const confirmMassDelete = () => {
        if (selectedCampaigns.size === 0) return;
        
        const ids = Array.from(selectedCampaigns);
        let completed = 0;
        const total = ids.length;
        
        const deleteNext = () => {
            if (completed >= total) {
                setSelectedCampaigns(new Set());
                setMassDeleteDialog(false);
                router.reload({ only: ['campaigns'] });
                return;
            }
            
            const id = ids[completed];
            router.delete(`/recyclebin/campaigns/${id}`, {
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
            <Head title="Deleted Campaigns - Recycle Bin" />
            <div className="p-6">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Deleted Campaigns</h1>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            Deleted records that can be restored
                        </p>
                    </div>
                    <Link href="/marketing/campaigns">
                        <Button variant="outline">Back to Campaigns</Button>
                    </Link>
                </div>

                <Card className="p-6">
                    {campaigns.length > 0 ? (
                        <>
                            {/* Mass Actions Bar */}
                            {selectedCampaigns.size > 0 && (
                                <div className="mb-4 p-3 bg-muted rounded-md flex items-center justify-between">
                                    <span className="text-sm font-medium">
                                        {selectedCampaigns.size} campaign(s) selected
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
                                    placeholder="Search campaigns..."
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
                                            <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                Type
                                            </th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                Status
                                            </th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                Channel
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
                                        {paginatedCampaigns.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-4 py-8 text-center text-sm text-neutral-500">
                                                    No campaigns found
                                                </td>
                                            </tr>
                                        ) : (
                                            paginatedCampaigns.map((campaign, index) => (
                                                <tr
                                                    key={campaign.id}
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
                                                            checked={selectedCampaigns.has(campaign.id)}
                                                            onCheckedChange={(checked) =>
                                                                handleSelectCampaign(campaign.id, checked as boolean)
                                                            }
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 text-sm font-medium">
                                                        {campaign.name}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        {campaign.type?.name || '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        {campaign.status?.name || '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        {campaign.channel?.name || '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        {campaign.deleted_at ? formatDate(campaign.deleted_at) : '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleRestore(campaign)}
                                                            >
                                                                <RotateCcw className="h-4 w-4 mr-1" />
                                                                Restore
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleDelete(campaign)}
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
                                        Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredAndSortedCampaigns.length)} of {filteredAndSortedCampaigns.length}
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
                            <p className="text-neutral-500">No deleted campaigns found.</p>
                        </div>
                    )}
                </Card>

                <DeleteDialog
                    open={deleteDialog.open}
                    onOpenChange={(open) => setDeleteDialog({ open, campaign: null })}
                    onConfirm={confirmDelete}
                    title="Permanently Delete Campaign"
                    description={`Are you sure you want to permanently delete "${deleteDialog.campaign?.name}"? This action cannot be undone.`}
                />

                <DeleteDialog
                    open={massDeleteDialog}
                    onOpenChange={setMassDeleteDialog}
                    onConfirm={confirmMassDelete}
                    title="Permanently Delete Selected Campaigns"
                    description={`Are you sure you want to permanently delete ${selectedCampaigns.size} campaign(s)? This action cannot be undone.`}
                />
            </div>
        </AppLayout>
    );
}
