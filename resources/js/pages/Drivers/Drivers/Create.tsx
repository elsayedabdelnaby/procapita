import { FormField } from '@/components/core/form-field';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MultiSelect } from '@/components/ui/multi-select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, useForm, usePage, router } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { type SharedData } from '@/types';
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

interface DriversCreateProps {
    companies?: Company[];
    ridingCompanies: RidingCompany[];
    campaigns: Campaign[];
    leadSources: LeadSource[];
    leadStatuses: LeadStatus[];
    users: User[];
    defaultRidingCompanyId?: number;
}

export default function DriversCreate({
    companies,
    ridingCompanies: initialRidingCompanies = [],
    campaigns: initialCampaigns = [],
    leadSources: initialLeadSources = [],
    leadStatuses: initialLeadStatuses = [],
    users: initialUsers = [],
    defaultRidingCompanyId,
}: DriversCreateProps) {
    const page = usePage<SharedData>();
    const selectedCompany = (page.props as any)?.selectedCompany || null;
    const auth = (page.props as any).auth;
    const currentUser = auth?.user;
    const isAdmin = currentUser?.is_super_admin || currentUser?.is_company_admin || false;
    
    const [ridingCompanies, setRidingCompanies] = useState<RidingCompany[]>(initialRidingCompanies || []);
    const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns || []);
    const [leadSources, setLeadSources] = useState<LeadSource[]>(initialLeadSources || []);
    const [leadStatuses, setLeadStatuses] = useState<LeadStatus[]>(initialLeadStatuses || []);
    const [leadStages, setLeadStages] = useState<LeadStage[]>([]);
    const [users, setUsers] = useState<User[]>(initialUsers || []);

    const [loadingRidingCompanies, setLoadingRidingCompanies] = useState(false);
    const [loadingCampaigns, setLoadingCampaigns] = useState(false);
    const [loadingLeadSources, setLoadingLeadSources] = useState(false);
    const [loadingLeadStatuses, setLoadingLeadStatuses] = useState(false);
    const [loadingLeadStages, setLoadingLeadStages] = useState(false);
    const [loadingUsers, setLoadingUsers] = useState(false);

    const { data, setData, post, processing, errors } = useForm({
        company_id: selectedCompany ? String(selectedCompany.id) : '',
        full_name: '',
        phone: '',
        whatsapp_phone: '',
        email: '',
        riding_company_id: defaultRidingCompanyId ? String(defaultRidingCompanyId) : '',
        campaign_id: '',
        lead_source_id: '',
        lead_status_id: '',
        lead_status_comment: '',
        next_follow_up: '',
        last_follow_up: '',
        lead_stage_id: '',
        current_stage_id: '',
        notes: '',
        cancel_reason: '',
        feedback_count: 0,
        vehicle_type: '',
        has_worked_before: '',
        governorate: '',
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

    // Auto-set next_follow_up based on lead status
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
            }
        }
    }, [data.lead_status_id, leadStatuses, setData]);

    // Update company_id when selectedCompany changes
    useEffect(() => {
        if (selectedCompany?.id) {
            setData('company_id', String(selectedCompany.id));
        }
    }, [selectedCompany?.id, setData]);

    // Reset dependent fields when company changes
    useEffect(() => {
        const companyId = selectedCompany ? selectedCompany.id : (data.company_id ? Number(data.company_id) : null);
        
        if (companyId) {
            // Reset dependent fields when company changes (but keep default riding company)
            if (!defaultRidingCompanyId) {
            setData('riding_company_id', '');
            }
            setData('campaign_id', '');
            setData('lead_source_id', '');
            setData('lead_status_id', '');
            setData('lead_stage_id', '');
        }
    }, [selectedCompany?.id, data.company_id, setData, defaultRidingCompanyId]);

    // Fetch data when company/selectedCompany changes (for super admin)
    useEffect(() => {
        const companyId = selectedCompany ? selectedCompany.id : (data.company_id ? Number(data.company_id) : null);
        
        if (companies) {
            // Fetch riding companies
            setLoadingRidingCompanies(true);
            
            // If "All Companies" is selected (selectedCompany is null and no company_id), load all riding companies
            if (!selectedCompany && !data.company_id) {
                axios
                    .get('/api/drivers/riding-companies/all')
                    .then((response) => {
                        setRidingCompanies(response.data);
                        setData('riding_company_id', '');
                    })
                    .catch((error) => {
                        console.error('Error fetching all riding companies:', error);
                        setRidingCompanies([]);
                    })
                    .finally(() => {
                        setLoadingRidingCompanies(false);
                    });
            } else if (companyId) {
                axios
                    .get(`/api/drivers/companies/${companyId}/riding-companies`)
                    .then((response) => {
                        setRidingCompanies(response.data);
                        setData('riding_company_id', '');
                    })
                    .catch((error) => {
                        console.error('Error fetching riding companies:', error);
                        setRidingCompanies([]);
                    })
                    .finally(() => {
                        setLoadingRidingCompanies(false);
                    });
            } else {
                setRidingCompanies([]);
                setData('riding_company_id', '');
                setLoadingRidingCompanies(false);
            }
            
            if (companyId) {
                // Fetch campaigns
                setLoadingCampaigns(true);
                axios
                    .get(`/api/drivers/companies/${companyId}/campaigns`)
                    .then((response) => {
                        setCampaigns(response.data);
                        setData('campaign_id', '');
                    })
                    .catch((error) => {
                        console.error('Error fetching campaigns:', error);
                        setCampaigns([]);
                    })
                    .finally(() => {
                        setLoadingCampaigns(false);
                    });

                // Fetch lead sources
                setLoadingLeadSources(true);
                axios
                    .get(`/api/drivers/companies/${companyId}/lead-sources`)
                    .then((response) => {
                        setLeadSources(response.data);
                        setData('lead_source_id', '');
                    })
                    .catch((error) => {
                        console.error('Error fetching lead sources:', error);
                        setLeadSources([]);
                    })
                    .finally(() => {
                        setLoadingLeadSources(false);
                    });

                // Fetch lead statuses
                setLoadingLeadStatuses(true);
                axios
                    .get(`/api/drivers/companies/${companyId}/lead-statuses`)
                    .then((response) => {
                        setLeadStatuses(response.data);
                        setData('lead_status_id', '');
                    })
                    .catch((error) => {
                        console.error('Error fetching lead statuses:', error);
                        setLeadStatuses([]);
                    })
                    .finally(() => {
                        setLoadingLeadStatuses(false);
                    });

                // Fetch users
                setLoadingUsers(true);
                axios
                    .get(`/api/drivers/companies/${companyId}/users`)
                    .then((response) => {
                        setUsers(response.data);
                    })
                    .catch((error) => {
                        console.error('Error fetching users:', error);
                        setUsers([]);
                    })
                    .finally(() => {
                        setLoadingUsers(false);
                    });
            }
        } else if (!companies) {
            // If not super admin, keep initial data
            setRidingCompanies(initialRidingCompanies || []);
            setCampaigns(initialCampaigns || []);
            setLeadSources(initialLeadSources || []);
            setLeadStatuses(initialLeadStatuses || []);
            setUsers(initialUsers || []);
        }
    }, [selectedCompany?.id, data.company_id, companies, setData, initialRidingCompanies, initialCampaigns, initialLeadSources, initialLeadStatuses, initialUsers]);

    // Fetch lead stages when riding company changes
    useEffect(() => {
        if (data.riding_company_id) {
            setLoadingLeadStages(true);
            axios
                .get(`/api/drivers/riding-companies/${data.riding_company_id}/lead-stages`)
                .then((response) => {
                    setLeadStages(response.data);
                    setData('lead_stage_id', ''); // Reset lead_stage_id when riding company changes
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
    }, [data.riding_company_id, setData]);

    const [showValidation, setShowValidation] = useState(false);
    const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
    const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
    const [duplicateDrivers, setDuplicateDrivers] = useState<Array<{id: number; full_name: string; phone?: string; whatsapp_phone?: string}>>([]);
    const [viewDriverDialogOpen, setViewDriverDialogOpen] = useState(false);
    const [viewingDriverId, setViewingDriverId] = useState<number | null>(null);
    const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
    const [mergeDrivers, setMergeDrivers] = useState<any[]>([]);
    const [confirmDuplicate, setConfirmDuplicate] = useState(false);
    const [allowDuplicate, setAllowDuplicate] = useState(false); // Checkbox for allowing duplicate creation
    const [timeEditingState, setTimeEditingState] = useState<'hours' | 'minutes' | null>(null); // For time editing state

    // Check if required fields are filled
    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        
        if (!data.full_name.trim()) {
            newErrors.full_name = 'Full name is required.';
        }
        if (!data.phone.trim()) {
            newErrors.phone = 'Phone is required.';
        }
        if (!data.lead_status_id) {
            newErrors.lead_status_id = 'Lead status is required.';
        }
        if (!data.assigned_to) {
            newErrors.assigned_to = 'Please select an agent.';
        }
        
        setClientErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setShowValidation(true);
        
        // Validate form before submitting
        const isValid = validateForm();
        console.log('Form validation:', { isValid, data, clientErrors });
        
        // Only submit if form is valid
        if (!isValid) {
            console.log('Form is invalid, not submitting');
            return;
        }
        
        console.log('Form is valid, submitting...');
        
        // If allowDuplicate is checked, use router.post with force_create flag
        if (allowDuplicate) {
            router.post('/drivers/drivers', {
                ...data,
                force_create: true,
            }, {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    router.visit('/drivers/drivers');
                },
                onError: (errors) => {
                    console.error('Error creating driver:', errors);
                },
            });
        } else {
            // Normal submission without force_create
            post('/drivers/drivers', {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    // Success handled by Inertia
                },
            });
        }
    };

    const handleAddAsNew = () => {
        setDuplicateDialogOpen(false);
        // Force create by adding a flag in the request
        router.post('/drivers/drivers', {
            ...data,
            force_create: true,
        }, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                router.visit('/drivers/drivers');
            },
        });
    };

    const handleMerge = async () => {
        setDuplicateDialogOpen(false);
        setConfirmDuplicate(false);
        // Fetch full details of duplicate drivers for merge
        if (!duplicateDrivers || duplicateDrivers.length === 0) {
            alert('No duplicate drivers to merge.');
            return;
        }
        const duplicateIds = duplicateDrivers.map(d => d.id).filter(id => id);
        if (duplicateIds.length === 0) {
            alert('No valid duplicate driver IDs found.');
            return;
        }
        try {
            const responses = await Promise.all(
                duplicateIds.map(id => 
                    axios.get(`/drivers/drivers/${id}/details`)
                )
            );
            const fullDuplicateDrivers = responses.map(res => res.data?.driver).filter(Boolean);
            
            // Prepare merge data - include current form data as a "new" driver
            const newDriverData = {
                id: 0, // Temporary ID for new driver
                full_name: data.full_name,
                phone: data.phone,
                whatsapp_phone: data.whatsapp_phone,
                email: data.email,
                riding_company_id: data.riding_company_id,
                campaign_id: data.campaign_id,
                lead_source_id: data.lead_source_id,
                lead_status_id: data.lead_status_id,
                lead_stage_id: data.lead_stage_id,
                assigned_to: data.assigned_to,
                lead_status_comment: data.lead_status_comment,
                next_follow_up: data.next_follow_up,
                last_follow_up: data.last_follow_up,
                notes: data.notes,
                cancel_reason: data.cancel_reason,
                created_at: null, // New driver, no created_at yet
            };
            setMergeDrivers([newDriverData, ...fullDuplicateDrivers]);
            setMergeDialogOpen(true);
        } catch (error) {
            console.error('Error fetching duplicate driver details:', error);
            alert('Failed to load duplicate driver details. Please try again.');
        }
    };

    const handleViewDriver = async (driverId: number) => {
        setViewingDriverId(driverId);
        setViewDriverDialogOpen(true);
    };

    // Check for duplicates in page props when component loads
    useEffect(() => {
        const pageProps = page.props as any;
        if (pageProps?.duplicates_found || pageProps?.duplicate_drivers) {
            const duplicates = Array.isArray(pageProps.duplicate_drivers) 
                ? pageProps.duplicate_drivers 
                : (pageProps.duplicate_drivers ? [pageProps.duplicate_drivers] : []);
            if (duplicates.length > 0) {
                setDuplicateDrivers(duplicates);
                setDuplicateDialogOpen(true);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <AppLayout>
            <Head title="Create Driver" />

            <div className="p-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold">Create Driver</h1>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        Add a new driver to the system
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
                            {companies && companies.length > 0 && !selectedCompany && (
                                <div className="md:col-span-2">
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
                                            <option key={company.id} value={company.id}>
                                                {company.name}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.company_id && (
                                        <p className="text-sm text-red-500">{errors.company_id}</p>
                                    )}
                                </div>
                            )}
                            {selectedCompany && (
                                <input type="hidden" name="company_id" value={selectedCompany.id} />
                            )}

                            <div className="md:col-span-2">
                                <div className="space-y-2">
                                    <Label htmlFor="full_name" className="flex items-center gap-2">
                                        Full Name <span className="text-red-500">*</span>
                                        {!data.full_name && (
                                            <span className="text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-0.5 rounded">Required</span>
                                        )}
                                    </Label>
                                <FormField
                                        label=""
                                    name="full_name"
                                    value={data.full_name}
                                    onChange={(e) => setData('full_name', e.target.value)}
                                    error={errors.full_name}
                                    placeholder="e.g., John Doe"
                                        className={showValidation && !data.full_name ? 'ring-2 ring-yellow-400 bg-yellow-50 dark:bg-yellow-900/20' : ''}
                                />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone" className="flex items-center gap-2">
                                    Phone <span className="text-red-500">*</span>
                                    {!data.phone && (
                                        <span className="text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-0.5 rounded">Required</span>
                                    )}
                                </Label>
                            <FormField
                                    label=""
                                name="phone"
                                value={data.phone}
                                onChange={(e) => setData('phone', e.target.value)}
                                error={errors.phone}
                                    className={showValidation && !data.phone ? 'ring-2 ring-yellow-400 bg-yellow-50 dark:bg-yellow-900/20' : ''}
                                required
                                placeholder="+1234567890"
                            />
                            </div>

                            <FormField
                                label="WhatsApp Phone"
                                name="whatsapp_phone"
                                value={data.whatsapp_phone}
                                onChange={(e) => setData('whatsapp_phone', e.target.value)}
                                error={errors.whatsapp_phone}
                                placeholder="+1234567890"
                            />

                            <FormField
                                label="Email"
                                name="email"
                                type="email"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                error={errors.email}
                                placeholder="driver@example.com"
                            />

                            <div className="md:col-span-2 flex items-center space-x-2">
                                <Checkbox
                                    id="confirm_duplicate_basic"
                                    checked={confirmDuplicate}
                                    onCheckedChange={(checked) => setConfirmDuplicate(checked as boolean)}
                                />
                                <Label htmlFor="confirm_duplicate_basic" className="text-sm font-normal cursor-pointer">
                                    Confirm Duplicate
                                </Label>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <h2 className="mb-4 text-lg font-semibold">Additional Information</h2>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <Label htmlFor="riding_company_id">
                                    Riding Company <span className="text-red-500">*</span>
                                </Label>
                                <select
                                    id="riding_company_id"
                                    name="riding_company_id"
                                    value={data.riding_company_id}
                                    onChange={(e) => setData('riding_company_id', e.target.value)}
                                    className="w-full rounded-md border px-3 py-2"
                                    disabled={loadingRidingCompanies || (companies && !data.company_id)}
                                    required
                                >
                                    <option value="">
                                        {loadingRidingCompanies
                                            ? 'Loading...'
                                            : companies && !data.company_id
                                              ? 'Select a company first'
                                              : 'Select a riding company'}
                                    </option>
                                    {ridingCompanies.map((company) => (
                                        <option key={company.id} value={company.id}>
                                            {company.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.riding_company_id && (
                                    <p className="text-sm text-red-500">{errors.riding_company_id}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="campaign_id">Campaign</Label>
                                <select
                                    id="campaign_id"
                                    name="campaign_id"
                                    value={data.campaign_id}
                                    onChange={(e) => setData('campaign_id', e.target.value)}
                                    className="w-full rounded-md border px-3 py-2"
                                    disabled={loadingCampaigns || (companies && !data.company_id)}
                                >
                                    <option value="">
                                        {loadingCampaigns
                                            ? 'Loading...'
                                            : companies && !data.company_id
                                              ? 'Select a company first'
                                              : 'Select a campaign'}
                                    </option>
                                    {campaigns.map((campaign) => (
                                        <option key={campaign.id} value={campaign.id}>
                                            {campaign.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.campaign_id && (
                                    <p className="text-sm text-red-500">{errors.campaign_id}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="lead_source_id">
                                    Lead Source <span className="text-red-500">*</span>
                                </Label>
                                <select
                                    id="lead_source_id"
                                    name="lead_source_id"
                                    value={data.lead_source_id}
                                    onChange={(e) => setData('lead_source_id', e.target.value)}
                                    className="w-full rounded-md border px-3 py-2"
                                    disabled={loadingLeadSources || (companies && !data.company_id)}
                                    required
                                >
                                    <option value="">
                                        {loadingLeadSources
                                            ? 'Loading...'
                                            : companies && !data.company_id
                                              ? 'Select a company first'
                                              : 'Select a lead source'}
                                    </option>
                                    {leadSources.map((source) => (
                                        <option key={source.id} value={source.id}>
                                            {source.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.lead_source_id && (
                                    <p className="text-sm text-red-500">{errors.lead_source_id}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="lead_status_id">
                                    Lead Status <span className="text-red-500">*</span>
                                </Label>
                                <select
                                    id="lead_status_id"
                                    name="lead_status_id"
                                    value={data.lead_status_id}
                                    onChange={(e) => setData('lead_status_id', e.target.value)}
                                    className="w-full rounded-md border px-3 py-2"
                                    disabled={loadingLeadStatuses || (companies && !data.company_id)}
                                    required
                                >
                                    <option value="">
                                        {loadingLeadStatuses
                                            ? 'Loading...'
                                            : companies && !data.company_id
                                              ? 'Select a company first'
                                              : 'Select a lead status'}
                                    </option>
                                    {leadStatuses.map((status) => (
                                        <option key={status.id} value={status.id}>
                                            {status.name}
                                        </option>
                                    ))}
                                </select>
                                {(errors.lead_status_id || clientErrors.lead_status_id) && (
                                    <p className="text-sm text-red-500">{errors.lead_status_id || clientErrors.lead_status_id}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="lead_status_comment">
                                    Feedback Comment
                                    {isFollowUpRequired() && <span className="text-red-500">*</span>}
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
                                        id="create-next-follow-up-date"
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
                                                
                                                // Keep existing time or use current time if no time exists
                                                const existingTime = data.next_follow_up && data.next_follow_up.includes('T') 
                                                    ? data.next_follow_up.split('T')[1] 
                                                    : (() => {
                                                        // Use current time as default
                                                        const now = new Date();
                                                        return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                                                    })();
                                                setData('next_follow_up', `${selectedDate}T${existingTime}`);
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
                                        id="create-next-follow-up-time"
                                        value={data.next_follow_up && data.next_follow_up.includes('T') 
                                            ? data.next_follow_up.split('T')[1].slice(0, 5) 
                                            : (() => {
                                                const now = new Date();
                                                return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                                            })()}
                                        onChange={(e) => {
                                            const selectedTime = e.target.value;
                                            const existingDate = data.next_follow_up && data.next_follow_up.includes('T')
                                                ? data.next_follow_up.split('T')[0]
                                                : (() => {
                                                    const today = new Date();
                                                    const year = today.getFullYear();
                                                    const month = String(today.getMonth() + 1).padStart(2, '0');
                                                    const day = String(today.getDate()).padStart(2, '0');
                                                    return `${year}-${month}-${day}`;
                                                })();
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
                                    <div 
                                        className={`flex-1 rounded-md border px-3 py-2 bg-white dark:bg-neutral-800 flex items-center gap-2 cursor-pointer ${isFollowUpRequired() && !data.next_follow_up ? 'border-red-500' : 'border-neutral-300 dark:border-neutral-600'}`}
                                        onClick={(e) => {
                                            // If clicking on the container, open date picker
                                            const dateInput = document.getElementById('create-next-follow-up-date') as HTMLInputElement;
                                            if (dateInput) {
                                                dateInput.showPicker?.() || dateInput.focus();
                                            }
                                        }}
                                    >
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
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const dateInput = document.getElementById('create-next-follow-up-date') as HTMLInputElement;
                                                            if (dateInput) {
                                                                dateInput.showPicker?.() || dateInput.focus();
                                                            }
                                                        }}
                                                    >
                                                        {day}
                                                    </span>
                                                    <span 
                                                        className="cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const dateInput = document.getElementById('create-next-follow-up-date') as HTMLInputElement;
                                                            if (dateInput) {
                                                                dateInput.showPicker?.() || dateInput.focus();
                                                            }
                                                        }}
                                                    >
                                                        -
                                                    </span>
                                                    <span 
                                                        className="cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const dateInput = document.getElementById('create-next-follow-up-date') as HTMLInputElement;
                                                            if (dateInput) {
                                                                dateInput.showPicker?.() || dateInput.focus();
                                                            }
                                                        }}
                                                    >
                                                        {month}
                                                    </span>
                                                    <span 
                                                        className="cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const dateInput = document.getElementById('create-next-follow-up-date') as HTMLInputElement;
                                                            if (dateInput) {
                                                                dateInput.showPicker?.() || dateInput.focus();
                                                            }
                                                        }}
                                                    >
                                                        -
                                                    </span>
                                                    <span 
                                                        className="cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const dateInput = document.getElementById('create-next-follow-up-date') as HTMLInputElement;
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
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setTimeEditingState('hours');
                                                            const timeInput = document.getElementById('create-next-follow-up-time') as HTMLInputElement;
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
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setTimeEditingState('minutes');
                                                            const timeInput = document.getElementById('create-next-follow-up-time') as HTMLInputElement;
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
                                                            const currentAmpm = hours >= 12 ? 'PM' : 'AM';
                                                            
                                                            if (value === 'PM' && currentAmpm === 'AM') {
                                                                // Convert from AM to PM
                                                                if (currentHours12 === 12) {
                                                                    hours = 12; // 12 AM -> 12 PM (noon)
                                                                } else {
                                                                    hours = currentHours12 + 12; // 1-11 AM -> 1-11 PM
                                                                }
                                                            } else if (value === 'AM' && currentAmpm === 'PM') {
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
                                                        onClick={(e) => e.stopPropagation()}
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
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    // Try date first, if fails try time
                                                    const dateInput = document.getElementById('create-next-follow-up-date') as HTMLInputElement;
                                                    if (dateInput) {
                                                        dateInput.showPicker?.() || dateInput.focus();
                                                    } else {
                                                        const timeInput = document.getElementById('create-next-follow-up-time') as HTMLInputElement;
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
                                {isFollowUpRequired() && !data.next_follow_up && !errors.next_follow_up && (
                                    <p className="text-sm text-red-500">Next follow-up is required for this lead status.</p>
                                )}
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
                                        <option key={stage.id} value={stage.id}>
                                            {stage.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.lead_stage_id && (
                                    <p className="text-sm text-red-500">{errors.lead_stage_id}</p>
                                )}
                            </div>

                            <div className="md:col-span-2">
                                <Label className="flex items-center gap-2">
                                    Assigned To <span className="text-red-500">*</span>
                                    {!data.assigned_to && (
                                        <span className="text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-0.5 rounded">Required</span>
                                    )}
                                </Label>
                                {loadingUsers ? (
                                    <div className="mt-1">
                                        <p className="text-sm text-neutral-600 dark:text-neutral-400">Loading users...</p>
                                    </div>
                                ) : users.length === 0 ? (
                                    <div className="mt-1">
                                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                            {companies && !data.company_id
                                                ? 'Select a company first'
                                                : 'No users available'}
                                        </p>
                                    </div>
                                ) : (
                                    <Select
                                        value={data.assigned_to ? String(data.assigned_to) : undefined}
                                        onValueChange={(value) => {
                                            if (value === 'none') {
                                                setData('assigned_to', null);
                                            } else {
                                                setData('assigned_to', value ? Number(value) : null);
                                            }
                                        }}
                                        disabled={loadingUsers}
                                    >
                                        <SelectTrigger className={`mt-1 ${showValidation && !data.assigned_to ? 'ring-2 ring-yellow-400 bg-yellow-50 dark:bg-yellow-900/20' : ''}`}>
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
                                )}
                                {(clientErrors.assigned_to || errors.assigned_to) && (
                                    <p className="text-sm text-red-500 mt-1">{clientErrors.assigned_to || errors.assigned_to}</p>
                                )}
                            </div>

                            <div className="md:col-span-2">
                                <Label htmlFor="notes">Notes</Label>
                                <textarea
                                    id="notes"
                                    name="notes"
                                    value={data.notes}
                                    onChange={(e) => setData('notes', e.target.value)}
                                    className="w-full rounded-md border px-3 py-2"
                                    rows={3}
                                    placeholder="Additional notes about the driver..."
                                />
                                {errors.notes && (
                                    <p className="text-sm text-red-500">{errors.notes}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="cancel_reason">
                                    Cancel Reasons
                                    {isCancelReasonRequired() && <span className="text-red-500">*</span>}
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

                            <div>
                                <Label htmlFor="vehicle_type">Vehicle Type</Label>
                                <FormField
                                    label=""
                                    name="vehicle_type"
                                    value={data.vehicle_type}
                                    onChange={(e) => setData('vehicle_type', e.target.value)}
                                    error={errors.vehicle_type}
                                    placeholder="Enter vehicle type..."
                                />
                            </div>

                            <div>
                                <Label htmlFor="has_worked_before">Has the driver worked before?</Label>
                                <FormField
                                    label=""
                                    name="has_worked_before"
                                    value={data.has_worked_before}
                                    onChange={(e) => setData('has_worked_before', e.target.value)}
                                    error={errors.has_worked_before}
                                    placeholder="Enter information about previous work experience..."
                                />
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
                                <FormField
                                    label=""
                                    name="feedback_count"
                                    type="number"
                                    value={String(data.feedback_count || 0)}
                                    onChange={(e) => setData('feedback_count', parseInt(e.target.value) || 0)}
                                    error={errors.feedback_count}
                                    disabled
                                    className="bg-neutral-100 dark:bg-neutral-800 cursor-not-allowed"
                                />
                                <p className="text-xs text-neutral-500 mt-1">Read-only: Automatically incremented when lead status is updated</p>
                            </div>
                        </div>
                    </Card>

                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="allow_duplicate"
                                checked={allowDuplicate}
                                onCheckedChange={(checked) => setAllowDuplicate(checked as boolean)}
                            />
                            <Label htmlFor="allow_duplicate" className="text-sm font-normal cursor-pointer">
                                Duplicate
                            </Label>
                            <span className="text-xs text-neutral-500">
                                (Allow creation even if duplicate exists)
                            </span>
                        </div>
                        <div className="flex gap-4">
                            <Link href="/drivers/drivers">
                                <Button type="button" variant="outline">
                                    Cancel
                                </Button>
                            </Link>
                            <Button type="submit" disabled={processing}>
                                {processing ? 'Creating...' : 'Create Driver'}
                            </Button>
                        </div>
                    </div>
                </form>
            </div>

            {/* Duplicate Drivers Dialog */}
            <Dialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Duplicate Phone/WhatsApp Number Found</DialogTitle>
                        <DialogDescription>
                            The phone number or WhatsApp number you entered already exists with {duplicateDrivers?.length || 0} driver{(duplicateDrivers?.length || 0) > 1 ? 's' : ''} in the system.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            {duplicateDrivers && duplicateDrivers.length > 0 ? duplicateDrivers.map((dup) => (
                                <div key={dup.id} className="flex items-center justify-between p-3 border rounded-lg">
                                    <div className="flex-1">
                                        <a
                                            href={`/drivers/drivers/${dup.id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:underline font-medium"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                handleViewDriver(dup.id);
                                            }}
                                        >
                                            {dup.full_name}
                                        </a>
                                        <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                                            Phone: {dup.phone || '-'} | WhatsApp: {dup.whatsapp_phone || '-'}
                                        </div>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleViewDriver(dup.id)}
                                    >
                                        View Details
                                    </Button>
                                </div>
                            )) : null}
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                            <Button
                                variant="outline"
                                onClick={() => setDuplicateDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="outline"
                                onClick={handleAddAsNew}
                            >
                                Add as New
                            </Button>
                            <Button
                                onClick={handleMerge}
                            >
                                Merge
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* View Driver Dialog */}
            {viewingDriverId && (
                <Dialog open={viewDriverDialogOpen} onOpenChange={setViewDriverDialogOpen}>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Driver Details</DialogTitle>
                        </DialogHeader>
                        <div className="mt-4">
                            <iframe
                                src={`/drivers/drivers/${viewingDriverId}`}
                                className="w-full h-[600px] border rounded"
                                title="Driver Details"
                            />
                        </div>
                    </DialogContent>
                </Dialog>
            )}

            {/* Merge Dialog - Similar to Show.tsx but adapted for create */}
            {mergeDialogOpen && mergeDrivers && mergeDrivers.length > 0 && (
                <Dialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen}>
                    <DialogContent className="!max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
                        <DialogHeader>
                            <DialogTitle>Merge Records In &gt; Drivers</DialogTitle>
                            <DialogDescription>
                                The primary record will be retained after the merge. You can select the column to retain the values. The other record(s) will be deleted but the related information will be merged.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex-1 overflow-y-auto">
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead className="bg-neutral-100/60 dark:bg-neutral-800/60 backdrop-blur-sm sticky top-0 z-10">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300 border-b">Fields</th>
                                            {mergeDrivers.map((driver, index) => (
                                                <th key={driver.id || `new-${index}`} className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300 border-b">
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="radio"
                                                            name="primary_record"
                                                            value={driver.id || 0}
                                                            defaultChecked={index === 0}
                                                            className="w-4 h-4"
                                                        />
                                                        {driver.id ? (
                                                            <Link href={`/drivers/drivers/${driver.id}`} className="text-blue-600 hover:underline" target="_blank">
                                                                Record #{driver.id}
                                                            </Link>
                                                        ) : (
                                                            <span className="text-blue-600">New Driver</span>
                                                        )}
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-neutral-900">
                                        {/* Full Name */}
                                        <tr className="border-b hover:bg-muted/50">
                                            <td className="px-4 py-3 text-sm font-medium">Name</td>
                                            {mergeDrivers.map((driver, idx) => (
                                                <td key={driver.id || `new-${idx}`} className="px-4 py-3 text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="radio"
                                                            name="full_name"
                                                            value={driver.id || 0}
                                                            defaultChecked={idx === 0}
                                                            className="w-4 h-4"
                                                        />
                                                        <span>{driver.full_name || '-'}</span>
                                                    </div>
                                                </td>
                                            ))}
                                        </tr>
                                        
                                        {/* Phone */}
                                        <tr className="border-b hover:bg-muted/50">
                                            <td className="px-4 py-3 text-sm font-medium">Phone</td>
                                            {mergeDrivers.map((driver, idx) => (
                                                <td key={driver.id || `new-${idx}`} className="px-4 py-3 text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="radio"
                                                            name="phone"
                                                            value={driver.id || 0}
                                                            defaultChecked={idx === 0}
                                                            className="w-4 h-4"
                                                        />
                                                        <span>{driver.phone || '-'}</span>
                                                    </div>
                                                </td>
                                            ))}
                                        </tr>
                                        
                                        {/* WhatsApp Phone */}
                                        <tr className="border-b hover:bg-muted/50">
                                            <td className="px-4 py-3 text-sm font-medium">WhatsApp</td>
                                            {mergeDrivers.map((driver, idx) => (
                                                <td key={driver.id || `new-${idx}`} className="px-4 py-3 text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="radio"
                                                            name="whatsapp_phone"
                                                            value={driver.id || 0}
                                                            defaultChecked={idx === 0}
                                                            className="w-4 h-4"
                                                        />
                                                        <span>{driver.whatsapp_phone || '-'}</span>
                                                    </div>
                                                </td>
                                            ))}
                                        </tr>
                                        
                                        {/* Email */}
                                        <tr className="border-b hover:bg-muted/50">
                                            <td className="px-4 py-3 text-sm font-medium">Email</td>
                                            {mergeDrivers.map((driver, idx) => (
                                                <td key={driver.id || `new-${idx}`} className="px-4 py-3 text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="radio"
                                                            name="email"
                                                            value={driver.id || 0}
                                                            defaultChecked={idx === 0}
                                                            className="w-4 h-4"
                                                        />
                                                        <span>{driver.email || '-'}</span>
                                                    </div>
                                                </td>
                                            ))}
                                        </tr>
                                        
                                        {/* Riding Company */}
                                        <tr className="border-b hover:bg-muted/50">
                                            <td className="px-4 py-3 text-sm font-medium">Riding Company</td>
                                            {mergeDrivers.map((driver, idx) => (
                                                <td key={driver.id || `new-${idx}`} className="px-4 py-3 text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="radio"
                                                            name="riding_company_id"
                                                            value={driver.id || 0}
                                                            defaultChecked={idx === 0}
                                                            className="w-4 h-4"
                                                        />
                                                        <span>
                                                            {driver.riding_company_id 
                                                                ? (ridingCompanies.find(c => String(c.id) === String(driver.riding_company_id))?.name || '-')
                                                                : '-'}
                                                        </span>
                                                    </div>
                                                </td>
                                            ))}
                                        </tr>
                                        
                                        {/* Campaign */}
                                        <tr className="border-b hover:bg-muted/50">
                                            <td className="px-4 py-3 text-sm font-medium">Campaign</td>
                                            {mergeDrivers.map((driver, idx) => (
                                                <td key={driver.id || `new-${idx}`} className="px-4 py-3 text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="radio"
                                                            name="campaign_id"
                                                            value={driver.id || 0}
                                                            defaultChecked={idx === 0}
                                                            className="w-4 h-4"
                                                        />
                                                        <span>
                                                            {driver.campaign_id 
                                                                ? (campaigns.find(c => String(c.id) === String(driver.campaign_id))?.name || '-')
                                                                : '-'}
                                                        </span>
                                                    </div>
                                                </td>
                                            ))}
                                        </tr>
                                        
                                        {/* Lead Source */}
                                        <tr className="border-b hover:bg-muted/50">
                                            <td className="px-4 py-3 text-sm font-medium">Lead Source</td>
                                            {mergeDrivers.map((driver, idx) => (
                                                <td key={driver.id || `new-${idx}`} className="px-4 py-3 text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="radio"
                                                            name="lead_source_id"
                                                            value={driver.id || 0}
                                                            defaultChecked={idx === 0}
                                                            className="w-4 h-4"
                                                        />
                                                        <span>
                                                            {driver.lead_source_id 
                                                                ? (leadSources.find(s => String(s.id) === String(driver.lead_source_id))?.name || '-')
                                                                : '-'}
                                                        </span>
                                                    </div>
                                                </td>
                                            ))}
                                        </tr>
                                        
                                        {/* Lead Status */}
                                        <tr className="border-b hover:bg-muted/50">
                                            <td className="px-4 py-3 text-sm font-medium">Lead Status</td>
                                            {mergeDrivers.map((driver, idx) => (
                                                <td key={driver.id || `new-${idx}`} className="px-4 py-3 text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="radio"
                                                            name="lead_status_id"
                                                            value={driver.id || 0}
                                                            defaultChecked={idx === 0}
                                                            className="w-4 h-4"
                                                        />
                                                        <span>
                                                            {driver.lead_status_id 
                                                                ? (leadStatuses.find(s => String(s.id) === String(driver.lead_status_id))?.name || '-')
                                                                : '-'}
                                                        </span>
                                                    </div>
                                                </td>
                                            ))}
                                        </tr>
                                        
                                        {/* Lead Stage */}
                                        <tr className="border-b hover:bg-muted/50">
                                            <td className="px-4 py-3 text-sm font-medium">Lead Stage</td>
                                            {mergeDrivers.map((driver, idx) => (
                                                <td key={driver.id || `new-${idx}`} className="px-4 py-3 text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="radio"
                                                            name="lead_stage_id"
                                                            value={driver.id || 0}
                                                            defaultChecked={idx === 0}
                                                            className="w-4 h-4"
                                                        />
                                                        <span>{driver.lead_stage_id || '-'}</span>
                                                    </div>
                                                </td>
                                            ))}
                                        </tr>
                                        
                                        {/* Assigned To */}
                                        <tr className="border-b hover:bg-muted/50">
                                            <td className="px-4 py-3 text-sm font-medium">Assigned To</td>
                                            {mergeDrivers.map((driver, idx) => (
                                                <td key={driver.id || `new-${idx}`} className="px-4 py-3 text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="radio"
                                                            name="assigned_to"
                                                            value={driver.id || 0}
                                                            defaultChecked={idx === 0}
                                                            className="w-4 h-4"
                                                        />
                                                        <span>
                                                            {driver.assigned_to 
                                                                ? (users.find(u => String(u.id) === String(driver.assigned_to))?.name || '-')
                                                                : '-'}
                                                        </span>
                                                    </div>
                                                </td>
                                            ))}
                                        </tr>
                                        
                                        {/* Lead Status Comment */}
                                        <tr className="border-b hover:bg-muted/50">
                                            <td className="px-4 py-3 text-sm font-medium">Sales Comment</td>
                                            {mergeDrivers.map((driver, idx) => (
                                                <td key={driver.id || `new-${idx}`} className="px-4 py-3 text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="radio"
                                                            name="lead_status_comment"
                                                            value={driver.id || 0}
                                                            defaultChecked={idx === 0}
                                                            className="w-4 h-4"
                                                        />
                                                        <span className="max-w-xs truncate" title={driver.lead_status_comment || ''}>
                                                            {driver.lead_status_comment || '-'}
                                                        </span>
                                                    </div>
                                                </td>
                                            ))}
                                        </tr>
                                        
                                        {/* Next Follow Up */}
                                        <tr className="border-b hover:bg-muted/50">
                                            <td className="px-4 py-3 text-sm font-medium">Next Follow Up</td>
                                            {mergeDrivers.map((driver, idx) => (
                                                <td key={driver.id || `new-${idx}`} className="px-4 py-3 text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="radio"
                                                            name="next_follow_up"
                                                            value={driver.id || 0}
                                                            defaultChecked={idx === 0}
                                                            className="w-4 h-4"
                                                        />
                                                        <span>{driver.next_follow_up ? formatDate(driver.next_follow_up) : '-'}</span>
                                                    </div>
                                                </td>
                                            ))}
                                        </tr>
                                        
                                        {/* Last Follow Up */}
                                        <tr className="border-b hover:bg-muted/50">
                                            <td className="px-4 py-3 text-sm font-medium">Last Follow Up</td>
                                            {mergeDrivers.map((driver, idx) => (
                                                <td key={driver.id || `new-${idx}`} className="px-4 py-3 text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="radio"
                                                            name="last_follow_up"
                                                            value={driver.id || 0}
                                                            defaultChecked={idx === 0}
                                                            className="w-4 h-4"
                                                        />
                                                        <span>{driver.last_follow_up ? formatDate(driver.last_follow_up) : '-'}</span>
                                                    </div>
                                                </td>
                                            ))}
                                        </tr>
                                        
                                        {/* Notes */}
                                        <tr className="border-b hover:bg-muted/50">
                                            <td className="px-4 py-3 text-sm font-medium">Notes</td>
                                            {mergeDrivers.map((driver, idx) => (
                                                <td key={driver.id || `new-${idx}`} className="px-4 py-3 text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="radio"
                                                            name="notes"
                                                            value={driver.id || 0}
                                                            defaultChecked={idx === 0}
                                                            className="w-4 h-4"
                                                        />
                                                        <span className="max-w-xs truncate" title={driver.notes || ''}>
                                                            {driver.notes || '-'}
                                                        </span>
                                                    </div>
                                                </td>
                                            ))}
                                        </tr>

                                        {/* Created At */}
                                        <tr className="border-b hover:bg-muted/50">
                                            <td className="px-4 py-3 text-sm font-medium">Created At</td>
                                            {mergeDrivers.map((driver, idx) => (
                                                <td key={driver.id || `new-${idx}`} className="px-4 py-3 text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="radio"
                                                            name="created_at"
                                                            value={driver.id || 0}
                                                            defaultChecked={idx === 0}
                                                            className="w-4 h-4"
                                                        />
                                                        <span>{driver.created_at ? formatDate(driver.created_at) : 'New'}</span>
                                                    </div>
                                                </td>
                                            ))}
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            {isAdmin && (
                                <div className="mt-4 flex items-center space-x-2">
                                    <Checkbox
                                        id="confirm_duplicate"
                                        checked={confirmDuplicate}
                                        onCheckedChange={(checked) => setConfirmDuplicate(checked as boolean)}
                                    />
                                    <Label htmlFor="confirm_duplicate" className="text-sm font-normal cursor-pointer">
                                        Confirm Duplicate
                                    </Label>
                                </div>
                            )}
                            <div className="mt-6 flex justify-end gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setMergeDialogOpen(false);
                                        setConfirmDuplicate(false);
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={async () => {
                                        if (isAdmin && !confirmDuplicate) {
                                            alert('Please confirm that this is a duplicate by checking the "Confirm Duplicate" checkbox.');
                                            return;
                                        }
                                        // Get selected values
                                        const primaryRecordInput = document.querySelector('input[name="primary_record"]:checked') as HTMLInputElement;
                                        const primaryRecordId = primaryRecordInput ? parseInt(primaryRecordInput.value) : (mergeDrivers.find(d => d.id)?.id || 0);
                                        
                                        const fieldMappings: { [key: string]: string } = {};
                                        const fieldNames = [
                                            'full_name', 'phone', 'whatsapp_phone', 'email', 'riding_company_id', 
                                            'campaign_id', 'lead_source_id', 'lead_status_id', 'lead_stage_id',
                                            'assigned_to', 'assigned_users', 'lead_status_comment', 
                                            'next_follow_up', 'last_follow_up', 'notes', 'created_at'
                                        ];
                                        
                                        fieldNames.forEach(fieldName => {
                                            const selectedInput = document.querySelector(`input[name="${fieldName}"]:checked`) as HTMLInputElement;
                                            if (selectedInput) {
                                                const selectedDriverId = parseInt(selectedInput.value);
                                                const selectedDriver = mergeDrivers.find(d => (d.id || 0) === selectedDriverId || (!d.id && selectedDriverId === 0));
                                                if (selectedDriver) {
                                                    if (fieldName === 'riding_company_id') {
                                                        fieldMappings[fieldName] = selectedDriver.riding_company_id?.toString() || '';
                                                    } else if (fieldName === 'campaign_id') {
                                                        fieldMappings[fieldName] = selectedDriver.campaign_id?.toString() || '';
                                                    } else if (fieldName === 'lead_source_id') {
                                                        fieldMappings[fieldName] = selectedDriver.lead_source_id?.toString() || '';
                                                    } else if (fieldName === 'lead_status_id') {
                                                        fieldMappings[fieldName] = selectedDriver.lead_status_id?.toString() || '';
                                                    } else if (fieldName === 'lead_stage_id') {
                                                        fieldMappings[fieldName] = selectedDriver.lead_stage_id?.toString() || '';
                                                    } else if (fieldName === 'assigned_to') {
                                                        fieldMappings[fieldName] = selectedDriver.assigned_to?.toString() || '';
                                                    } else if (fieldName === 'assigned_users') {
                                                        fieldMappings[fieldName] = selectedDriverId.toString();
                                                    } else if (fieldName === 'created_at') {
                                                        fieldMappings[fieldName] = selectedDriver.created_at || '';
                                                    } else {
                                                        fieldMappings[fieldName] = (selectedDriver as any)[fieldName] || '';
                                                    }
                                                }
                                            }
                                        });
                                        
                                        // If primary is new driver (id = 0), create it first then merge
                                        if (primaryRecordId === 0) {
                                            // Create driver first with selected field mappings
                                            const newDriverData = {
                                                ...data,
                                                ...Object.fromEntries(
                                                    Object.entries(fieldMappings).map(([key, value]) => {
                                                        if (key === 'assigned_users') {
                                                            return [key, mergeDrivers[0].assigned_users || []];
                                                        }
                                                        return [key, value];
                                                    })
                                                ),
                                            };
                                            
                                            router.post('/drivers/drivers', newDriverData, {
                                                preserveScroll: true,
                                                preserveState: true,
                                                onSuccess: (page) => {
                                                    // After creation, merge with duplicates
                                                    const newDriverId = (page.props as any).driver?.id;
                                                    const existingDriverIds = mergeDrivers.filter(d => d.id).map(d => d.id);
                                                    
                                                    if (newDriverId && existingDriverIds.length > 0) {
                                                        router.post('/drivers/drivers/merge', {
                                                            primary_driver_id: newDriverId,
                                                            driver_ids: existingDriverIds,
                                                            field_mappings: {},
                                                            confirm_duplicate: isAdmin ? confirmDuplicate : true,
                                                        }, {
                                                            onSuccess: () => {
                                                                setMergeDialogOpen(false);
                                                                router.visit('/drivers/drivers');
                                                            },
                                                            onError: (errors) => {
                                                                console.error('Merge error:', errors);
                                                                alert('Failed to merge drivers. Please try again.');
                                                            },
                                                        });
                                                    } else {
                                                        setMergeDialogOpen(false);
                                                        router.visit('/drivers/drivers');
                                                    }
                                                },
                                                onError: (errors) => {
                                                    console.error('Create error:', errors);
                                                    alert('Failed to create driver. Please try again.');
                                                },
                                            });
                                        } else {
                                            // Merge existing drivers - update primary with selected field mappings
                                            const existingDriverIds = mergeDrivers.filter(d => d.id && d.id !== primaryRecordId).map(d => d.id);
                                            
                                            if (existingDriverIds.length > 0) {
                                                router.post('/drivers/drivers/merge', {
                                                    primary_driver_id: primaryRecordId,
                                                    driver_ids: existingDriverIds,
                                                    field_mappings: fieldMappings,
                                                    confirm_duplicate: isAdmin ? confirmDuplicate : true,
                                                }, {
                                                    onSuccess: () => {
                                                        setMergeDialogOpen(false);
                                                        router.visit('/drivers/drivers');
                                                    },
                                                    onError: (errors) => {
                                                        console.error('Merge error:', errors);
                                                        alert('Failed to merge drivers. Please try again.');
                                                    },
                                                });
                                            } else {
                                                setMergeDialogOpen(false);
                                            }
                                        }
                                    }}
                                >
                                    Merge
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </AppLayout>
    );
}

