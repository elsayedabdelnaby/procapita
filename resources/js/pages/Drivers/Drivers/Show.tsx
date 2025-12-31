import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, usePage } from '@inertiajs/react';
import { useFieldPermissions } from '@/hooks/use-field-permissions';
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
    ChevronRight,
    MessageCircle,
    Eye
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useState, useEffect } from 'react';
import { formatDate } from '@/utils/date-format';
import { WhatsAppWindow } from '@/components/whatsapp/whatsapp-window';

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
    properties?: {
        old?: Record<string, any>;
        attributes?: Record<string, any>;
    };
    causer?: {
        id: number;
        name: string;
        email: string;
    };
    created_at: string;
}

// Helper function to convert field names to readable labels
const getFieldLabel = (fieldName: string): string => {
    const fieldLabels: Record<string, string> = {
        'full_name': 'Full Name',
        'phone': 'Phone',
        'whatsapp_phone': 'WhatsApp Phone',
        'email': 'Email',
        'riding_company_id': 'Riding Company',
        'campaign_id': 'Campaign',
        'lead_source_id': 'Lead Source',
        'assigned_to': 'Assigned To',
        'assigned_users': 'Assigned Users',
        'lead_status_id': 'Lead Status',
        'lead_status_comment': 'Lead Status Comment',
        'next_follow_up': 'Next Follow-up',
        'last_follow_up': 'Last Follow-up',
        'lead_stage_id': 'Lead Stage',
        'current_stage_id': 'Current Stage',
        'notes': 'Notes',
    };
    return fieldLabels[fieldName] || fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

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
    last_assigned_time?: string;
    last_assigned_by?: {
        id: number;
        name: string;
    };
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
    cancel_reason?: string;
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
    duplicate?: number;
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
    cancel_reason?: string;
    assigned_to_user?: {
        id: number;
        name: string;
    };
}

interface DuplicateDriver {
    id: number;
    full_name: string;
    phone?: string;
    whatsapp_phone?: string;
    email?: string;
    riding_company?: {
        id: number;
        name: string;
    };
    campaign?: {
        id: number;
        name: string;
    };
    lead_source?: {
        id: number;
        name: string;
    };
    lead_status?: {
        id: number;
        name: string;
        color?: string;
    };
    lead_stage?: {
        id: number;
        name: string;
    };
    assigned_to?: {
        id: number;
        name: string;
    };
    assigned_users?: Array<{
        id: number;
        name: string;
    }>;
    created_at: string;
    updated_at: string;
}

interface DriversShowProps {
    driver: Driver;
    activities?: Activity[];
    follow_ups?: FollowUp[];
    duplicate_drivers?: DuplicateDriver[];
    next_driver_id?: number;
    previous_driver_id?: number;
    riding_company_id?: number;
}

