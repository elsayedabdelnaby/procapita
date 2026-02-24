import { DataTable } from '@/components/core/data-table';
import { DeleteDialog } from '@/components/core/delete-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { useState, useEffect, useMemo } from 'react';
import { Search, Pencil, Eye, X } from 'lucide-react';

interface Reseller {
    id: number;
    name: string;
}

interface DriverDocument {
    id: number;
    name: string;
    resellers: Reseller[];
    type?: string;
    required?: boolean;
    active?: boolean;
    created_at: string;
}

interface DriverDocumentsIndexProps {
    driverDocuments: DriverDocument[];
}

export default function DriverDocumentsIndex({ driverDocuments }: DriverDocumentsIndexProps) {
    const [deleteDialog, setDeleteDialog] = useState<{
        open: boolean;
        document: DriverDocument | null;
    }>({
        open: false,
        document: null,
    });

    const [deleteAllDialog, setDeleteAllDialog] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedReseller, setSelectedReseller] = useState<string>('all');

    // Reload page when window gains focus to check for deleted drivers
    useEffect(() => {
        const handleFocus = () => {
            router.reload({ only: ['driverDocuments'], preserveState: true, preserveScroll: true });
        };

        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, []);

    const handleDelete = (document: DriverDocument) => {
        setDeleteDialog({ open: true, document });
    };

    const confirmDelete = () => {
        if (deleteDialog.document && deleteDialog.document.id) {
            // Delete the document name (which will cascade delete all related lead documents)
            router.delete(`/leads/lead-documents/${deleteDialog.document.id}`, {
                onSuccess: () => {
                    setDeleteDialog({ open: false, document: null });
                    router.reload({ only: ['driverDocuments'] });
                },
            });
        }
    };

    const handleDeleteAll = () => {
        setDeleteAllDialog(true);
    };

    const confirmDeleteAll = () => {
        router.delete('/leads/lead-documents', {
            onSuccess: () => {
                setDeleteAllDialog(false);
            },
        });
    };


    // Get unique resellers for filter
    const resellers = useMemo(() => {
        const map = new Map<number, string>();
        driverDocuments.forEach((doc) => {
            doc.resellers?.forEach((r) => {
                if (r.id && r.name) map.set(r.id, r.name);
            });
        });
        return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    }, [driverDocuments]);

    const filteredDocuments = useMemo(() => {
        let filtered = driverDocuments;
        if (selectedReseller !== 'all') {
            const companyId = parseInt(selectedReseller);
            filtered = filtered.filter((doc) => doc.resellers?.some((r) => r.id === companyId));
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            filtered = filtered.filter((doc) => {
                const name = doc.name?.toLowerCase() || '';
                const resellerNames = doc.resellers?.map((r) => r.name?.toLowerCase() || '').join(' ') || '';
                return name.includes(q) || resellerNames.includes(q);
            });
        }
        return filtered;
    }, [driverDocuments, searchQuery, selectedReseller]);

    return (
        <AppLayout>
            <Head title="Documents Required" />

            <div className="p-6">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Documents Required</h1>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            Manage required documents and approvals
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {driverDocuments.length > 0 && (
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={handleDeleteAll}
                            >
                                Delete All
                            </Button>
                        )}
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                window.location.href = '/leads/lead-documents/export';
                            }}
                        >
                            Export
                        </Button>
                        <Link href="/leads/lead-documents/create">
                            <Button>Create Document</Button>
                        </Link>
                    </div>
                </div>

                <Card className="p-6">
                    {driverDocuments.length > 0 ? (
                        <>
                            {/* Search and Filter */}
                            <div className="mb-4 flex flex-col sm:flex-row gap-4">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-500" />
                                    <Input
                                        type="text"
                                        placeholder="Search by Document Name, Reseller..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10 w-full"
                                    />
                                </div>
                                <div className="flex gap-2 items-center">
                                    <Select
                                        value={selectedReseller}
                                        onValueChange={setSelectedReseller}
                                    >
                                        <SelectTrigger className="w-[200px]">
                                            <SelectValue placeholder="All Resellers" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Resellers</SelectItem>
                                            {resellers.map((r) => (
                                                <SelectItem key={r.id} value={r.id.toString()}>
                                                    {r.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {(selectedReseller !== 'all' || searchQuery) && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setSelectedReseller('all');
                                                setSearchQuery('');
                                            }}
                                            className="gap-2"
                                        >
                                            <X className="h-4 w-4" />
                                            Clear
                                        </Button>
                                    )}
                                </div>
                            </div>
                            {(searchQuery || selectedReseller !== 'all') && (
                                <p className="mb-4 text-sm text-neutral-500">
                                    Showing {filteredDocuments.length} of {driverDocuments.length} document(s)
                                </p>
                            )}

                            <DataTable
                                data={filteredDocuments}
                            columns={[
                                {
                                    header: 'Document Name',
                                    accessor: (row) => (
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{row.name || '-'}</span>
                                        </div>
                                    ),
                                },
                                {
                                    header: 'Resellers',
                                    accessor: (row) => (
                                        <div className="flex flex-wrap gap-1">
                                            {row.resellers && row.resellers.length > 0 ? (
                                                row.resellers.map((r) => (
                                                    <Badge key={r.id} variant="outline" className="text-xs">
                                                        {r.name}
                                                    </Badge>
                                                ))
                                            ) : (
                                                <span className="text-sm text-neutral-500">-</span>
                                            )}
                                        </div>
                                    ),
                                },
                                {
                                    header: 'Status',
                                    accessor: (row) => (
                                        row.active === false ? (
                                            <Badge variant="secondary" className="text-xs">
                                                Inactive
                                            </Badge>
                                        ) : (
                                            <Badge variant="default" className="text-xs">
                                                Active
                                            </Badge>
                                        )
                                    ),
                                },
                                {
                                    header: 'Actions',
                                    accessor: (row) => (
                                        <div className="flex items-center gap-2">
                                            <Link href={`/leads/lead-documents/${row.id}/edit`}>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    title="Edit document"
                                                >
                                                    <Pencil className="h-4 w-4 mr-1" />
                                                    Edit
                                                </Button>
                                            </Link>
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => handleDelete(row)}
                                            >
                                                Delete
                                            </Button>
                                        </div>
                                    ),
                                },
                            ]}
                            />
                        </>
                    ) : (
                        <div className="py-12 text-center">
                            <p className="text-neutral-500">No documents found.</p>
                            <Link
                                href="/leads/lead-documents/create"
                                className="mt-4 inline-block"
                            >
                                <Button>Create First Document</Button>
                            </Link>
                        </div>
                    )}
                </Card>

                <DeleteDialog
                    open={deleteDialog.open}
                    onOpenChange={(open) => setDeleteDialog({ open, document: null })}
                    onConfirm={confirmDelete}
                    title="Delete Document"
                    description={
                        `Are you sure you want to delete the document "${deleteDialog.document?.name}"? This will delete this document name and all associated documents for all reseller companies. This action cannot be undone.`
                    }
                />

                <DeleteDialog
                    open={deleteAllDialog}
                    onOpenChange={(open) => setDeleteAllDialog(open)}
                    onConfirm={confirmDeleteAll}
                    title="Delete All Documents"
                    description={`Are you sure you want to delete all ${driverDocuments.length} document(s)? This action cannot be undone and will also delete all associated files.`}
                />
            </div>
        </AppLayout>
    );
}

