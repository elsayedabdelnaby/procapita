import { DataTable } from '@/components/core/data-table';
import { DeleteDialog } from '@/components/core/delete-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

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
}

interface RidingCompaniesIndexProps {
    ridingCompanies: RidingCompany[];
}

export default function RidingCompaniesIndex({ ridingCompanies }: RidingCompaniesIndexProps) {
    const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; company: RidingCompany | null }>({
        open: false,
        company: null,
    });

    const handleDelete = (company: RidingCompany) => {
        setDeleteDialog({ open: true, company });
    };

    const confirmDelete = () => {
        if (deleteDialog.company) {
            router.delete(`/ridingcarcompanies/riding-companies/${deleteDialog.company.id}`);
        }
    };

    const handleToggleStatus = (id: number) => {
        router.post(`/ridingcarcompanies/riding-companies/${id}/toggle-active`);
    };

    return (
        <AppLayout>
            <Head title="Riding Companies" />

            <div className="p-6">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Riding Companies</h1>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            Manage riding companies and their configurations
                        </p>
                    </div>
                    <Link href="/ridingcarcompanies/riding-companies/create">
                        <Button>Create Riding Company</Button>
                    </Link>
                </div>

                <Card className="p-6">
                    <style>{`
                        .riding-companies-table table th:nth-child(1),
                        .riding-companies-table table td:nth-child(1) {
                            min-width: 150px;
                        }
                        .riding-companies-table table th:nth-child(2),
                        .riding-companies-table table td:nth-child(2) {
                            min-width: 120px;
                        }
                    `}</style>
                    {ridingCompanies.length > 0 ? (
                        <div className="riding-companies-table">
                        <DataTable
                            data={ridingCompanies}
                            columns={[
                                {
                                    header: 'Name',
                                    accessor: (row) => (
                                        <div className="flex items-center gap-2 min-w-[150px]">
                                            {row.logo_url && (
                                                <img
                                                    src={row.logo_url}
                                                    alt={`${row.name} logo`}
                                                    className="h-8 max-w-[40px] w-auto object-contain flex-shrink-0"
                                                />
                                            )}
                                            <Link
                                                href={`/ridingcarcompanies/riding-companies/${row.id}`}
                                                className="font-medium hover:underline truncate min-w-0"
                                            >
                                                {row.name}
                                            </Link>
                                        </div>
                                    ),
                                    className: 'min-w-[150px]',
                                },
                                {
                                    header: 'Main Company',
                                    accessor: (row) => row.company?.name || '-',
                                    className: 'min-w-[120px]',
                                },
                                {
                                    header: 'Country',
                                    accessor: (row) => row.country || '-',
                                },
                                {
                                    header: 'City',
                                    accessor: (row) => row.city || '-',
                                },
                                {
                                    header: 'Contact Email',
                                    accessor: (row) => row.contact_email || '-',
                                },
                                {
                                    header: 'Contact Phone',
                                    accessor: (row) => row.contact_phone || '-',
                                },
                                {
                                    header: 'Status',
                                    accessor: (row) => (
                                        <Badge variant={row.active ? 'default' : 'secondary'}>
                                            {row.active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    ),
                                },
                                {
                                    header: 'Created',
                                    accessor: (row) => new Date(row.created_at).toLocaleDateString(),
                                },
                            ]}
                            actions={(row) => (
                                <>
                                    <Link href={`/ridingcarcompanies/riding-companies/${row.id}`}>
                                        <Button variant="ghost" size="sm">
                                            View
                                        </Button>
                                    </Link>
                                    <Link href={`/ridingcarcompanies/riding-companies/${row.id}/edit`}>
                                        <Button variant="ghost" size="sm">
                                            Edit
                                        </Button>
                                    </Link>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleToggleStatus(row.id)}
                                    >
                                        {row.active ? 'Deactivate' : 'Activate'}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDelete(row)}
                                    >
                                        Delete
                                    </Button>
                                </>
                            )}
                        />
                        </div>
                    ) : (
                        <div className="py-8 text-center text-neutral-500">
                            <p>No riding companies found.</p>
                            <Link href="/ridingcarcompanies/riding-companies/create">
                                <Button className="mt-4">Create First Riding Company</Button>
                            </Link>
                        </div>
                    )}
                </Card>

                <DeleteDialog
                    open={deleteDialog.open}
                    onOpenChange={(open) => setDeleteDialog({ open, company: null })}
                    onConfirm={confirmDelete}
                    title="Delete Riding Company"
                    description={`Are you sure you want to delete "${deleteDialog.company?.name}"? This action cannot be undone and will remove all associated data including stage templates, document requirements, and integrations.`}
                />
            </div>
        </AppLayout>
    );
}

