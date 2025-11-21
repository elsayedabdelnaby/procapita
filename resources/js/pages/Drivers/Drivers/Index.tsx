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
    name: string;
}

interface Campaign {
    id: number;
    name: string;
}

interface LeadSource {
    id: number;
    name: string;
}

interface LeadStatus {
    id: number;
    name: string;
    color?: string;
}

interface User {
    id: number;
    name: string;
}

interface Driver {
    id: number;
    uuid: string;
    company_id?: number;
    full_name: string;
    phone: string;
    whatsapp_phone?: string;
    email?: string;
    riding_company?: RidingCompany;
    campaign?: Campaign;
    lead_source?: LeadSource;
    assigned_to?: User;
    lead_status?: LeadStatus;
    created_at: string;
    updated_at: string;
}

interface DriversIndexProps {
    drivers: Driver[];
}

export default function DriversIndex({ drivers }: DriversIndexProps) {
    const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; driver: Driver | null }>({
        open: false,
        driver: null,
    });

    const handleDelete = (driver: Driver) => {
        setDeleteDialog({ open: true, driver });
    };

    const confirmDelete = () => {
        if (deleteDialog.driver) {
            router.delete(`/drivers/drivers/${deleteDialog.driver.id}`);
        }
    };

    return (
        <AppLayout>
            <Head title="Drivers" />

            <div className="p-6">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Drivers</h1>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            Manage drivers and their onboarding process
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Link href="/drivers/drivers/export">
                            <Button type="button" variant="outline">
                                Export
                            </Button>
                        </Link>
                        <Link href="/drivers/drivers/import">
                            <Button type="button" variant="outline">
                                Import
                            </Button>
                        </Link>
                        <Link href="/drivers/drivers/create">
                            <Button>Create Driver</Button>
                        </Link>
                    </div>
                </div>

                <Card className="p-6">
                    {drivers.length > 0 ? (
                        <DataTable
                            data={drivers}
                            columns={[
                                {
                                    header: 'Name',
                                    accessor: (row) => (
                                        <Link
                                            href={`/drivers/drivers/${row.id}`}
                                            className="font-medium hover:underline"
                                        >
                                            {row.full_name}
                                        </Link>
                                    ),
                                },
                                {
                                    header: 'Phone',
                                    accessor: (row) => row.phone,
                                },
                                {
                                    header: 'WhatsApp',
                                    accessor: (row) => row.whatsapp_phone || '-',
                                },
                                {
                                    header: 'Email',
                                    accessor: (row) => row.email || '-',
                                },
                                {
                                    header: 'Riding Company',
                                    accessor: (row) => row.riding_company?.name || '-',
                                },
                                {
                                    header: 'Campaign',
                                    accessor: (row) => row.campaign?.name || '-',
                                },
                                {
                                    header: 'Lead Source',
                                    accessor: (row) => row.lead_source?.name || '-',
                                },
                                {
                                    header: 'Lead Status',
                                    accessor: (row) =>
                                        row.lead_status ? (
                                            <Badge
                                                variant="outline"
                                                style={{
                                                    borderColor: row.lead_status.color || 'gray',
                                                    color: row.lead_status.color || 'gray',
                                                }}
                                            >
                                                {row.lead_status.name}
                                            </Badge>
                                        ) : (
                                            '-'
                                        ),
                                },
                                {
                                    header: 'Assigned To',
                                    accessor: (row) => row.assigned_to?.name || '-',
                                },
                                {
                                    header: 'Actions',
                                    accessor: (row) => (
                                        <div className="flex items-center gap-2">
                                            <Link href={`/drivers/drivers/${row.id}/edit`}>
                                                <Button type="button" variant="outline" size="sm">
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
                    ) : (
                        <div className="py-12 text-center">
                            <p className="text-neutral-500">No drivers found.</p>
                            <Link href="/drivers/drivers/create" className="mt-4 inline-block">
                                <Button>Create First Driver</Button>
                            </Link>
                        </div>
                    )}
                </Card>

                <DeleteDialog
                    open={deleteDialog.open}
                    onOpenChange={(open) => setDeleteDialog({ open, driver: null })}
                    onConfirm={confirmDelete}
                    title="Delete Driver"
                    description={`Are you sure you want to delete ${deleteDialog.driver?.full_name}? This action cannot be undone.`}
                />
            </div>
        </AppLayout>
    );
}

