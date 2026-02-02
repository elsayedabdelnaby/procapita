import { ActivityLog } from '@/components/core/activity-log';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { Activity, Edit, Trash2, ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { DeleteDialog } from '@/components/core/delete-dialog';
import { usePermissions } from '@/hooks/use-permissions';
import { formatDate } from '@/utils/date-format';

interface LeadStage {
    id: number;
    name: string;
    slug: string;
    description?: string;
    color?: string;
    order: number;
    active: boolean;
    requires_all_documents_approved: boolean;
    created_at: string;
    updated_at: string;
}

interface LeadStagesShowProps {
    leadStage: LeadStage;
    activities?: Array<{
        id: number;
        description: string;
        event?: string;
        properties?: {
            old?: Record<string, any>;
            attributes?: Record<string, any>;
        };
        causer?: {
            id: number;
            name: string;
            email?: string;
        } | null;
        created_at: string;
    }>;
}

export default function LeadStagesShow({ leadStage, activities = [] }: LeadStagesShowProps) {
    const { can } = usePermissions();
    const [activeTab, setActiveTab] = useState<'overview' | 'updates'>('overview');
    const [deleteDialog, setDeleteDialog] = useState<{ open: boolean }>({ open: false });

    const handleDelete = () => {
        setDeleteDialog({ open: true });
    };

    const confirmDelete = () => {
        router.delete(`/drivers/lead-stages/${leadStage.id}`);
    };

    if (!leadStage) {
        return (
            <AppLayout>
                <Head title="Lead Stage Not Found" />
                <div className="p-6">
                    <div className="text-center py-12">
                        <p className="text-neutral-500">Lead stage not found.</p>
                        <Link href="/drivers/lead-stages" className="mt-4 inline-block">
                            <Button variant="outline">Back to List</Button>
                        </Link>
                    </div>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <Head title={leadStage.name} />

            <div className="p-6">
                <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/drivers/lead-stages">
                            <Button variant="outline" size="sm">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to List
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold">{leadStage.name}</h1>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                Lead Stage Details
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {can('drivers', 'leadstages', 'update') && (
                            <Link href={`/drivers/lead-stages/${leadStage.id}/edit`}>
                                <Button variant="outline" size="sm">
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                </Button>
                            </Link>
                        )}
                        {can('drivers', 'leadstages', 'delete') && (
                            <Button variant="destructive" size="sm" onClick={handleDelete}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                            </Button>
                        )}
                    </div>
                </div>

                <div className="mb-4 flex gap-2 border-b">
                    <button
                        type="button"
                        onClick={() => setActiveTab('overview')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                            activeTab === 'overview'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
                        }`}
                    >
                        Overview
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('updates')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                            activeTab === 'updates'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
                        }`}
                    >
                        Updates ({activities.length})
                    </button>
                </div>

                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        <Card className="p-6">
                            <h2 className="mb-4 text-lg font-semibold">Basic Information</h2>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <p className="text-sm text-neutral-500">Name</p>
                                    <p className="font-medium">{leadStage.name}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-neutral-500">Slug</p>
                                    <p className="font-mono text-xs">{leadStage.slug}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-neutral-500">Trip</p>
                                    <p className="font-medium">{leadStage.order}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-neutral-500">Color</p>
                                    {leadStage.color ? (
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="h-6 w-6 rounded-full border"
                                                style={{ backgroundColor: leadStage.color }}
                                            />
                                            <span className="text-sm">{leadStage.color}</span>
                                        </div>
                                    ) : (
                                        <p className="text-neutral-400">-</p>
                                    )}
                                </div>
                                <div>
                                    <p className="text-sm text-neutral-500">Status</p>
                                    <Badge variant={leadStage.active ? 'default' : 'secondary'}>
                                        {leadStage.active ? 'Active' : 'Inactive'}
                                    </Badge>
                                </div>
                                <div>
                                    <p className="text-sm text-neutral-500">Requires All Documents Approved</p>
                                    <Badge variant={leadStage.requires_all_documents_approved ? 'default' : 'secondary'}>
                                        {leadStage.requires_all_documents_approved ? 'Yes' : 'No'}
                                    </Badge>
                                </div>
                                {leadStage.description && (
                                    <div className="md:col-span-2">
                                        <p className="text-sm text-neutral-500">Description</p>
                                        <p className="mt-1">{leadStage.description}</p>
                                    </div>
                                )}
                            </div>
                        </Card>

                        <Card className="p-6">
                            <h2 className="mb-4 text-lg font-semibold">Timestamps</h2>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <p className="text-sm text-neutral-500">Created At</p>
                                    <p className="font-medium">
                                        {formatDate(leadStage.created_at)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-neutral-500">Updated At</p>
                                    <p className="font-medium">
                                        {formatDate(leadStage.updated_at)}
                                    </p>
                                </div>
                            </div>
                        </Card>
                    </div>
                )}

                {activeTab === 'updates' && (
                    <Card className="p-6">
                        <h2 className="mb-4 text-lg font-semibold">Activity Log</h2>
                        <ActivityLog activities={activities} />
                    </Card>
                )}

                <DeleteDialog
                    open={deleteDialog.open}
                    onOpenChange={(open) => setDeleteDialog({ open })}
                    onConfirm={confirmDelete}
                    title="Delete Lead Stage"
                    description={`Are you sure you want to delete "${leadStage.name}"? This action cannot be undone.`}
                />
            </div>
        </AppLayout>
    );
}

