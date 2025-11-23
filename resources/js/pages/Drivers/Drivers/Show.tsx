import { ActivityLog } from '@/components/core/activity-log';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { Activity, CheckCircle2, Clock, FileText, Mail, Phone, User, XCircle } from 'lucide-react';
import { useState } from 'react';

interface Driver {
    id: number;
    uuid: string;
    full_name: string;
    phone: string;
    whatsapp_phone?: string;
    email?: string;
    riding_company?: { id: number; name: string };
    campaign?: { id: number; name: string };
    lead_source?: { id: number; name: string };
    assigned_to?: { id: number; name: string };
    lead_status?: { id: number; name: string; color?: string };
    current_stage?: { id: number; name: string };
    notes?: string;
    stages_progress?: {
        total: number;
        completed: number;
        pending: number;
        in_progress: number;
        rejected: number;
        percentage: number;
    };
    stages_status?: Array<{
        stage_template: { id: number; name: string; order: number };
        driver_stage?: { id: number; status: string; completed_at?: string };
        status: string;
        is_completed: boolean;
        completed_at?: string;
    }>;
    next_stage?: { id: number; name: string; order: number };
    has_completed_all_stages: boolean;
    stages?: Array<{
        id: number;
        stage_template?: { id: number; name: string };
        status: string;
        completed_at?: string;
    }>;
    documents?: Array<{
        id: number;
        document_template?: { id: number; name: string; type: string };
        status: string;
        uploaded_path?: string;
    }>;
    created_at: string;
    updated_at: string;
}

interface DriversShowProps {
    driver: Driver;
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

export default function DriversShow({ driver, activities = [] }: DriversShowProps) {
    const [activeTab, setActiveTab] = useState<'overview' | 'updates'>('overview');

    const handleDelete = () => {
        if (confirm(`Are you sure you want to delete "${driver.full_name}"?`)) {
            router.delete(`/drivers/drivers/${driver.id}`);
        }
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
            completed: 'default',
            pending: 'secondary',
            in_progress: 'outline',
            rejected: 'destructive',
            approved: 'default',
        };

        return (
            <Badge variant={variants[status] || 'secondary'}>
                {status.replace('_', ' ').toUpperCase()}
            </Badge>
        );
    };

    return (
        <AppLayout>
            <Head title={driver.full_name} />

            <div className="p-6">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">{driver.full_name}</h1>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            Driver Details & Onboarding Progress
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Link href="/drivers/drivers">
                            <Button variant="outline">Back to List</Button>
                        </Link>
                        <Link href={`/drivers/drivers/${driver.id}/edit`}>
                            <Button variant="outline">Edit</Button>
                        </Link>
                        <Button variant="destructive" onClick={handleDelete}>
                            Delete
                        </Button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="mb-6 border-b">
                    <nav className="flex gap-6">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                                activeTab === 'overview'
                                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                                    : 'border-transparent text-neutral-600 hover:border-neutral-300 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
                            }`}
                        >
                            Overview
                        </button>
                        <button
                            onClick={() => setActiveTab('updates')}
                            className={`border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                                activeTab === 'updates'
                                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                                    : 'border-transparent text-neutral-600 hover:border-neutral-300 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <Activity className="h-4 w-4" />
                                Updates ({activities.length})
                            </div>
                        </button>
                    </nav>
                </div>

