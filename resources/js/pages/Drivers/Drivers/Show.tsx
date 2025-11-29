import { ActivityLog } from '@/components/core/activity-log';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Activity, CheckCircle2, Clock, FileText, Mail, Phone, User, XCircle, Upload, Eye, Trash2, Edit, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useRef } from 'react';
import axios from 'axios';
import { type SharedData } from '@/types';

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
    lead_stage?: { id: number; name: string; color?: string };
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
        original_filename?: string;
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
    next_driver_id?: number | null;
    previous_driver_id?: number | null;
}

export default function DriversShow({ driver, activities = [], next_driver_id, previous_driver_id }: DriversShowProps) {
    const page = usePage<SharedData>();
    const [activeTab, setActiveTab] = useState<'overview' | 'updates'>('overview');
    const [viewingDocument, setViewingDocument] = useState<{ id: number; url: string; extension?: string } | null>(null);
    const [uploadingDocId, setUploadingDocId] = useState<number | null>(null);
    const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

    if (!driver) {
        return (
            <AppLayout>
                <Head title="Driver Not Found" />
                <div className="p-6">
                    <div className="text-center py-12">
                        <p className="text-neutral-500">Driver not found.</p>
                        <Link href="/drivers/drivers" className="mt-4 inline-block">
                            <Button variant="outline">Back to List</Button>
                        </Link>
                    </div>
                </div>
            </AppLayout>
        );
    }

    const handleDelete = () => {
        if (confirm(`Are you sure you want to delete "${driver.full_name}"?`)) {
            router.delete(`/drivers/drivers/${driver.id}`, {
                onSuccess: () => {
                    // Redirect to drivers list
                    router.visit('/drivers/drivers');
                },
            });
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

    const hasPermission = (permission: string): boolean => {
        const user = page.props.auth?.user;
        if (user?.is_super_admin || user?.is_company_admin) {
            return true;
        }
        const permissions = (user as any)?.permissions || [];
        return permissions.some((p: any) => p.name === permission);
    };

    const canUploadDocument = () => {
        return hasPermission('drivers.driverdocuments.upload');
    };

    const canDeleteDocument = () => {
        return hasPermission('drivers.driverdocuments.delete-file');
    };

    const canViewDocument = () => {
        return hasPermission('drivers.driverdocuments.view');
    };

    const canReplaceDocument = () => {
        return hasPermission('drivers.driverdocuments.replace');
    };

    const canSetPending = () => {
        return hasPermission('drivers.driverdocuments.set-pending');
    };

    const canSetApproved = () => {
        return hasPermission('drivers.driverdocuments.set-approved');
    };

    const canSetRejected = () => {
        return hasPermission('drivers.driverdocuments.set-rejected');
    };

    const handleFileSelect = (docId: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
            alert('Please select a valid file (JPG, PNG, or PDF)');
            return;
        }

        // Validate file size (10MB)
        if (file.size > 10 * 1024 * 1024) {
            alert('File size must be less than 10MB');
            return;
        }

        setUploadingDocId(docId);
        const formData = new FormData();
        formData.append('file', file);

        axios
            .post(`/drivers/driver-documents/${docId}/upload`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            })
            .then(() => {
                router.reload({ only: ['driver'] });
            })
            .catch((error) => {
                alert(error.response?.data?.message || 'Failed to upload file');
            })
            .finally(() => {
                setUploadingDocId(null);
                if (fileInputRefs.current[docId]) {
                    fileInputRefs.current[docId]!.value = '';
                }
            });
    };

    const handleDeleteFile = (docId: number) => {
        if (!confirm('Are you sure you want to delete this file?')) return;

        axios
            .delete(`/drivers/driver-documents/${docId}/delete-file`, {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            })
            .then((response) => {
                // Always reload if we get a response (even if success is false, the file might be cleared)
                router.reload({ 
                    only: ['driver'],
                    preserveScroll: true,
                });
            })
            .catch((error) => {
                const errorMessage = error.response?.data?.message || error.message || 'Failed to delete file';
                alert(errorMessage);
                console.error('Delete file error:', error);
                // Still reload to sync state
                router.reload({ 
                    only: ['driver'],
                    preserveScroll: true,
                });
            });
    };

    const handleViewFile = (docId: number) => {
        const url = `/drivers/driver-documents/${docId}/view`;
        const doc = driver.documents?.find(d => d.id === docId);
        const extension = getFileExtension(doc?.original_filename, doc?.uploaded_path)?.toLowerCase();
        setViewingDocument({ id: docId, url, extension });
    };

    const getFileExtension = (filename?: string, path?: string): string | null => {
        const source = filename || path;
        if (!source) return null;
        
        const parts = source.split('.');
        if (parts.length > 1) {
            return parts[parts.length - 1].toUpperCase();
        }
        return null;
    };

    const handleApproveDocument = (docId: number) => {
        if (!confirm('Are you sure you want to approve this document?')) return;

        axios
            .post(`/drivers/driver-documents/${docId}/approve`, {}, {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            })
            .then(() => {
                router.reload({ 
                    only: ['driver'],
                    preserveScroll: true,
                });
            })
            .catch((error) => {
                const errorMessage = error.response?.data?.message || error.message || 'Failed to approve document';
                alert(errorMessage);
                console.error('Approve document error:', error);
            });
    };

    const handleRejectDocument = (docId: number) => {
        const notes = prompt('Please enter rejection notes (optional):');
        if (notes === null) return; // User cancelled

        axios
            .post(`/drivers/driver-documents/${docId}/reject`, { notes: notes || '' }, {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            })
            .then(() => {
                router.reload({ 
                    only: ['driver'],
                    preserveScroll: true,
                });
            })
            .catch((error) => {
                const errorMessage = error.response?.data?.message || error.message || 'Failed to reject document';
                alert(errorMessage);
                console.error('Reject document error:', error);
            });
    };

    const handleUpdateStatus = (docId: number, status: 'pending' | 'approved' | 'rejected') => {
        axios
            .post(`/drivers/driver-documents/${docId}/update-status`, { status }, {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            })
            .then(() => {
                router.reload({ only: ['driver'] });
            })
            .catch((error) => {
                const errorMessage = error.response?.data?.message || error.message || 'Failed to update document status';
                alert(errorMessage);
                console.error('Update status error:', error);
            });
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
                    <nav className="flex items-center justify-between">
                        <div className="flex gap-6">
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
                        </div>
                        <div className="flex items-center gap-2">
                            {previous_driver_id && (
                                <Link href={`/drivers/drivers/${previous_driver_id}`}>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                        <ChevronLeft className="h-5 w-5" />
                                    </Button>
                                </Link>
                            )}
                            {next_driver_id && (
                                <Link href={`/drivers/drivers/${next_driver_id}`}>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                        <ChevronRight className="h-5 w-5" />
                                    </Button>
                                </Link>
                            )}
                        </div>
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
                            {driver.lead_stage && (
                                <div>
                                    <p className="text-sm text-neutral-500">Lead Stage</p>
                                    <Badge
                                        variant="outline"
                                        style={{
                                            borderColor: driver.lead_stage.color || 'gray',
                                            color: driver.lead_stage.color || 'gray',
                                        }}
                                    >
                                        {driver.lead_stage.name}
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

                <Card className="mt-6 p-6">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-lg font-semibold">Documents</h2>
                        <Link href={`/drivers/driver-documents?driver_id=${driver.id}`}>
                            <Button variant="outline" size="sm">
                                View All Documents
                            </Button>
                        </Link>
                    </div>
                    {driver.documents && driver.documents.length > 0 ? (
                        <div className="space-y-3">
                            {driver.documents.map((doc) => (
                                <div
                                    key={doc.id}
                                    className={`flex items-center justify-between rounded-lg border p-4 ${
                                        canUploadDocument() && !doc.uploaded_path
                                            ? 'cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900/50'
                                            : ''
                                    }`}
                                    onClick={() => {
                                        if (canUploadDocument() && !doc.uploaded_path && !uploadingDocId) {
                                            fileInputRefs.current[doc.id]?.click();
                                        }
                                    }}
                                >
                                    <div className="flex items-center gap-3 flex-1">
                                        <FileText className="h-5 w-5 text-neutral-500" />
                                        <div className="flex-1">
                                            <p className="font-medium">
                                                {doc.document_template?.name || 'Unknown Document'}
                                            </p>
                                            <p className="text-xs text-neutral-500">
                                                Type: {doc.document_template?.type || 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {doc.uploaded_path ? (
                                            <>
                                                {/* Status buttons - only show if file is uploaded */}
                                                {(canSetPending() || canSetApproved() || canSetRejected()) && (
                                                    <div className="flex items-center gap-1 border rounded-md p-1">
                                                        {canSetPending() && (
                                                            <Button
                                                                variant={doc.status === 'pending' ? 'default' : 'ghost'}
                                                                size="sm"
                                                                className={`h-7 px-3 text-xs ${
                                                                    doc.status === 'pending'
                                                                        ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                                                                        : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
                                                                }`}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleUpdateStatus(doc.id, 'pending');
                                                                }}
                                                            >
                                                                PENDING
                                                            </Button>
                                                        )}
                                                        {canSetApproved() && (
                                                            <Button
                                                                variant={doc.status === 'approved' ? 'default' : 'ghost'}
                                                                size="sm"
                                                                className={`h-7 px-3 text-xs ${
                                                                    doc.status === 'approved'
                                                                        ? 'bg-green-500 hover:bg-green-600 text-white'
                                                                        : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
                                                                }`}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleUpdateStatus(doc.id, 'approved');
                                                                }}
                                                            >
                                                                APPROVED
                                                            </Button>
                                                        )}
                                                        {canSetRejected() && (
                                                            <Button
                                                                variant={doc.status === 'rejected' ? 'default' : 'ghost'}
                                                                size="sm"
                                                                className={`h-7 px-3 text-xs ${
                                                                    doc.status === 'rejected'
                                                                        ? 'bg-red-500 hover:bg-red-600 text-white'
                                                                        : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
                                                                }`}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleUpdateStatus(doc.id, 'rejected');
                                                                }}
                                                            >
                                                                REJECT
                                                            </Button>
                                                        )}
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                {getStatusBadge(doc.status)}
                                            </>
                                        )}
                                        {doc.uploaded_path ? (
                                            <>
                                                {canViewDocument() && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleViewFile(doc.id);
                                                        }}
                                                    >
                                                        <Eye className="h-4 w-4 mr-1" />
                                                        View
                                                        {getFileExtension(doc.original_filename, doc.uploaded_path) && (
                                                            <span className="ml-2 text-xs font-medium text-neutral-600 dark:text-neutral-400">
                                                                .{getFileExtension(doc.original_filename, doc.uploaded_path)}
                                                            </span>
                                                        )}
                                                    </Button>
                                                )}
                                                {canReplaceDocument() && (
                                                    <>
                                                        <input
                                                            ref={(el) => (fileInputRefs.current[doc.id] = el)}
                                                            type="file"
                                                            accept="image/jpeg,image/jpg,image/png,application/pdf"
                                                            className="hidden"
                                                            onChange={(e) => {
                                                                e.stopPropagation();
                                                                handleFileSelect(doc.id, e);
                                                            }}
                                                        />
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                fileInputRefs.current[doc.id]?.click();
                                                            }}
                                                            disabled={uploadingDocId === doc.id}
                                                        >
                                                            <Edit className="h-4 w-4 mr-1" />
                                                            {uploadingDocId === doc.id ? 'Uploading...' : 'Replace'}
                                                        </Button>
                                                    </>
                                                )}
                                                {canDeleteDocument() && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteFile(doc.id);
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </>
                                        ) : (
                                            canUploadDocument() && (
                                                <>
                                                    <input
                                                        ref={(el) => (fileInputRefs.current[doc.id] = el)}
                                                        type="file"
                                                        accept="image/jpeg,image/jpg,image/png,application/pdf"
                                                        className="hidden"
                                                        onChange={(e) => {
                                                            e.stopPropagation();
                                                            handleFileSelect(doc.id, e);
                                                        }}
                                                    />
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            fileInputRefs.current[doc.id]?.click();
                                                        }}
                                                        disabled={uploadingDocId === doc.id}
                                                    >
                                                        <Upload className="h-4 w-4 mr-1" />
                                                        {uploadingDocId === doc.id ? 'Uploading...' : 'Upload'}
                                                    </Button>
                                                </>
                                            )
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-8 text-center text-neutral-500">
                            <FileText className="mx-auto h-12 w-12 text-neutral-400 mb-2" />
                            <p>No documents available</p>
                        </div>
                    )}
                </Card>

                {/* File View Dialog */}
                <Dialog open={!!viewingDocument} onOpenChange={(open) => !open && setViewingDocument(null)}>
                    <DialogContent className="!max-w-6xl max-h-[90vh] overflow-hidden">
                        <DialogHeader>
                            <DialogTitle>View Document</DialogTitle>
                        </DialogHeader>
                        {viewingDocument && (() => {
                            const isImage = viewingDocument.extension && ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(viewingDocument.extension);
                            
                            return (
                                <div className="flex-1 overflow-auto flex items-center justify-center p-4">
                                    {isImage ? (
                                        <img
                                            src={viewingDocument.url}
                                            alt="Document"
                                            className="max-w-full max-h-[80vh] object-contain border rounded"
                                            style={{ objectFit: 'contain' }}
                                        />
                                    ) : (
                                        <iframe
                                            src={viewingDocument.url}
                                            className="w-full h-[80vh] border rounded"
                                            title="Document Viewer"
                                        />
                                    )}
                                </div>
                            );
                        })()}
                    </DialogContent>
                </Dialog>

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