export default function DriversShow({ 
    driver, 
    activities = [], 
    follow_ups = [],
    duplicate_drivers = [],
    next_driver_id, 
    previous_driver_id,
    riding_company_id
}: DriversShowProps) {
    const [activeTab, setActiveTab] = useState<'overview' | 'updates' | 'followups' | 'duplicates'>('overview');
    const [filteredIds, setFilteredIds] = useState<number[]>([]);
    const [currentIndex, setCurrentIndex] = useState<number>(-1);
    const [filteredNextId, setFilteredNextId] = useState<number | null>(null);
    const [filteredPreviousId, setFilteredPreviousId] = useState<number | null>(null);
    const [phoneWhatsAppOpen, setPhoneWhatsAppOpen] = useState(false);
    const [whatsappPhoneWhatsAppOpen, setWhatsappPhoneWhatsAppOpen] = useState(false);
    
    // Get riding company ID from props or driver
    const page = usePage();
    const auth = (page.props as any).auth;
    const currentUser = auth?.user;
    const userRidingCompanyId = (currentUser as any)?.riding_company_id || null;
    const isCompanyAdmin = currentUser?.is_company_admin || false;
    const isSuperAdmin = currentUser?.is_super_admin || false;
    
    // Hide riding company field if user has a specific riding company assigned (not admin)
    const showRidingCompanyField = isSuperAdmin || isCompanyAdmin || !userRidingCompanyId;
    
    const effectiveRidingCompanyId = riding_company_id || driver.riding_company?.id || (page.props as any).selectedRidingCompany?.id;
    
    // Field-level permissions
    const { canViewDriverField } = useFieldPermissions();

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
                        {(driver.duplicate ?? 0) > 0 && (
                            <button
                                onClick={() => setActiveTab('duplicates')}
                                className={`border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                                    activeTab === 'duplicates'
                                        ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                                        : 'border-transparent text-neutral-600 hover:border-neutral-300 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    Duplicates ({driver.duplicate})
                                </div>
                            </button>
                        )}
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
                                    {canViewDriverField('full_name') && (
                                        <div className="flex items-start gap-2">
                                            <User className="mt-0.5 h-4 w-4 text-neutral-500" />
                                            <div className="flex-1">
                                                <p className="text-sm text-neutral-500">Full Name</p>
                                                <p className="font-medium">{driver.full_name}</p>
                                            </div>
                                        </div>
                                    )}
                                    {canViewDriverField('phone') && (
                                        <div className="flex items-start gap-2">
                                            <Phone className="mt-0.5 h-4 w-4 text-neutral-500" />
                                            <div className="flex-1">
                                                <p className="text-sm text-neutral-500">Phone</p>
                                                <p className="font-medium">{driver.phone}</p>
                                            </div>
                                        </div>
                                    )}
                                    {canViewDriverField('whatsapp_phone') && driver.whatsapp_phone && (
                                        <div className="flex items-start gap-2">
                                            <Phone className="mt-0.5 h-4 w-4 text-neutral-500" />
                                            <div className="flex-1">
                                                <p className="text-sm text-neutral-500">WhatsApp</p>
                                                <p className="font-medium">{driver.whatsapp_phone}</p>
                                            </div>
                                        </div>
                                    )}
                                    {canViewDriverField('email') && driver.email && (
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
                                    {canViewDriverField('riding_company') && showRidingCompanyField && (
                                        <div>
                                            <p className="text-sm text-neutral-500">Riding Company</p>
                                            <p className="font-medium">
                                                {driver.riding_company?.name || <span className="text-neutral-400 italic">Not Set</span>}
                                            </p>
                                        </div>
                                    )}
                                    {canViewDriverField('campaign') && driver.campaign && (
                                        <div>
                                            <p className="text-sm text-neutral-500">Campaign</p>
                                            <p className="font-medium">{driver.campaign.name}</p>
                                        </div>
                                    )}
                                    {canViewDriverField('lead_source') && (
                                        <div>
                                            <p className="text-sm text-neutral-500">Lead Source</p>
                                            <p className="font-medium">
                                                {driver.lead_source?.name || <span className="text-neutral-400 italic">Not Set</span>}
                                            </p>
                                        </div>
                                    )}
                                    {/* Lead Status Group with Green Border */}
                                    {(canViewDriverField('lead_status') || canViewDriverField('lead_status_comment') || canViewDriverField('next_follow_up')) && (
                                        <div className="rounded-lg border-2 border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-900/10 p-4 space-y-4">
                                            {canViewDriverField('lead_status') && (
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
                                            )}
                                            {canViewDriverField('lead_status_comment') && (
                                                <div>
                                                    <p className="text-sm text-neutral-500">Feedback Comment</p>
                                                    {driver.lead_status_comment ? (
                                                        <p className="font-medium whitespace-pre-wrap">{driver.lead_status_comment}</p>
                                                    ) : (
                                                        <span className="text-neutral-400 italic">Not Set</span>
                                                    )}
                                                </div>
                                            )}
                                            {canViewDriverField('next_follow_up') && (
                                                <div>
                                                    <p className="text-sm text-neutral-500">Next Follow-up</p>
                                                    {driver.next_follow_up ? (
                                                        <p className="font-medium">{formatDate(driver.next_follow_up)}</p>
                                                    ) : (
                                                        <span className="text-neutral-400 italic">Not Set</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {canViewDriverField('cancel_reason') && (
                                        <div>
                                            <p className="text-sm text-neutral-500">Cancel Reasons</p>
                                            {driver.cancel_reason ? (
                                                <p className="font-medium">{driver.cancel_reason}</p>
                                            ) : (
                                                <span className="text-neutral-400 italic">Not Set</span>
                                            )}
                                        </div>
                                    )}
                                    {canViewDriverField('last_follow_up') && (
                                        <div>
                                            <p className="text-sm text-neutral-500">Last Follow-up</p>
                                            {driver.last_follow_up ? (
                                                <p className="font-medium">{formatDate(driver.last_follow_up)}</p>
                                            ) : (
                                                <span className="text-neutral-400 italic">Not Set</span>
                                            )}
                                        </div>
                                    )}
                                    {canViewDriverField('assigned_users') && driver.assigned_users && driver.assigned_users.length > 0 && (
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
                                    {canViewDriverField('last_assigned_time') && (
                                        <div>
                                            <p className="text-sm text-neutral-500">Last Assigned Time</p>
                                            <p className="font-medium">{driver.last_assigned_time ? formatDate(driver.last_assigned_time) : <span className="text-neutral-400 italic">Not Set</span>}</p>
                                        </div>
                                    )}
                                    {canViewDriverField('last_assigned_by') && (
                                        <div>
                                            <p className="text-sm text-neutral-500">Last Assigned By</p>
                                            <p className="font-medium">{driver.last_assigned_by?.name || <span className="text-neutral-400 italic">Not Set</span>}</p>
                                        </div>
                                    )}
                                    {canViewDriverField('driver_num') && (
                                        <div>
                                            <p className="text-sm text-neutral-500">Driver Num</p>
                                            <p className="font-medium">{driver.driver_num || driver.id}</p>
                                        </div>
                                    )}
                                    {canViewDriverField('current_stage') && driver.current_stage && (
                                        <div>
                                            <p className="text-sm text-neutral-500">Current Stage</p>
                                            <p className="font-medium">{driver.current_stage.name}</p>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </div>

                        {/* WhatsApp Chat Cards */}
                        {effectiveRidingCompanyId && (
                            <div className="grid gap-6 md:grid-cols-2">
                                {/* Phone WhatsApp Chat */}
                                <Card className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-lg font-semibold flex items-center gap-2">
                                            <MessageCircle className="h-5 w-5 text-green-500" />
                                            Phone Chat
                                        </h2>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPhoneWhatsAppOpen(!phoneWhatsAppOpen)}
                                            className="text-green-600 border-green-600 hover:bg-green-50"
                                        >
                                            {phoneWhatsAppOpen ? 'Close' : 'Open'} Chat
                                        </Button>
                                    </div>
                                    <p className="text-sm text-neutral-500 mb-2">Phone: {driver.phone}</p>
                                    {phoneWhatsAppOpen && (
                                        <div className="border rounded-lg overflow-hidden" style={{ height: '400px' }}>
                                            <WhatsAppWindow
                                                ridingCompanyId={effectiveRidingCompanyId}
                                                driverPhoneNumbers={[driver.phone]}
                                                drivers={[{ id: driver.id, name: driver.full_name, phone: driver.phone, whatsapp_phone: driver.whatsapp_phone, avatar: (driver as any).avatar }]}
                                                isOpen={true}
                                                onClose={() => setPhoneWhatsAppOpen(false)}
                                                initialChatPhone={driver.phone}
                                                singleChatMode={true}
                                            />
                                        </div>
                                    )}
                                </Card>

                                {/* WhatsApp Phone Chat */}
                                {driver.whatsapp_phone && driver.whatsapp_phone !== driver.phone && (
                                    <Card className="p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                                <MessageCircle className="h-5 w-5 text-green-500" />
                                                WhatsApp Chat
                                            </h2>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setWhatsappPhoneWhatsAppOpen(!whatsappPhoneWhatsAppOpen)}
                                                className="text-green-600 border-green-600 hover:bg-green-50"
                                            >
                                                {whatsappPhoneWhatsAppOpen ? 'Close' : 'Open'} Chat
                                            </Button>
                                        </div>
                                        <p className="text-sm text-neutral-500 mb-2">WhatsApp: {driver.whatsapp_phone}</p>
                                        {whatsappPhoneWhatsAppOpen && (
                                            <div className="border rounded-lg overflow-hidden" style={{ height: '400px' }}>
                                                <WhatsAppWindow
                                                    ridingCompanyId={effectiveRidingCompanyId}
                                                    driverPhoneNumbers={[driver.whatsapp_phone]}
                                                    drivers={[{ id: driver.id, name: driver.full_name, phone: driver.phone, whatsapp_phone: driver.whatsapp_phone, avatar: (driver as any).avatar }]}
                                                    isOpen={true}
                                                    onClose={() => setWhatsappPhoneWhatsAppOpen(false)}
                                                    initialChatPhone={driver.whatsapp_phone}
                                                    singleChatMode={true}
                                                />
                                            </div>
                                        )}
                                    </Card>
                                )}
                            </div>
                        )}

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
                        {canViewDriverField('notes') && driver.notes && (
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
                                {activities.map((activity) => {
                                    const properties = activity.properties || {};
                                    const oldValues = properties.old || {};
                                    const newValues = properties.attributes || {};
                                    const changedFields = Object.keys(newValues).filter(key => 
                                        oldValues[key] !== newValues[key] && key !== 'updated_at'
                                    );
                                    
                                    // Format date and time for tooltip
                                    const dateTimeString = formatDate(activity.created_at);
                                    
                                    return (
                                        <div key={activity.id} className="border-l-2 border-blue-500 pl-4 py-3 bg-neutral-50 dark:bg-neutral-900/50 rounded-r">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1 space-y-2">
                                                    {activity.causer && (
                                                        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                            Updated by <span className="font-semibold">{activity.causer.name}</span>
                                                        </p>
                                                    )}
                                                    
                                                    {changedFields.length > 0 ? (
                                                        <div className="space-y-1">
                                                            {changedFields.map((field) => {
                                                                const oldValue = oldValues[field];
                                                                const newValue = newValues[field];
                                                                const fieldLabel = getFieldLabel(field);
                                                                
                                                                return (
                                                                    <div key={field} className="text-sm">
                                                                        <span className="font-medium text-neutral-700 dark:text-neutral-300">
                                                                            {fieldLabel}:
                                                                        </span>{' '}
                                                                        <span className="text-neutral-600 dark:text-neutral-400">
                                                                            Changed from{' '}
                                                                            <span className="line-through text-red-600 dark:text-red-400">
                                                                                {oldValue !== null && oldValue !== undefined ? String(oldValue) : 'empty'}
                                                                            </span>
                                                                            {' '}to{' '}
                                                                            <span className="text-green-600 dark:text-green-400 font-medium">
                                                                                {newValue !== null && newValue !== undefined ? String(newValue) : 'empty'}
                                                                            </span>
                                                                        </span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                                            {activity.description}
                                                        </p>
                                                    )}
                                                    
                                                    <p 
                                                        className="text-xs text-neutral-400 mt-2 cursor-help" 
                                                        title={dateTimeString}
                                                    >
                                                        {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                                                    </p>
                                                </div>
                                                <Badge variant="outline" className="flex-shrink-0">
                                                    {activity.event}
                                                </Badge>
                                            </div>
                                        </div>
                                    );
                                })}
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
                                    <thead className="bg-neutral-100/60 dark:bg-neutral-800/60 backdrop-blur-sm">
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
                                        {follow_ups.map((followUp, index) => (
                                            <tr 
                                                key={followUp.id} 
                                                className={`
                                                    border-t transition-colors duration-150
                                                    ${
                                                        index === 0
                                                            ? 'bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100/70 dark:hover:bg-blue-950/40'
                                                            : index % 2 === 0
                                                              ? 'bg-white dark:bg-neutral-950 hover:bg-neutral-50 dark:hover:bg-neutral-900/50'
                                                              : 'bg-neutral-50/80 dark:bg-neutral-900/30 hover:bg-neutral-100 dark:hover:bg-neutral-900/60'
                                                    }
                                                `}
                                            >
                                                <td className="px-4 py-3 text-sm">
                                                    {followUp.created_time ? formatDate(followUp.created_time) : 'N/A'}
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

                {activeTab === 'duplicates' && (
                    <Card className="p-6">
                        <h2 className="mb-4 text-lg font-semibold">Duplicate Drivers ({driver.duplicate})</h2>
                        <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">
                            Drivers with the same phone number or WhatsApp number as this driver.
                        </p>
                        {duplicate_drivers.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-neutral-100/60 dark:bg-neutral-800/60 backdrop-blur-sm">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">Full Name</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">Phone</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">WhatsApp</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">Email</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">Riding Company</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">Campaign</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">Lead Source</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">Lead Status</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">Lead Stage</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">Assigned To</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {duplicate_drivers.map((dup, index) => (
                                            <tr 
                                                key={dup.id} 
                                                className={`
                                                    border-t transition-colors duration-150 cursor-pointer
                                                    ${
                                                        index === 0
                                                            ? 'bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100/70 dark:hover:bg-blue-950/40'
                                                            : index % 2 === 0
                                                              ? 'bg-white dark:bg-neutral-950 hover:bg-neutral-50 dark:hover:bg-neutral-900/50'
                                                              : 'bg-neutral-50/80 dark:bg-neutral-900/30 hover:bg-neutral-100 dark:hover:bg-neutral-900/60'
                                                    }
                                                `} 
                                                onClick={() => window.location.href = `/drivers/drivers/${dup.id}`}
                                            >
                                                <td className="px-4 py-3 text-sm">{dup.full_name || '-'}</td>
                                                <td className="px-4 py-3 text-sm">{dup.phone || '-'}</td>
                                                <td className="px-4 py-3 text-sm">{dup.whatsapp_phone || '-'}</td>
                                                <td className="px-4 py-3 text-sm">{dup.email || '-'}</td>
                                                <td className="px-4 py-3 text-sm">{dup.riding_company?.name || '-'}</td>
                                                <td className="px-4 py-3 text-sm">{dup.campaign?.name || '-'}</td>
                                                <td className="px-4 py-3 text-sm">{dup.lead_source?.name || '-'}</td>
                                                <td className="px-4 py-3 text-sm">
                                                    {dup.lead_status ? (
                                                        <Badge style={{ backgroundColor: dup.lead_status.color || '#6b7280' }}>
                                                            {dup.lead_status.name}
                                                        </Badge>
                                                    ) : '-'}
                                                </td>
                                                <td className="px-4 py-3 text-sm">{dup.lead_stage?.name || '-'}</td>
                                                <td className="px-4 py-3 text-sm">
                                                    {dup.assigned_to?.name || (dup.assigned_users && dup.assigned_users.length > 0 ? dup.assigned_users.map(u => u.name).join(', ') : '-')}
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    <Link href={`/drivers/drivers/${dup.id}`} onClick={(e) => e.stopPropagation()}>
                                                        <Button variant="outline" size="sm">
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-neutral-500 dark:text-neutral-400">No duplicate drivers found.</p>
                        )}
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}

