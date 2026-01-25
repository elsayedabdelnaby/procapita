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

interface CampaignChannel {
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

interface CampaignChannelsRecycleBinProps {
    campaignChannels: CampaignChannel[];
}

export default function CampaignChannelsRecycleBin({ campaignChannels = [] }: CampaignChannelsRecycleBinProps) {
    const [selectedCampaignChannels, setSelectedCampaignChannels] = useState<Set<number>>(new Set());
    const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; channel: CampaignChannel | null }>({
        open: false,
        channel: null,
    });
    const [massDeleteDialog, setMassDeleteDialog] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [sortField, setSortField] = useState<string | null>('deleted_at');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [searchTerm, setSearchTerm] = useState('');

    // Filter and sort campaign channels
    const filteredAndSortedCampaignChannels = useMemo(() => {
        let filtered = campaignChannels;

        // Apply search filter
        if (searchTerm) {
            filtered = filtered.filter((channel) =>
                channel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (channel.slug && channel.slug.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }

        // Apply sorting
        if (sortField) {
            filtered = [...filtered].sort((a, b) => {
                let aValue: any = a[sortField as keyof CampaignChannel];
                let bValue: any = b[sortField as keyof CampaignChannel];

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
    }, [campaignChannels, searchTerm, sortField, sortDirection]);

    // Pagination
    const paginatedCampaignChannels = useMemo(() => {
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        return filteredAndSortedCampaignChannels.slice(startIndex, endIndex);
    }, [filteredAndSortedCampaignChannels, currentPage, pageSize]);

    const totalPages = useMemo(() => {
        return Math.ceil(filteredAndSortedCampaignChannels.length / pageSize);
    }, [filteredAndSortedCampaignChannels.length, pageSize]);

    // Select all checkbox
    const isAllSelected = useMemo(() => {
        if (paginatedCampaignChannels.length === 0) return false;
        return paginatedCampaignChannels.every((c) => selectedCampaignChannels.has(c.id));
    }, [paginatedCampaignChannels, selectedCampaignChannels]);

    const isIndeterminate = useMemo(() => {
        return paginatedCampaignChannels.some((c) => selectedCampaignChannels.has(c.id)) && !isAllSelected;
    }, [paginatedCampaignChannels, selectedCampaignChannels, isAllSelected]);

    const handleSelectAll = (checked: boolean) => {
        const newSelected = new Set(selectedCampaignChannels);
        if (checked) {
            paginatedCampaignChannels.forEach((c) => newSelected.add(c.id));
        } else {
            paginatedCampaignChannels.forEach((c) => newSelected.delete(c.id));
        }
        setSelectedCampaignChannels(newSelected);
    };

    const handleSelectCampaignChannel = (channelId: number, checked: boolean) => {
        const newSelected = new Set(selectedCampaignChannels);
        if (checked) {
            newSelected.add(channelId);
        } else {
            newSelected.delete(channelId);
        }
        setSelectedCampaignChannels(newSelected);
    };

    const handleRestore = (channel: CampaignChannel) => {
        router.post(`/recyclebin/campaign_channels/${channel.id}/restore`, {}, {
            preserveScroll: true,
            onSuccess: () => {
                router.reload({ only: ['campaignChannels'] });
            },
        });
    };

    const handleRestoreMultiple = () => {
        if (selectedCampaignChannels.size === 0) return;
        const ids = Array.from(selectedCampaignChannels);
        router.post('/recyclebin/campaign_channels/restore-multiple', { ids }, {
            preserveScroll: true,
            onSuccess: () => {
                setSelectedCampaignChannels(new Set());
                router.reload({ only: ['campaignChannels'] });
            },
        });
    };

    const handleDelete = (channel: CampaignChannel) => {
        setDeleteDialog({ open: true, channel });
    };

    const confirmDelete = () => {
        if (deleteDialog.channel) {
            router.delete(`/recyclebin/campaign_channels/${deleteDialog.channel.id}`, {
                preserveScroll: true,
                onSuccess: () => {
                    setDeleteDialog({ open: false, channel: null });
                    router.reload({ only: ['campaignChannels'] });
                },
            });
        }
    };

    const handleMassDelete = () => {
        setMassDeleteDialog(true);
    };

    const confirmMassDelete = () => {
        if (selectedCampaignChannels.size === 0) return;
        
        const ids = Array.from(selectedCampaignChannels);
        let completed = 0;
        const total = ids.length;
        
        const deleteNext = () => {
            if (completed >= total) {
                setSelectedCampaignChannels(new Set());
                setMassDeleteDialog(false);
                router.reload({ only: ['campaignChannels'] });
                return;
            }
            
            const id = ids[completed];
            router.delete(`/recyclebin/campaign_channels/${id}`, {
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
            <Head title="Deleted Campaign Channels - Recycle Bin" />
            <div className="p-6">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Deleted Campaign Channels</h1>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            Deleted records that can be restored
                        </p>
                    </div>
                    <Link href="/marketing/campaign-channels">
                        <Button variant="outline">Back to Campaign Channels</Button>
                    </Link>
                </div>

                <Card className="p-6">
                    {campaignChannels.length > 0 ? (
                        <>
                            {/* Mass Actions Bar */}
                            {selectedCampaignChannels.size > 0 && (
                                <div className="mb-4 p-3 bg-muted rounded-md flex items-center justify-between">
                                    <span className="text-sm font-medium">
                                        {selectedCampaignChannels.size} campaign channel(s) selected
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
                                    placeholder="Search campaign channels..."
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
                                        {paginatedCampaignChannels.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-4 py-8 text-center text-sm text-neutral-500">
                                                    No campaign channels found
                                                </td>
                                            </tr>
                                        ) : (
                                            paginatedCampaignChannels.map((channel, index) => (
                                                <tr
                                                    key={channel.id}
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
                                                            checked={selectedCampaignChannels.has(channel.id)}
                                                            onCheckedChange={(checked) =>
                                                                handleSelectCampaignChannel(channel.id, checked as boolean)
                                                            }
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 text-sm font-medium">
                                                        {channel.name}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        <span className="font-mono text-xs">{channel.slug}</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        {channel.color ? (
                                                            <Badge 
                                                                style={{ 
                                                                    backgroundColor: channel.color,
                                                                    color: '#fff',
                                                                    borderColor: channel.color
                                                                }}
                                                            >
                                                                {channel.color}
                                                            </Badge>
                                                        ) : '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        <Badge variant={channel.active ? 'default' : 'secondary'}>
                                                            {channel.active ? 'Active' : 'Inactive'}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        {channel.deleted_at ? formatDate(channel.deleted_at) : '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleRestore(channel)}
                                                            >
                                                                <RotateCcw className="h-4 w-4 mr-1" />
                                                                Restore
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleDelete(channel)}
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
                                        Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredAndSortedCampaignChannels.length)} of {filteredAndSortedCampaignChannels.length}
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
                            <p className="text-neutral-500">No deleted campaign channels found.</p>
                        </div>
                    )}
                </Card>

                <DeleteDialog
                    open={deleteDialog.open}
                    onOpenChange={(open) => setDeleteDialog({ open, channel: null })}
                    onConfirm={confirmDelete}
                    title="Permanently Delete Campaign Channel"
                    description={`Are you sure you want to permanently delete "${deleteDialog.channel?.name}"? This action cannot be undone.`}
                />

                <DeleteDialog
                    open={massDeleteDialog}
                    onOpenChange={setMassDeleteDialog}
                    onConfirm={confirmMassDelete}
                    title="Permanently Delete Selected Campaign Channels"
                    description={`Are you sure you want to permanently delete ${selectedCampaignChannels.size} campaign channel(s)? This action cannot be undone.`}
                />
            </div>
        </AppLayout>
    );
}
