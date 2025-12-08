import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import AppLayout from '@/layouts/app-layout';
import { Head, Link } from '@inertiajs/react';
import { 
    ArrowLeft, 
    Edit, 
    Phone, 
    Mail, 
    User, 
    FileText,
    CheckCircle2,
    Clock,
    XCircle,
    Activity,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useState, useEffect } from 'react';
import { formatDate } from '@/utils/date-format';

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

interface AssignedUser {
    id: number;
    name: string;
}

interface Stage {
    id: number;
    stage_template?: {
        id: number;
        name: string;
    };
    status: string;
    completed_at?: string;
}

interface Document {
    id: number;
    document_template?: {
        id: number;
        name: string;
        type: string;
    };
    status: string;
    uploaded_path?: string;
    original_filename?: string;
}

interface Activity {
    id: number;
    description: string;
    event: string;
    properties: any;
    causer?: {
        id: number;
        name: string;
        email: string;
    };
    created_at: string;
}

interface Driver {
    id: number;
    uuid: string;
    driver_num?: string;
    company_id?: number;
    full_name: string;
    phone: string;
    whatsapp_phone?: string;
    email?: string;
    riding_company?: RidingCompany;
    campaign?: Campaign;
    lead_source?: LeadSource;
    assigned_to?: {
        id: number;
        name: string;
    };
    assigned_users?: AssignedUser[];
    lead_status?: LeadStatus;
    lead_status_comment?: string;
    next_follow_up?: string;
    last_follow_up?: string;
    lead_stage?: {
        id: number;
        name: string;
        color?: string;
    };
    current_stage?: {
        id: number;
        name: string;
    };
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
        stage_name: string;
        status: string;
        is_completed: boolean;
        is_pending: boolean;
        is_in_progress: boolean;
        is_rejected: boolean;
    }>;
    next_stage?: {
        id: number;
        name: string;
        order: number;
    };
    has_completed_all_stages?: boolean;
    stages?: Stage[];
    documents?: Document[];
    created_at: string;
    updated_at: string;
}

interface FollowUp {
    id: number;
    created_time?: string;
    user_name?: string;
    riding_company?: string;
    lead_stage?: string;
    lead_status?: string;
    lead_status_comment?: string;
    notes?: string;
    assigned_to_user?: {
        id: number;
        name: string;
    };
}

interface DriversShowProps {
    driver: Driver;
    activities?: Activity[];
    follow_ups?: FollowUp[];
    next_driver_id?: number;
    previous_driver_id?: number;
}

