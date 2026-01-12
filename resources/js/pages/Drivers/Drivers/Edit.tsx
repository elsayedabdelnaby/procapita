import { FormField } from '@/components/core/form-field';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { MultiSelect } from '@/components/ui/multi-select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, useForm, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { formatDate } from '@/utils/date-format';
import { EGYPT_GOVERNORATES } from '@/constants/egypt-governorates';

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
}

interface LeadStage {
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
    company_id?: number;
    full_name: string;
    phone: string;
    whatsapp_phone?: string;
    email?: string;
    riding_company_id?: number;
    campaign_id?: number;
    lead_source_id?: number;
    assigned_to?: number;
    assigned_users?: number[];
    lead_status_id?: number;
    lead_status_comment?: string;
    next_follow_up?: string;
    last_follow_up?: string;
    lead_stage_id?: number;
    current_stage_id?: number;
    notes?: string;
}

interface DriversEditProps {
    driver: Driver;
    companies?: Company[];
    ridingCompanies: RidingCompany[];
    campaigns: Campaign[];
    leadSources: LeadSource[];
    leadStatuses: LeadStatus[];
    users: User[];
}

export default function DriversEdit({
    driver,
    companies,
    ridingCompanies,
    campaigns,
    leadSources,
    leadStatuses,
    users,
}: DriversEditProps) {
    const page = usePage();
    const auth = (page.props as any).auth;
    const currentUser = auth?.user;
    const userRidingCompanyId = (currentUser as any)?.riding_company_id || null;
    const isCompanyAdmin = currentUser?.is_company_admin || false;
    const isSuperAdmin = currentUser?.is_super_admin || false;
    
    // Hide riding company field if user has a specific riding company assigned (not admin)
    const showRidingCompanyField = isSuperAdmin || isCompanyAdmin || !userRidingCompanyId;
    
    const [leadStages, setLeadStages] = useState<LeadStage[]>([]);
    const [loadingLeadStages, setLoadingLeadStages] = useState(false);
    const [timeEditingState, setTimeEditingState] = useState<'hours' | 'minutes' | null>(null);
    const [showReassignDialog, setShowReassignDialog] = useState(false);
    const [clearFieldsOnReassign, setClearFieldsOnReassign] = useState<Set<string>>(new Set());
    const [setLeadStatusToNew, setSetLeadStatusToNew] = useState(false);
    const [pendingSubmit, setPendingSubmit] = useState<(() => void) | null>(null);
    const [confirmDuplicate, setConfirmDuplicate] = useState(false);
    const originalAssignedTo = driver.assigned_to;
    const isAdmin = isSuperAdmin || isCompanyAdmin;

    const { data, setData, put, processing, errors } = useForm({
        company_id: driver.company_id ? String(driver.company_id) : '',
        full_name: driver.full_name || '',
        phone: driver.phone || '',
        whatsapp_phone: driver.whatsapp_phone || '',
        email: driver.email || '',
        riding_company_id: driver.riding_company_id ? String(driver.riding_company_id) : (userRidingCompanyId ? String(userRidingCompanyId) : ''),
        campaign_id: driver.campaign_id ? String(driver.campaign_id) : '',
        lead_source_id: driver.lead_source_id ? String(driver.lead_source_id) : '',
        assigned_to: driver.assigned_to ? String(driver.assigned_to) : '',
        assigned_users: driver.assigned_users || [],
        lead_status_id: '', // Always clear on edit - user must select
        lead_status_comment: '', // Always clear on edit - user must enter
        next_follow_up: '', // Always clear on edit - user must enter
        last_follow_up: driver.last_follow_up || '',
        lead_stage_id: driver.lead_stage_id ? String(driver.lead_stage_id) : '',
        current_stage_id: driver.current_stage_id ? String(driver.current_stage_id) : '',
        notes: driver.notes || '',
        cancel_reason: driver.cancel_reason || '',
        feedback_count: driver.feedback_count || 0,
        vehicle_type: driver.vehicle_type || '',
        has_worked_before: driver.has_worked_before || '',
        governorate: driver.governorate || '',
    });


    // Check if cancel_reason is required based on lead_status
    const isCancelReasonRequired = () => {
        if (!data.lead_status_id) return false;
        const selectedStatus = leadStatuses.find(s => String(s.id) === String(data.lead_status_id));
        return selectedStatus && ['Rejected', 'Deleted lead', 'Expired Account'].includes(selectedStatus.name);
    };

    // Check if next_follow_up and lead_status_comment are required based on lead_status
    const isFollowUpRequired = () => {
        if (!data.lead_status_id) return false;
        const selectedStatus = leadStatuses.find(s => String(s.id) === String(data.lead_status_id));
        const requiredStatuses = [
            'Probleme with link', 'Whats app Message', 'Follow Documents', 'Follow Up', 'Need Recall',
            'Link Not Done', 'Missing Documents', 'Waiting Activation', 'Need To Visit GL', 'Active',
            'Sign Up', 'Sign up Cities', 'DFT', 'Complete 50', 'Complete 100', 'Complete 120',
            'DFT Old', 'Fresh stage'
        ];
        return selectedStatus && requiredStatuses.includes(selectedStatus.name);
    };

    // Auto-set next_follow_up and cancel_reason based on lead status
    useEffect(() => {
        if (data.lead_status_id) {
            const selectedStatus = leadStatuses.find(s => String(s.id) === String(data.lead_status_id));
            if (selectedStatus) {
                if (selectedStatus.name === 'No Answer 1st Call') {
                    // For "No Answer 1st Call": Today's date + 2 hours from now
                    const today = new Date();
                    const twoHoursLater = new Date(today.getTime() + 2 * 60 * 60 * 1000); // Add 2 hours
                    const year = today.getFullYear();
                    const month = String(today.getMonth() + 1).padStart(2, '0');
                    const day = String(today.getDate()).padStart(2, '0');
                    const hours = String(twoHoursLater.getHours()).padStart(2, '0');
                    const minutes = String(twoHoursLater.getMinutes()).padStart(2, '0');
                    const dateStr = `${year}-${month}-${day}`;
                    const datetimeStr = `${dateStr}T${hours}:${minutes}`;
                    if (data.next_follow_up !== datetimeStr) {
                        setData('next_follow_up', datetimeStr);
                    }
                } else if (selectedStatus.name.toLowerCase().includes('answer') && selectedStatus.name !== 'No Answer 1st Call') {
                    // For Lead Statuses containing "Answer" (except "No Answer 1st Call"): Tomorrow's date + current time
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    const now = new Date();
                    const year = tomorrow.getFullYear();
                    const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
                    const day = String(tomorrow.getDate()).padStart(2, '0');
                    const hours = String(now.getHours()).padStart(2, '0');
                    const minutes = String(now.getMinutes()).padStart(2, '0');
                    const dateStr = `${year}-${month}-${day}`;
                    const datetimeStr = `${dateStr}T${hours}:${minutes}`;
                    if (data.next_follow_up !== datetimeStr) {
                        setData('next_follow_up', datetimeStr);
                    }
                }
                
                // Auto-set cancel_reason to "Expired" when "Expired Account" is selected
                if (selectedStatus.name === 'Expired Account') {
                    if (data.cancel_reason !== 'Expired') {
                        setData('cancel_reason', 'Expired');
                    }
                }
            }
        }
    }, [data.lead_status_id, leadStatuses, setData]);

    // Fetch lead stages when riding company changes
    useEffect(() => {
        if (data.riding_company_id) {
            setLoadingLeadStages(true);
            axios
                .get(`/api/drivers/riding-companies/${data.riding_company_id}/lead-stages`)
                .then((response) => {
                    setLeadStages(response.data);
                })
                .catch((error) => {
                    console.error('Error fetching lead stages:', error);
                    setLeadStages([]);
                })
                .finally(() => {
                    setLoadingLeadStages(false);
                });
        } else {
            setLeadStages([]);
            setData('lead_stage_id', '');
        }
    }, [data.riding_company_id]);

    // Load lead stages on mount if riding company is already selected
    useEffect(() => {
        if (driver.riding_company_id) {
            setLoadingLeadStages(true);
            axios
                .get(`/api/drivers/riding-companies/${driver.riding_company_id}/lead-stages`)
                .then((response) => {
                    setLeadStages(response.data);
                })
                .catch((error) => {
                    console.error('Error fetching lead stages:', error);
                    setLeadStages([]);
                })
                .finally(() => {
                    setLoadingLeadStages(false);
                });
        }
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Check if assigned_to has changed
        const newAssignedTo = data.assigned_to ? Number(data.assigned_to) : null;
        if (newAssignedTo !== originalAssignedTo && (originalAssignedTo || newAssignedTo)) {
            // Show dialog to select fields to clear
            setShowReassignDialog(true);
            setPendingSubmit(() => () => {
                performSubmit();
            });
            return;
        }
        
        performSubmit();
    };
    
    const performSubmit = () => {
        put(`/drivers/drivers/${driver.id}`, {
            transform: (data) => ({
                ...data,
                assigned_to: data.assigned_to ? Number(data.assigned_to) : null,
                assigned_users: data.assigned_users || [],
                clear_fields_on_reassign: Array.from(clearFieldsOnReassign),
                set_lead_status_to_new: setLeadStatusToNew,
                confirm_duplicate: isAdmin ? confirmDuplicate : true,
            }),
            onSuccess: () => {
                router.visit('/drivers/drivers');
            },
        });
    };
    
    const handleReassignDialogConfirm = () => {
        setShowReassignDialog(false);
        if (pendingSubmit) {
            pendingSubmit();
            setPendingSubmit(null);
        }
    };
    
    const handleReassignDialogCancel = () => {
        setShowReassignDialog(false);
        setClearFieldsOnReassign(new Set());
        setSetLeadStatusToNew(false);
        setPendingSubmit(null);
    };
    
    const toggleClearField = (fieldName: string, checked: boolean) => {
        const newSet = new Set(clearFieldsOnReassign);
        if (checked) {
            newSet.add(fieldName);
        } else {
            newSet.delete(fieldName);
        }
        setClearFieldsOnReassign(newSet);
    };

    return (
        <AppLayout>
            <Head title={`Edit ${driver.full_name}`} />

            <div className="p-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold">Edit Driver</h1>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        Update driver information
                    </p>
                </div>

                {Object.keys(errors).length > 0 && (
                    <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0">
                                <svg
                                    className="h-5 w-5 text-red-600 dark:text-red-400"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                                    There {Object.keys(errors).length === 1 ? 'is' : 'are'}{' '}
                                    {Object.keys(errors).length} error
                                    {Object.keys(errors).length === 1 ? '' : 's'} with your submission
                                </h3>
                                <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-red-700 dark:text-red-300">
                                    {Object.entries(errors).map(([field, message]) => (
                                        <li key={field}>{message}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <Card className="p-6">
                        <h2 className="mb-4 text-lg font-semibold">Basic Information</h2>
                        <div className="grid gap-4 md:grid-cols-2">
                            {companies && companies.length > 0 && (
                                <div>
                                    <Label htmlFor="company_id">
                                        Company <span className="text-red-500">*</span>
                                    </Label>
                                    <select
                                        id="company_id"
                                        name="company_id"
                                        value={data.company_id}
                                        onChange={(e) => setData('company_id', e.target.value)}
                                        className="w-full rounded-md border px-3 py-2"
                                        required
                                    >
                                        <option value="">Select a company</option>
                                        {companies.map((company) => (
                                            <option key={company.id} value={String(company.id)}>
                                                {company.name}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.company_id && (
                                        <p className="text-sm text-red-500">{errors.company_id}</p>
                                    )}
                                </div>
                            )}

                                <FormField
                                    label="Full Name"
                                    name="full_name"
                                    value={data.full_name}
                                    onChange={(e) => setData('full_name', e.target.value)}
                                    error={errors.full_name}
                                    required
                                />

                            <FormField
                                label="Phone"
                                name="phone"
                                value={data.phone}
                                onChange={(e) => setData('phone', e.target.value)}
                                error={errors.phone}
                                required
                            />

                            <FormField
                                label="WhatsApp Phone"
                                name="whatsapp_phone"
                                value={data.whatsapp_phone}
                                onChange={(e) => setData('whatsapp_phone', e.target.value)}
                                error={errors.whatsapp_phone}
                            />

                            <FormField
                                label="Email"
                                name="email"
                                type="email"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                error={errors.email}
                            />

                            <div className="md:col-span-2 flex items-center space-x-2">
                                <Checkbox
                                    id="confirm_duplicate_edit"
                                    checked={confirmDuplicate}
                                    onCheckedChange={(checked) => setConfirmDuplicate(checked as boolean)}
                                />
                                <Label htmlFor="confirm_duplicate_edit" className="text-sm font-normal cursor-pointer">
                                    Confirm Duplicate
                                </Label>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <h2 className="mb-4 text-lg font-semibold">Additional Information</h2>
                        <div className="grid gap-4 md:grid-cols-2">
                            {/* Riding Company field is hidden in edit mode */}

                            <div>
                                <Label htmlFor="campaign_id">Campaign</Label>
                                <select
                                    id="campaign_id"
                                    name="campaign_id"
                                    value={data.campaign_id}
                                    onChange={(e) => setData('campaign_id', e.target.value)}
                                    className="w-full rounded-md border px-3 py-2"
                                >
                                    <option value="">Select a campaign</option>
                                    {campaigns.map((campaign) => (
                                        <option key={campaign.id} value={String(campaign.id)}>
                                            {campaign.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.campaign_id && (
                                    <p className="text-sm text-red-500">{errors.campaign_id}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="lead_source_id">Lead Source</Label>
                                <select
                                    id="lead_source_id"
                                    name="lead_source_id"
                                    value={data.lead_source_id}
                                    onChange={(e) => setData('lead_source_id', e.target.value)}
                                    className="w-full rounded-md border px-3 py-2"
                                >
                                    <option value="">Select a lead source</option>
                                    {leadSources.map((source) => (
                                        <option key={source.id} value={String(source.id)}>
                                            {source.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.lead_source_id && (
                                    <p className="text-sm text-red-500">{errors.lead_source_id}</p>
                                )}
                            </div>

                            {/* Lead Status Group with Green Border */}
                            <div className="rounded-lg border-2 border-green-500 dark:border-green-600 bg-green-100/50 dark:bg-green-900/30 p-4 grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="lead_status_id" className="font-bold text-green-700 dark:text-green-300">Lead Status <span className="text-red-500">*</span></Label>
                                    <select
                                        id="lead_status_id"
                                        name="lead_status_id"
                                        value={data.lead_status_id}
                                        onChange={(e) => setData('lead_status_id', e.target.value)}
                                        className="w-full rounded-md border px-3 py-2"
                                        required
                                    >
                                        <option value="">-- Select Lead Status (Required) --</option>
                                        {leadStatuses.map((status) => (
                                            <option key={status.id} value={String(status.id)}>
                                                {status.name}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.lead_status_id && (
                                        <p className="text-sm text-red-500">{errors.lead_status_id}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="lead_status_comment" className="font-bold text-green-700 dark:text-green-300">
                                        Feedback Comment
                                        {isFollowUpRequired() && <span className="text-red-500 ml-1">*</span>}
                                    </Label>
                                    <textarea
                                        id="lead_status_comment"
                                        name="lead_status_comment"
                                        value={data.lead_status_comment}
                                        onChange={(e) => setData('lead_status_comment', e.target.value)}
                                        className={`w-full rounded-md border px-3 py-2 ${isFollowUpRequired() && !data.lead_status_comment ? 'border-red-500' : ''}`}
                                        rows={3}
                                        placeholder="Enter lead status comment..."
                                        required={isFollowUpRequired()}
                                    />
                                    {errors.lead_status_comment && (
                                        <p className="text-sm text-red-500">{errors.lead_status_comment}</p>
                                    )}
                                    {isFollowUpRequired() && !data.lead_status_comment && !errors.lead_status_comment && (
                                        <p className="text-sm text-red-500">Feedback comment is required for this lead status.</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="cancel_reason" className="font-bold text-green-700 dark:text-green-300">
                                        Cancel Reasons
                                        {isCancelReasonRequired() && <span className="text-red-500 ml-1">*</span>}
                                    </Label>
                                    <Select
                                        value={data.cancel_reason || undefined}
                                        onValueChange={(value) => setData('cancel_reason', value || '')}
                                        required={isCancelReasonRequired()}
                                    >
                                        <SelectTrigger className={isCancelReasonRequired() && !data.cancel_reason ? 'border-red-500' : ''}>
                                            <SelectValue placeholder="Select cancel reason..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Not interested">Not interested</SelectItem>
                                            <SelectItem value="Wrong Number">Wrong Number</SelectItem>
                                            <SelectItem value="Under Age">Under Age</SelectItem>
                                            <SelectItem value="Duplicated">Duplicated</SelectItem>
                                            <SelectItem value="Wrong Documents">Wrong Documents</SelectItem>
                                            <SelectItem value="Car Not Accepted">Car Not Accepted</SelectItem>
                                            <SelectItem value="Other">Other</SelectItem>
                                            <SelectItem value="Already driver">Already driver</SelectItem>
                                            <SelectItem value="Expired">Expired</SelectItem>
                                            <SelectItem value="Cities">Cities</SelectItem>
                                            <SelectItem value="Dont have driving license">Dont have driving license</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {errors.cancel_reason && (
                                        <p className="text-sm text-red-500">{errors.cancel_reason}</p>
                                    )}
                                    {isCancelReasonRequired() && !data.cancel_reason && !errors.cancel_reason && (
                                        <p className="text-sm text-red-500">Cancel reason is required for this lead status.</p>
                                    )}
                                </div>

                                <div className="col-span-2">
                                    <Label 
                                        htmlFor="next_follow_up" 
                                        className="font-bold text-green-700 dark:text-green-300 block mb-1"
                                    >
                                        Next Follow-up
                                        {isFollowUpRequired() && <span className="text-red-500 ml-1">*</span>}
                                    </Label>
                                    <div className="flex gap-2 items-center">
                                        {/* Date Input (Hidden) */}
                                        <input
                                            type="date"
                                            id="edit-next-follow-up-date"
                                            value={data.next_follow_up ? (data.next_follow_up.includes('T') ? data.next_follow_up.split('T')[0] : data.next_follow_up) : ''}
                                            onChange={(e) => {
                                                const selectedDate = e.target.value;
                                                if (selectedDate) {
                                                    // Ensure selected date is today or future
                                                    const today = new Date();
                                                    today.setHours(0, 0, 0, 0);
                                                    const selected = new Date(selectedDate);
                                                    selected.setHours(0, 0, 0, 0);
                                                    
                                                    // If selected date is before today, use today instead
                                                    if (selected < today) {
                                                        const todayStr = today.toISOString().split('T')[0];
                                                        // Use current time
                                                        const now = new Date();
                                                        const hours = String(now.getHours()).padStart(2, '0');
                                                        const minutes = String(now.getMinutes()).padStart(2, '0');
                                                        setData('next_follow_up', `${todayStr}T${hours}:${minutes}`);
                                                        return;
                                                    }
                                                    
                                                    // Use current time when selecting a new date
                                                    const now = new Date();
                                                    const hours = String(now.getHours()).padStart(2, '0');
                                                    const minutes = String(now.getMinutes()).padStart(2, '0');
                                                    setData('next_follow_up', `${selectedDate}T${hours}:${minutes}`);
                                                } else {
                                                    setData('next_follow_up', '');
                                                }
                                            }}
                                            min={(() => {
                                                const today = new Date();
                                                const year = today.getFullYear();
                                                const month = String(today.getMonth() + 1).padStart(2, '0');
                                                const day = String(today.getDate()).padStart(2, '0');
                                                return `${year}-${month}-${day}`;
                                            })()}
                                            className="absolute opacity-0 pointer-events-none"
                                            required={isFollowUpRequired()}
                                        />
                                        {/* Time Input (Hidden) */}
                                        <input
                                            type="time"
                                            id="edit-next-follow-up-time"
                                            value={data.next_follow_up && data.next_follow_up.includes('T') 
                                                ? data.next_follow_up.split('T')[1].slice(0, 5) 
                                                : '00:00'}
                                            onChange={(e) => {
                                                const selectedTime = e.target.value;
                                                const existingDate = data.next_follow_up && data.next_follow_up.includes('T')
                                                    ? data.next_follow_up.split('T')[0]
                                                    : (data.next_follow_up || new Date().toISOString().split('T')[0]);
                                                setData('next_follow_up', `${existingDate}T${selectedTime}`);
                                            }}
                                            onFocus={() => setTimeEditingState('hours')}
                                            onBlur={() => {
                                                // Delay to allow time picker to close
                                                setTimeout(() => setTimeEditingState(null), 300);
                                            }}
                                            onInput={(e) => {
                                                // Track which part is being edited
                                                const timeInput = e.target as HTMLInputElement;
                                                const currentTime = timeInput.value;
                                                const prevTime = data.next_follow_up && data.next_follow_up.includes('T')
                                                    ? data.next_follow_up.split('T')[1].slice(0, 5)
                                                    : '00:00';
                                                
                                                if (prevTime && currentTime) {
                                                    const [currentHours, currentMinutes] = currentTime.split(':').map(Number);
                                                    const [prevHours, prevMinutes] = prevTime.split(':').map(Number);
                                                    
                                                    if (currentHours !== prevHours) {
                                                        setTimeEditingState('hours');
                                                    } else if (currentMinutes !== prevMinutes) {
                                                        setTimeEditingState('minutes');
                                                    }
                                                }
                                            }}
                                            className="absolute opacity-0 pointer-events-none"
                                        />
                                        {/* Display */}
                                        <div className={`flex-1 rounded-md border px-3 py-2 bg-white dark:bg-neutral-800 flex items-center gap-2 ${isFollowUpRequired() && !data.next_follow_up ? 'border-red-500' : 'border-neutral-300 dark:border-neutral-600'}`}>
                                            {data.next_follow_up ? (() => {
                                                const date = new Date(data.next_follow_up);
                                                const day = String(date.getDate()).padStart(2, '0');
                                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                                const year = date.getFullYear();
                                                let hours = date.getHours();
                                                const minutes = String(date.getMinutes()).padStart(2, '0');
                                                const ampm = hours >= 12 ? 'PM' : 'AM';
                                                hours = hours % 12;
                                                hours = hours ? hours : 12;
                                                const formattedHours = String(hours).padStart(2, '0');
                                                return (
                                                    <>
                                                        <span 
                                                            className="cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                                                            onClick={() => {
                                                                const dateInput = document.getElementById('edit-next-follow-up-date') as HTMLInputElement;
                                                                if (dateInput) {
                                                                    dateInput.showPicker?.() || dateInput.focus();
                                                                }
                                                            }}
                                                        >
                                                            {day}
                                                        </span>
                                                        <span 
                                                            className="cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                                                            onClick={() => {
                                                                const dateInput = document.getElementById('edit-next-follow-up-date') as HTMLInputElement;
                                                                if (dateInput) {
                                                                    dateInput.showPicker?.() || dateInput.focus();
                                                                }
                                                            }}
                                                        >
                                                            -
                                                        </span>
                                                        <span 
                                                            className="cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                                                            onClick={() => {
                                                                const dateInput = document.getElementById('edit-next-follow-up-date') as HTMLInputElement;
                                                                if (dateInput) {
                                                                    dateInput.showPicker?.() || dateInput.focus();
                                                                }
                                                            }}
                                                        >
                                                            {month}
                                                        </span>
                                                        <span 
                                                            className="cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                                                            onClick={() => {
                                                                const dateInput = document.getElementById('edit-next-follow-up-date') as HTMLInputElement;
                                                                if (dateInput) {
                                                                    dateInput.showPicker?.() || dateInput.focus();
                                                                }
                                                            }}
                                                        >
                                                            -
                                                        </span>
                                                        <span 
                                                            className="cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                                                            onClick={() => {
                                                                const dateInput = document.getElementById('edit-next-follow-up-date') as HTMLInputElement;
                                                                if (dateInput) {
                                                                    dateInput.showPicker?.() || dateInput.focus();
                                                                }
                                                            }}
                                                        >
                                                            {year}
                                                        </span>
                                                        <span className="mx-2 text-neutral-400">|</span>
                                                        <span 
                                                            className={`cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${
                                                                timeEditingState === 'hours' 
                                                                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-1 rounded' 
                                                                    : ''
                                                            }`}
                                                            onClick={() => {
                                                                setTimeEditingState('hours');
                                                                const timeInput = document.getElementById('edit-next-follow-up-time') as HTMLInputElement;
                                                                if (timeInput) {
                                                                    timeInput.showPicker?.() || timeInput.focus();
                                                                }
                                                            }}
                                                        >
                                                            {formattedHours}
                                                        </span>
                                                        <span className="text-neutral-400">:</span>
                                                        <span 
                                                            className={`cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${
                                                                timeEditingState === 'minutes' 
                                                                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-1 rounded' 
                                                                    : ''
                                                            }`}
                                                            onClick={() => {
                                                                setTimeEditingState('minutes');
                                                                const timeInput = document.getElementById('edit-next-follow-up-time') as HTMLInputElement;
                                                                if (timeInput) {
                                                                    timeInput.showPicker?.() || timeInput.focus();
                                                                }
                                                            }}
                                                        >
                                                            {minutes}
                                                        </span>
                                                        <Select
                                                            value={ampm}
                                                        onValueChange={(value) => {
                                                            const date = new Date(data.next_follow_up);
                                                            let hours = date.getHours();
                                                            const minutes = date.getMinutes();
                                                            const currentHours12 = hours % 12 || 12; // Convert to 12-hour format
                                                            
                                                            if (value === 'PM' && ampm === 'AM') {
                                                                // Convert from AM to PM
                                                                if (currentHours12 === 12) {
                                                                    hours = 12; // 12 AM -> 12 PM (noon)
                                                                } else {
                                                                    hours = currentHours12 + 12; // 1-11 AM -> 1-11 PM
                                                                }
                                                            } else if (value === 'AM' && ampm === 'PM') {
                                                                // Convert from PM to AM
                                                                if (currentHours12 === 12) {
                                                                    hours = 0; // 12 PM -> 12 AM (midnight)
                                                                } else {
                                                                    hours = currentHours12; // 1-11 PM -> 1-11 AM
                                                                }
                                                            }
                                                            
                                                            // Use local date/time instead of UTC to avoid timezone issues
                                                            const year = date.getFullYear();
                                                            const month = String(date.getMonth() + 1).padStart(2, '0');
                                                            const day = String(date.getDate()).padStart(2, '0');
                                                            const dateStr = `${year}-${month}-${day}`;
                                                            const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
                                                            setData('next_follow_up', `${dateStr}T${timeStr}`);
                                                        }}
                                                        >
                                                            <SelectTrigger className="h-auto py-0 px-2 border-0 bg-transparent shadow-none hover:bg-blue-50 dark:hover:bg-blue-900/20">
                                                                <SelectValue>{ampm}</SelectValue>
                                                            </SelectTrigger>
                                                            <SelectContent side="top" sideOffset={4}>
                                                                <SelectItem value="AM">AM</SelectItem>
                                                                <SelectItem value="PM">PM</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </>
                                                );
                                            })() : (
                                                <span 
                                                    className="text-neutral-400 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                                                    onClick={() => {
                                                        // Try date first, if fails try time
                                                        const dateInput = document.getElementById('edit-next-follow-up-date') as HTMLInputElement;
                                                        if (dateInput) {
                                                            dateInput.showPicker?.() || dateInput.focus();
                                                        } else {
                                                            const timeInput = document.getElementById('edit-next-follow-up-time') as HTMLInputElement;
                                                            if (timeInput) {
                                                                timeInput.showPicker?.() || timeInput.focus();
                                                            }
                                                        }
                                                    }}
                                                >
                                                    dd-mm-yyyy | hh:mm AM/PM
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {errors.next_follow_up && (
                                        <p className="text-sm text-red-500">{errors.next_follow_up}</p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="last_follow_up">Last Follow-up</Label>
                                <input
                                    type="date"
                                    id="last_follow_up"
                                    name="last_follow_up"
                                    value={data.last_follow_up}
                                    disabled
                                    className="w-full rounded-md border px-3 py-2 bg-neutral-100 dark:bg-neutral-800 cursor-not-allowed"
                                />
                                <p className="text-xs text-neutral-500 mt-1">Read-only: Automatically updated</p>
                            </div>

                            <div>
                                <Label htmlFor="lead_stage_id">Lead Stage</Label>
                                <select
                                    id="lead_stage_id"
                                    name="lead_stage_id"
                                    value={data.lead_stage_id}
                                    onChange={(e) => setData('lead_stage_id', e.target.value)}
                                    className="w-full rounded-md border px-3 py-2"
                                    disabled={loadingLeadStages || !data.riding_company_id}
                                >
                                    <option value="">
                                        {loadingLeadStages
                                            ? 'Loading...'
                                            : !data.riding_company_id
                                              ? 'Select a riding company first'
                                              : 'Select a lead stage'}
                                    </option>
                                    {leadStages.map((stage) => (
                                        <option key={stage.id} value={String(stage.id)}>
                                            {stage.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.lead_stage_id && (
                                    <p className="text-sm text-red-500">{errors.lead_stage_id}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="assigned_to">
                                    Assigned To <span className="text-red-500">*</span>
                                </Label>
                                <Select
                                    value={data.assigned_to ? String(data.assigned_to) : undefined}
                                    onValueChange={(value) => {
                                        if (value === 'none') {
                                            setData('assigned_to', null);
                                        } else {
                                            setData('assigned_to', Number(value));
                                        }
                                    }}
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue placeholder="Select user..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">-- None --</SelectItem>
                                        {users.map((user) => (
                                            <SelectItem key={user.id} value={String(user.id)}>
                                                {user.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.assigned_to && (
                                    <p className="text-sm text-red-500 mt-1">{errors.assigned_to}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="notes">Notes</Label>
                                <textarea
                                    id="notes"
                                    name="notes"
                                    value={data.notes}
                                    onChange={(e) => setData('notes', e.target.value)}
                                    className="w-full rounded-md border px-3 py-2"
                                    rows={3}
                                />
                                {errors.notes && (
                                    <p className="text-sm text-red-500">{errors.notes}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="vehicle_type">Vehicle Type</Label>
                                <input
                                    type="text"
                                    id="vehicle_type"
                                    name="vehicle_type"
                                    value={data.vehicle_type}
                                    onChange={(e) => setData('vehicle_type', e.target.value)}
                                    className="w-full rounded-md border px-3 py-2"
                                    placeholder="Enter vehicle type..."
                                />
                                {errors.vehicle_type && (
                                    <p className="text-sm text-red-500">{errors.vehicle_type}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="has_worked_before">Has the driver worked before?</Label>
                                <input
                                    type="text"
                                    id="has_worked_before"
                                    name="has_worked_before"
                                    value={data.has_worked_before}
                                    onChange={(e) => setData('has_worked_before', e.target.value)}
                                    className="w-full rounded-md border px-3 py-2"
                                    placeholder="Enter information about previous work experience..."
                                />
                                {errors.has_worked_before && (
                                    <p className="text-sm text-red-500">{errors.has_worked_before}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="governorate">Governorate</Label>
                                <Select
                                    value={data.governorate || undefined}
                                    onValueChange={(value) => setData('governorate', value || '')}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select governorate..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {EGYPT_GOVERNORATES.map((gov) => (
                                            <SelectItem key={gov} value={gov}>
                                                {gov}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.governorate && (
                                    <p className="text-sm text-red-500">{errors.governorate}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="feedback_count">Feedback Count</Label>
                                <input
                                    type="number"
                                    id="feedback_count"
                                    name="feedback_count"
                                    value={data.feedback_count || 0}
                                    disabled
                                    className="w-full rounded-md border px-3 py-2 bg-neutral-100 dark:bg-neutral-800 cursor-not-allowed"
                                />
                                <p className="text-xs text-neutral-500 mt-1">Read-only: Automatically incremented when lead status is updated</p>
                                {errors.feedback_count && (
                                    <p className="text-sm text-red-500">{errors.feedback_count}</p>
                                )}
                            </div>
                        </div>
                    </Card>

                    <div className="flex justify-end gap-4">
                        <Link href="/drivers/drivers">
                            <Button type="button" variant="outline">
                                Cancel
                            </Button>
                        </Link>
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Updating...' : 'Update Driver'}
                        </Button>
                    </div>
                </form>

                {/* Reassign Dialog */}
                <Dialog open={showReassignDialog} onOpenChange={setShowReassignDialog}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Select Fields to Clear on Reassign</DialogTitle>
                            <DialogDescription>
                                Please select the fields that should be cleared or reset to default values when transferring this lead to the new user.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-3 py-4">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="clear_feedback_comment"
                                    checked={clearFieldsOnReassign.has('lead_status_comment')}
                                    onCheckedChange={(checked) => toggleClearField('lead_status_comment', checked as boolean)}
                                />
                                <Label htmlFor="clear_feedback_comment" className="text-sm font-normal cursor-pointer">
                                    Feedback Comment
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="clear_next_follow_up"
                                    checked={clearFieldsOnReassign.has('next_follow_up')}
                                    onCheckedChange={(checked) => toggleClearField('next_follow_up', checked as boolean)}
                                />
                                <Label htmlFor="clear_next_follow_up" className="text-sm font-normal cursor-pointer">
                                    Next Follow-up
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="clear_last_follow_up"
                                    checked={clearFieldsOnReassign.has('last_follow_up')}
                                    onCheckedChange={(checked) => toggleClearField('last_follow_up', checked as boolean)}
                                />
                                <Label htmlFor="clear_last_follow_up" className="text-sm font-normal cursor-pointer">
                                    Last Follow-up
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="clear_cancel_reason"
                                    checked={clearFieldsOnReassign.has('cancel_reason')}
                                    onCheckedChange={(checked) => toggleClearField('cancel_reason', checked as boolean)}
                                />
                                <Label htmlFor="clear_cancel_reason" className="text-sm font-normal cursor-pointer">
                                    Cancel Reason
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="clear_lead_stage"
                                    checked={clearFieldsOnReassign.has('lead_stage_id')}
                                    onCheckedChange={(checked) => toggleClearField('lead_stage_id', checked as boolean)}
                                />
                                <Label htmlFor="clear_lead_stage" className="text-sm font-normal cursor-pointer">
                                    Lead Stage
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="set_lead_status_new"
                                    checked={setLeadStatusToNew}
                                    onCheckedChange={(checked) => setSetLeadStatusToNew(checked as boolean)}
                                />
                                <Label htmlFor="set_lead_status_new" className="text-sm font-normal cursor-pointer">
                                    Lead Status (Set to New)
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="clear_notes"
                                    checked={clearFieldsOnReassign.has('notes')}
                                    onCheckedChange={(checked) => toggleClearField('notes', checked as boolean)}
                                />
                                <Label htmlFor="clear_notes" className="text-sm font-normal cursor-pointer">
                                    Notes
                                </Label>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={handleReassignDialogCancel}>
                                Cancel
                            </Button>
                            <Button onClick={handleReassignDialogConfirm}>
                                Continue
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}

