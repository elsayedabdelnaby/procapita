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

interface Company {
    id: number;
    name: string;
}

interface RidingCompany {
    id: number;
    uuid: string;
    company_id?: number;
    company?: Company;
    name: string;
    slug: string;
    description?: string;
    country?: string;
    city?: string;
    logo_path?: string;
    logo_url?: string;
    contact_email?: string;
    contact_phone?: string;
    active: boolean;
    created_at: string;
    updated_at: string;
    deleted_at?: string;
}

interface RidingCompaniesRecycleBinProps {
    ridingCompanies: RidingCompany[];
    usersCounts?: Record<number, number>;
}

export default function RidingCompaniesRecycleBin({ ridingCompanies = [], usersCounts = {} }: RidingCompaniesRecycleBinProps) {
    const [selectedRidingCompanies, setSelectedRidingCompanies] = useState<Set<number>>(new Set());
    const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; company: RidingCompany | null }>({
        open: false,
        company: null,
    });
    const [massDeleteDialog, setMassDeleteDialog] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [sortField, setSortField] = useState<string | null>('deleted_at');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [searchTerm, setSearchTerm] = useState('');

    // Filter and sort riding companies
    const filteredAndSortedRidingCompanies = useMemo(() => {
        let filtered = ridingCompanies;

        // Apply search filter
        if (searchTerm) {
            filtered = filtered.filter((company) =>
                company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (company.slug && company.slug.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (company.city && company.city.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }

        // Apply sorting
        if (sortField) {
            filtered = [...filtered].sort((a, b) => {
                let aValue: any = a[sortField as keyof RidingCompany];
                let bValue: any = b[sortField as keyof RidingCompany];

                if (sortField === 'deleted_at' || sortField === 'created_at' || sortField === 'updated_at') {
                    aValue = aValue ? new Date(aValue).getTime() : 0;
                    bValue = bValue ? new Date(bValue).getTime() : 0;
                } else if (sortField === 'company' && a.company && b.company) {
                    aValue = a.company.name.toLowerCase();
                    bValue = b.company.name.toLowerCase();
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
    }, [ridingCompanies, searchTerm, sortField, sortDirection]);

    // Pagination
    const paginatedRidingCompanies = useMemo(() => {
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        return filteredAndSortedRidingCompanies.slice(startIndex, endIndex);
    }, [filteredAndSortedRidingCompanies, currentPage, pageSize]);

    const totalPages = useMemo(() => {
        return Math.ceil(filteredAndSortedRidingCompanies.length / pageSize);
    }, [filteredAndSortedRidingCompanies.length, pageSize]);

    // Select all checkbox
    const isAllSelected = useMemo(() => {
        if (paginatedRidingCompanies.length === 0) return false;
        return paginatedRidingCompanies.every((c) => selectedRidingCompanies.has(c.id));
    }, [paginatedRidingCompanies, selectedRidingCompanies]);

    const isIndeterminate = useMemo(() => {
        return paginatedRidingCompanies.some((c) => selectedRidingCompanies.has(c.id)) && !isAllSelected;
    }, [paginatedRidingCompanies, selectedRidingCompanies, isAllSelected]);

    const handleSelectAll = (checked: boolean) => {
        const newSelected = new Set(selectedRidingCompanies);
        if (checked) {
            paginatedRidingCompanies.forEach((c) => newSelected.add(c.id));
        } else {
            paginatedRidingCompanies.forEach((c) => newSelected.delete(c.id));
        }
        setSelectedRidingCompanies(newSelected);
    };

    const handleSelectRidingCompany = (companyId: number, checked: boolean) => {
        const newSelected = new Set(selectedRidingCompanies);
        if (checked) {
            newSelected.add(companyId);
        } else {
            newSelected.delete(companyId);
        }
        setSelectedRidingCompanies(newSelected);
    };

    const handleRestore = (company: RidingCompany) => {
        router.post(`/recyclebin/riding_companies/${company.id}/restore`, {}, {
            preserveScroll: true,
            onSuccess: () => {
                router.reload({ only: ['ridingCompanies'] });
            },
        });
    };

    const handleRestoreMultiple = () => {
        if (selectedRidingCompanies.size === 0) return;
        const ids = Array.from(selectedRidingCompanies);
        router.post('/recyclebin/riding_companies/restore-multiple', { ids }, {
            preserveScroll: true,
            onSuccess: () => {
                setSelectedRidingCompanies(new Set());
                router.reload({ only: ['ridingCompanies'] });
            },
        });
    };

    const handleDelete = (company: RidingCompany) => {
        setDeleteDialog({ open: true, company });
    };

    const confirmDelete = () => {
        if (deleteDialog.company) {
            router.delete(`/recyclebin/riding_companies/${deleteDialog.company.id}`, {
                preserveScroll: true,
                onSuccess: () => {
                    setDeleteDialog({ open: false, company: null });
                    router.reload({ only: ['ridingCompanies'] });
                },
            });
        }
    };

    const handleMassDelete = () => {
        setMassDeleteDialog(true);
    };

    const confirmMassDelete = () => {
        if (selectedRidingCompanies.size === 0) return;
        
        const ids = Array.from(selectedRidingCompanies);
        let completed = 0;
        const total = ids.length;
        
        const deleteNext = () => {
            if (completed >= total) {
                setSelectedRidingCompanies(new Set());
                setMassDeleteDialog(false);
                router.reload({ only: ['ridingCompanies'] });
                return;
            }
            
            const id = ids[completed];
            router.delete(`/recyclebin/riding_companies/${id}`, {
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
            <Head title="Deleted ReSellers - Recycle Bin" />
            <div className="p-6">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Deleted ReSellers</h1>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            Deleted records that can be restored
                        </p>
                    </div>
                    <Link href="/ridingcarcompanies/riding-companies">
                        <Button variant="outline">Back to ReSellers</Button>
                    </Link>
                </div>

                <Card className="p-6">
                    {ridingCompanies.length > 0 ? (
                        <>
                            {/* Mass Actions Bar */}
                            {selectedRidingCompanies.size > 0 && (
                                <div className="mb-4 p-3 bg-muted rounded-md flex items-center justify-between">
                                    <span className="text-sm font-medium">
                                        {selectedRidingCompanies.size} reseller company(ies) selected
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
                                    placeholder="Search reseller companies..."
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
                                                Company
                                            </th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                City
                                            </th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                Status
                                            </th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                Users
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
                                        {paginatedRidingCompanies.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} className="px-4 py-8 text-center text-sm text-neutral-500">
                                                    No reseller companies found
                                                </td>
                                            </tr>
                                        ) : (
                                            paginatedRidingCompanies.map((company, index) => (
                                                <tr
                                                    key={company.id}
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
                                                            checked={selectedRidingCompanies.has(company.id)}
                                                            onCheckedChange={(checked) =>
                                                                handleSelectRidingCompany(company.id, checked as boolean)
                                                            }
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 text-sm font-medium">
                                                        {company.name}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        {company.company?.name || '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">{company.city || '-'}</td>
                                                    <td className="px-4 py-3 text-sm">
                                                        <Badge variant={company.active ? 'default' : 'secondary'}>
                                                            {company.active ? 'Active' : 'Inactive'}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        {usersCounts[company.id] || 0}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        {company.deleted_at ? formatDate(company.deleted_at) : '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleRestore(company)}
                                                            >
                                                                <RotateCcw className="h-4 w-4 mr-1" />
                                                                Restore
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleDelete(company)}
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
                                        Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredAndSortedRidingCompanies.length)} of {filteredAndSortedRidingCompanies.length}
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
                            <p className="text-neutral-500">No deleted reseller companies found.</p>
                        </div>
                    )}
                </Card>

                <DeleteDialog
                    open={deleteDialog.open}
                    onOpenChange={(open) => setDeleteDialog({ open, company: null })}
                    onConfirm={confirmDelete}
                    title="Permanently Delete ReSeller"
                    description={`Are you sure you want to permanently delete "${deleteDialog.company?.name}"? This action cannot be undone.`}
                />

                <DeleteDialog
                    open={massDeleteDialog}
                    onOpenChange={setMassDeleteDialog}
                    onConfirm={confirmMassDelete}
                    title="Permanently Delete Selected Reseller Companies"
                    description={`Are you sure you want to permanently delete ${selectedRidingCompanies.size} reseller company(ies)? This action cannot be undone.`}
                />
            </div>
        </AppLayout>
    );
}