export default function DriversShow({ 
    driver, 
    activities = [], 
    follow_ups = [],
    next_driver_id, 
    previous_driver_id 
}: DriversShowProps) {
    const [activeTab, setActiveTab] = useState<'overview' | 'updates' | 'followups'>('overview');
    const [filteredIds, setFilteredIds] = useState<number[]>([]);
    const [currentIndex, setCurrentIndex] = useState<number>(-1);
    const [filteredNextId, setFilteredNextId] = useState<number | null>(null);
    const [filteredPreviousId, setFilteredPreviousId] = useState<number | null>(null);

    // Load filtered IDs from localStorage and find next/previous
    useEffect(() => {
        try {
            const savedIds = localStorage.getItem('drivers_filtered_ids');
            if (savedIds) {
                const ids = JSON.parse(savedIds) as number[];
                setFilteredIds(ids);
                const index = ids.indexOf(driver.id);
                setCurrentIndex(index);
                
                if (index !== -1) {
                    // Find next driver ID from filtered list
                    if (index < ids.length - 1) {
                        setFilteredNextId(ids[index + 1]);
                    } else {
                        setFilteredNextId(null);
                    }
                    
                    // Find previous driver ID from filtered list
                    if (index > 0) {
                        setFilteredPreviousId(ids[index - 1]);
                    } else {
                        setFilteredPreviousId(null);
                    }
                }
            }
        } catch (e) {
            console.error('Error loading filtered IDs:', e);
        }
    }, [driver.id]);

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

    return (
        <AppLayout>
            <Head title={`Driver - ${driver.full_name}`} />
            <div className="p-6">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/drivers/drivers">
                            <Button variant="ghost" size="sm">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold">{driver.full_name}</h1>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                Driver Details & Onboarding Progress
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {(filteredPreviousId !== null ? filteredPreviousId : previous_driver_id) && (
                            <Link href={`/drivers/drivers/${filteredPreviousId !== null ? filteredPreviousId : previous_driver_id}`}>
                                <Button variant="outline" size="sm">
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                            </Link>
                        )}
                        {(filteredNextId !== null ? filteredNextId : next_driver_id) && (
                            <Link href={`/drivers/drivers/${filteredNextId !== null ? filteredNextId : next_driver_id}`}>
                                <Button variant="outline" size="sm">
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </Link>
                        )}
                        <Link href={`/drivers/drivers/${driver.id}/edit`}>
                            <Button variant="outline" size="sm">
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                            </Button>
                        </Link>
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
                        <button
                            onClick={() => setActiveTab('followups')}
                            className={`border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                                activeTab === 'followups'
                                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                                    : 'border-transparent text-neutral-600 hover:border-neutral-300 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                Follow-ups ({follow_ups.length})
                            </div>
                        </button>
                    </nav>
                </div>

                {/* Tab Content */}
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        {/* Personal Information & CRM Information */}
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
                                    {driver.uuid && (
                                        <div>
                                            <p className="text-sm text-neutral-500">UUID</p>
                                            <p className="font-mono text-xs">{driver.uuid}</p>
                                        </div>
                                    )}
                                </div>
                            </Card>

                            <Card className="p-6">
                                <h2 className="mb-4 text-lg font-semibold">CRM Information</h2>
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-sm text-neutral-500">Riding Company</p>
                                        <p className="font-medium">
                                            {driver.riding_company?.name || <span className="text-neutral-400 italic">Not Set</span>}
                                        </p>
                                    </div>
                                    {driver.campaign && (
                                        <div>
                                            <p className="text-sm text-neutral-500">Campaign</p>
                                            <p className="font-medium">{driver.campaign.name}</p>
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-sm text-neutral-500">Lead Source</p>
                                        <p className="font-medium">
                                            {driver.lead_source?.name || <span className="text-neutral-400 italic">Not Set</span>}
                                        </p>
                                    </div>
                                    {/* Lead Status Group with Green Border */}
                                    <div className="rounded-lg border-2 border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-900/10 p-4 space-y-4">
                                        <div>
                                            <p className="text-sm text-neutral-500">Lead Status</p>
                                            {driver.lead_status ? (
                                                <Badge
                                                    variant="outline"
                                                    style={{
                                                        borderColor: driver.lead_status.color || 'gray',
                                                        color: driver.lead_status.color || 'gray',
                                                    }}
                                                >
                                                    {driver.lead_status.name}
                                                </Badge>
                                            ) : (
                                                <span className="text-neutral-400 italic">Not Set</span>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm text-neutral-500">Feedback Comment</p>
                                            {driver.lead_status_comment ? (
                                                <p className="font-medium whitespace-pre-wrap">{driver.lead_status_comment}</p>
                                            ) : (
                                                <span className="text-neutral-400 italic">Not Set</span>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm text-neutral-500">Next Follow-up</p>
                                            {driver.next_follow_up ? (
                                                <p className="font-medium">{formatDate(driver.next_follow_up)}</p>
                                            ) : (
                                                <span className="text-neutral-400 italic">Not Set</span>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-sm text-neutral-500">Last Follow-up</p>
                                        {driver.last_follow_up ? (
                                            <p className="font-medium">{formatDate(driver.last_follow_up)}</p>
                                        ) : (
                                            <span className="text-neutral-400 italic">Not Set</span>
                                        )}
                                    </div>
                                    {driver.assigned_to && (
                                        <div>
                                            <p className="text-sm text-neutral-500">Assigned To</p>
                                            <p className="font-medium">{driver.assigned_to.name}</p>
                                        </div>
                                    )}
                                    {driver.assigned_users && driver.assigned_users.length > 0 && (
                                        <div>
                                            <p className="text-sm text-neutral-500">Assigned Users</p>
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                {driver.assigned_users.map((user) => (
                                                    <Badge key={user.id} variant="secondary">
                                                        {user.name}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-sm text-neutral-500">Driver Num</p>
                                        <p className="font-medium">{driver.driver_num || driver.id}</p>
                                    </div>
                                    {driver.current_stage && (
                                        <div>
                                            <p className="text-sm text-neutral-500">Current Stage</p>
                                            <p className="font-medium">{driver.current_stage.name}</p>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </div>

                        {/* Stages Progress */}
                        {driver.stages_progress && (
                            <Card className="p-6">
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

                        {/* Stages Status */}
                        {driver.stages_status && driver.stages_status.length > 0 && (
                            <Card className="p-6">
                                <h2 className="mb-4 text-lg font-semibold">Stages Status</h2>
                                <div className="space-y-3">
                                    {driver.stages_status.map((stage, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <span className="font-medium">{stage.stage_name}</span>
                                                {stage.is_completed && (
                                                    <Badge variant="default" className="gap-1">
                                                        <CheckCircle2 className="h-3 w-3" />
                                                        Completed
                                                    </Badge>
                                                )}
                                                {stage.is_in_progress && (
                                                    <Badge variant="outline" className="gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        In Progress
                                                    </Badge>
                                                )}
                                                {stage.is_pending && (
                                                    <Badge variant="secondary" className="gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        Pending
                                                    </Badge>
                                                )}
                                                {stage.is_rejected && (
                                                    <Badge variant="destructive" className="gap-1">
                                                        <XCircle className="h-3 w-3" />
                                                        Rejected
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        )}

                        {/* Documents */}
                        {driver.documents && driver.documents.length > 0 && (
                            <Card className="p-6">
                                <h2 className="mb-4 text-lg font-semibold">Documents</h2>
                                <div className="space-y-3">
                                    {driver.documents.map((doc) => (
                                        <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <FileText className="h-4 w-4 text-neutral-500" />
                                                <div>
                                                    <p className="font-medium">
                                                        {doc.document_template?.name || 'Unknown Document'}
                                                    </p>
                                                    {doc.original_filename && (
                                                        <p className="text-sm text-neutral-500">{doc.original_filename}</p>
                                                    )}
                                                </div>
                                            </div>
                                            {getStatusBadge(doc.status)}
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        )}

                        {/* Notes */}
                        {driver.notes && (
                            <Card className="p-6">
                                <h2 className="mb-4 text-lg font-semibold">Notes</h2>
                                <p className="text-sm whitespace-pre-wrap">{driver.notes}</p>
                            </Card>
                        )}
                    </div>
                )}

                {activeTab === 'updates' && (
                    <Card className="p-6">
                        <h2 className="mb-4 text-lg font-semibold">Activity Log</h2>
                        {activities.length === 0 ? (
                            <p className="text-sm text-neutral-500">No activity recorded yet.</p>
                        ) : (
                            <div className="space-y-4">
                                {activities.map((activity) => (
                                    <div key={activity.id} className="border-l-2 border-blue-500 pl-4 py-2">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <p className="font-medium">{activity.description}</p>
                                                {activity.causer && (
                                                    <p className="text-sm text-neutral-500">
                                                        by {activity.causer.name}
                                                    </p>
                                                )}
                                                <p className="text-xs text-neutral-400 mt-1">
                                                    {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                                                </p>
                                            </div>
                                            <Badge variant="outline">{activity.event}</Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                )}

                {activeTab === 'followups' && (
                    <Card className="p-6">
                        <h2 className="mb-4 text-lg font-semibold">Follow-ups</h2>
                        {follow_ups.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-neutral-50 dark:bg-neutral-900">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">Created Time</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">User Name</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">Riding Company</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">Lead Stage</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">Lead Status</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">Feedback Comment</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">Notes</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {follow_ups.map((followUp) => (
                                            <tr key={followUp.id} className="border-t hover:bg-muted/50 transition-colors">
                                                <td className="px-4 py-3 text-sm">
                                                    {followUp.created_time ? formatDate(followUp.created_time) + ' ' + new Date(followUp.created_time).toLocaleTimeString() : 'N/A'}
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    {followUp.user_name || 'N/A'}
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    {followUp.riding_company || 'N/A'}
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    {followUp.lead_stage || 'N/A'}
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    {followUp.lead_status || 'N/A'}
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    {followUp.lead_status_comment ? (
                                                        <div className="max-w-xs truncate" title={followUp.lead_status_comment}>
                                                            {followUp.lead_status_comment}
                                                        </div>
                                                    ) : 'N/A'}
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    {followUp.notes ? (
                                                        <div className="max-w-xs truncate" title={followUp.notes}>
                                                            {followUp.notes}
                                                        </div>
                                                    ) : 'N/A'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="py-8 text-center text-neutral-500">
                                No follow-ups found for this driver.
                            </div>
                        )}
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}