                {/* Tab Content */}
                {activeTab === 'overview' && (
                    <>
                <div className="grid gap-6 md:grid-cols-2">
                    <Card className="p-6">
                        <h2 className="mb-4 text-lg font-semibold">Personal Information</h2>
                        <div className="space-y-4">
                            <div className="flex items-start gap-2">
                                <User className="mt-0.5 h-4 w-4 text-neutral-500" />
                                <div className="flex-1">
                                    <p className="text-sm text-neutral-500">Full Name</p>
                                    <p className="font-medium">{driver.full_name}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2">
                                <Phone className="mt-0.5 h-4 w-4 text-neutral-500" />
                                <div className="flex-1">
                                    <p className="text-sm text-neutral-500">Phone</p>
                                    <p className="font-medium">{driver.phone}</p>
                                </div>
                            </div>
                            {driver.whatsapp_phone && (
                                <div className="flex items-start gap-2">
                                    <Phone className="mt-0.5 h-4 w-4 text-neutral-500" />
                                    <div className="flex-1">
                                        <p className="text-sm text-neutral-500">WhatsApp</p>
                                        <p className="font-medium">{driver.whatsapp_phone}</p>
                                    </div>
                                </div>
                            )}
                            {driver.email && (
                                <div className="flex items-start gap-2">
                                    <Mail className="mt-0.5 h-4 w-4 text-neutral-500" />
                                    <div className="flex-1">
                                        <p className="text-sm text-neutral-500">Email</p>
                                        <p className="font-medium">{driver.email}</p>
                                    </div>
                                </div>
                            )}
                            <div>
                                <p className="text-sm text-neutral-500">UUID</p>
                                <p className="font-mono text-xs">{driver.uuid}</p>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <h2 className="mb-4 text-lg font-semibold">CRM Information</h2>
                        <div className="space-y-4">
                            {driver.riding_company && (
                                <div>
                                    <p className="text-sm text-neutral-500">Riding Company</p>
                                    <p className="font-medium">{driver.riding_company.name}</p>
                                </div>
                            )}
                            {driver.campaign && (
                                <div>
                                    <p className="text-sm text-neutral-500">Campaign</p>
                                    <p className="font-medium">{driver.campaign.name}</p>
                                </div>
                            )}
                            {driver.lead_source && (
                                <div>
                                    <p className="text-sm text-neutral-500">Lead Source</p>
                                    <p className="font-medium">{driver.lead_source.name}</p>
                                </div>
                            )}
                            {driver.lead_status && (
                                <div>
                                    <p className="text-sm text-neutral-500">Lead Status</p>
                                    <Badge
                                        variant="outline"
                                        style={{
                                            borderColor: driver.lead_status.color || 'gray',
                                            color: driver.lead_status.color || 'gray',
                                        }}
                                    >
                                        {driver.lead_status.name}
                                    </Badge>
                                </div>
                            )}
                            {driver.assigned_to && (
                                <div>
                                    <p className="text-sm text-neutral-500">Assigned To</p>
                                    <p className="font-medium">{driver.assigned_to.name}</p>
                                </div>
                            )}
                            {driver.current_stage && (
                                <div>
                                    <p className="text-sm text-neutral-500">Current Stage</p>
                                    <p className="font-medium">{driver.current_stage.name}</p>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                {driver.stages_progress && (
                    <Card className="mt-6 p-6">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-lg font-semibold">Stages Progress</h2>
                            {driver.has_completed_all_stages && (
                                <Badge variant="default" className="gap-2">
                                    <CheckCircle2 className="h-4 w-4" />
                                    All Stages Completed
                                </Badge>
                            )}
                        </div>
                        <div className="space-y-4">
                            <div>
                                <div className="mb-2 flex items-center justify-between text-sm">
                                    <span>Progress</span>
                                    <span className="font-medium">
                                        {driver.stages_progress.completed} / {driver.stages_progress.total} (
                                        {driver.stages_progress.percentage}%)
                                    </span>
                                </div>
                                <Progress value={driver.stages_progress.percentage} />
                            </div>
                            <div className="grid grid-cols-4 gap-4 text-center">
                                <div>
                                    <p className="text-2xl font-bold text-green-600">
                                        {driver.stages_progress.completed}
                                    </p>
                                    <p className="text-xs text-neutral-500">Completed</p>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-yellow-600">
                                        {driver.stages_progress.in_progress}
                                    </p>
                                    <p className="text-xs text-neutral-500">In Progress</p>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-gray-600">
                                        {driver.stages_progress.pending}
                                    </p>
                                    <p className="text-xs text-neutral-500">Pending</p>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-red-600">
                                        {driver.stages_progress.rejected}
                                    </p>
                                    <p className="text-xs text-neutral-500">Rejected</p>
                                </div>
                            </div>
                        </div>
                    </Card>
                )}

                {driver.stages_status && driver.stages_status.length > 0 && (
                    <Card className="mt-6 p-6">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-lg font-semibold">Stages Details</h2>
                            <Link href={`/drivers/driver-stages?driver_id=${driver.id}`}>
                                <Button variant="outline" size="sm">
                                    View All Stages
                                </Button>
                            </Link>
                        </div>
                        <div className="space-y-3">
                            {driver.stages_status.map((stage, index) => (
                                <div
                                    key={stage.stage_template.id}
                                    className="flex items-center justify-between rounded-lg border p-4"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
                                            <span className="text-sm font-medium">
                                                {stage.stage_template.order}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="font-medium">{stage.stage_template.name}</p>
                                            {stage.completed_at && (
                                                <p className="text-xs text-neutral-500">
                                                    Completed: {new Date(stage.completed_at).toLocaleDateString()}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {getStatusBadge(stage.status)}
                                        {stage.is_completed && (
                                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}

                {driver.documents && driver.documents.length > 0 && (
                    <Card className="mt-6 p-6">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-lg font-semibold">Documents</h2>
                            <Link href={`/drivers/driver-documents?driver_id=${driver.id}`}>
                                <Button variant="outline" size="sm">
                                    View All Documents
                                </Button>
                            </Link>
                        </div>
                        <div className="space-y-3">
                            {driver.documents.map((doc) => (
                                <div
                                    key={doc.id}
                                    className="flex items-center justify-between rounded-lg border p-4"
                                >
                                    <div className="flex items-center gap-3">
                                        <FileText className="h-5 w-5 text-neutral-500" />
                                        <div>
                                            <p className="font-medium">
                                                {doc.document_template?.name || 'Unknown Document'}
                                            </p>
                                            <p className="text-xs text-neutral-500">
                                                Type: {doc.document_template?.type || 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {getStatusBadge(doc.status)}
                                        {doc.uploaded_path && (
                                            <Link href={`/drivers/driver-documents/${doc.id}/download`}>
                                                <Button variant="outline" size="sm">
                                                    Download
                                                </Button>
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}

                {driver.notes && (
                    <Card className="mt-6 p-6">
                        <h2 className="mb-4 text-lg font-semibold">Notes</h2>
                        <p className="whitespace-pre-wrap text-neutral-700 dark:text-neutral-300">
                            {driver.notes}
                        </p>
                    </Card>
                )}
                    </>
                )}

                {activeTab === 'updates' && (
                    <Card className="p-6">
                        <h2 className="mb-4 text-lg font-semibold">Activity Log</h2>
                        <ActivityLog activities={activities} />
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}

