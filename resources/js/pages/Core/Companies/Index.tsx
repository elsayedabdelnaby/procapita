import { DataTable } from '@/components/core/data-table';
import { CompanyDeleteDialog } from '@/components/core/company-delete-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { Company } from '@/types/core';
import { Head, Link, router } from '@inertiajs/react';
import { useState, useMemo } from 'react';
import { usePermissions } from '@/hooks/use-permissions';

interface CompaniesIndexProps {
    companies: Array<Company & { riding_companies_count?: number }>;
}

interface CompanyWithCount extends Company {
    riding_companies_count?: number;
}

export default function CompaniesIndex({ companies }: CompaniesIndexProps) {
    const { can } = usePermissions();
    const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; company: CompanyWithCount | null }>({
        open: false,
        company: null,
    });

    const handleDelete = (company: CompanyWithCount) => {
        setDeleteDialog({ open: true, company });
    };

    // Get available companies for transfer (exclude the company being deleted)
    const availableCompanies = useMemo(() => {
        return companies.filter((c) => c.id !== deleteDialog.company?.id);
    }, [companies, deleteDialog.company]);

    const handleToggleStatus = (id: number, isActive: boolean) => {
        const action = isActive ? 'deactivate' : 'activate';
        router.post(`/core/companies/${id}/${action}`);
    };

    return (
        <AppLayout>
            <Head title="Companies" />
            <div className="p-6">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Companies</h1>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            Manage all companies in the system
                        </p>
                    </div>
                    {/* Only show create button if user has create permission */}
                    {can('core', 'companies', 'create') && (
                    <Link href="/core/companies/create">
                        <Button>Create Company</Button>
                    </Link>
                    )}
                </div>

                <DataTable
                    data={companies}
                    columns={[
                        {
                            header: 'Name',
                            accessor: (row) => (
                                <Link
                                    href={`/core/companies/${row.id}`}
                                    className="font-medium hover:underline"
                                >
                                    {row.name}
                                </Link>
                            ),
                        },
                        {
                            header: 'Email',
                            accessor: 'email',
                        },
                        {
                            header: 'Status',
                            accessor: (row) => (
                                <Badge variant={row.is_active ? 'default' : 'secondary'}>
                                    {row.is_active ? 'Active' : 'Inactive'}
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
                            {/* Show view button if user has read permission */}
                            {can('core', 'companies', 'read') && (
                            <Link href={`/core/companies/${row.id}`}>
                                <Button variant="ghost" size="sm">
                                    View
                                </Button>
                            </Link>
                            )}
                            
                            {/* Show edit button if user has update permission */}
                            {can('core', 'companies', 'update') && (
                            <Link href={`/core/companies/${row.id}/edit`}>
                                <Button variant="ghost" size="sm">
                                    Edit
                                </Button>
                            </Link>
                            )}
                            
                            {/* Show activate/deactivate button if user has update permission */}
                            {can('core', 'companies', 'update') && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleStatus(row.id, row.is_active)}
                            >
                                {row.is_active ? 'Deactivate' : 'Activate'}
                            </Button>
                            )}
                            
                            {/* Show delete button if user has delete permission */}
                            {can('core', 'companies', 'delete') && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(row)}
                            >
                                Delete
                            </Button>
                            )}
                        </>
                    )}
                />

                <CompanyDeleteDialog
                    open={deleteDialog.open}
                    onOpenChange={(open) => setDeleteDialog({ open, company: null })}
                    company={deleteDialog.company}
                    availableCompanies={availableCompanies}
                    ridingCompaniesCount={deleteDialog.company?.riding_companies_count || 0}
                />
            </div>
        </AppLayout>
    );
}

