import { FormField } from '@/components/core/form-field';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { MultiSelect } from '@/components/ui/multi-select';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { type SharedData } from '@/types';
import { formatDate } from '@/utils/date-format';

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
}

export default function DriversCreate({
    companies,
    ridingCompanies: initialRidingCompanies,
    campaigns: initialCampaigns,
    leadSources: initialLeadSources,
    leadStatuses: initialLeadStatuses,
    users: initialUsers,
}: DriversCreateProps) {
    const page = usePage<SharedData>();
    const { selectedCompany } = page.props;
    
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
        riding_company_id: '',
        campaign_id: '',
        lead_source_id: '',
        assigned_users: [] as number[],
        lead_status_id: '',
        lead_status_comment: '',
        next_follow_up: '',
        last_follow_up: '',
        lead_stage_id: '',
        current_stage_id: '',
        notes: '',
    });

    // Update company_id when selectedCompany changes
    useEffect(() => {
        if (selectedCompany) {
            setData('company_id', String(selectedCompany.id));
        }
    }, [selectedCompany]);

    // Reset dependent fields when company changes
    useEffect(() => {
        const companyId = selectedCompany ? selectedCompany.id : (data.company_id ? Number(data.company_id) : null);
        
        if (companyId) {
            // Reset dependent fields when company changes
            setData('riding_company_id', '');
            setData('campaign_id', '');
            setData('lead_source_id', '');
            setData('lead_status_id', '');
            setData('assigned_users', []);
            setData('lead_stage_id', '');
        }
    }, [selectedCompany?.id, data.company_id]);

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
                        setData('assigned_users', []);
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
    }, [selectedCompany?.id, data.company_id, companies]);

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
    }, [data.riding_company_id]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/drivers/drivers');
    };

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
                                <FormField
                                    label="Full Name"
                                    name="full_name"
                                    value={data.full_name}
                                    onChange={(e) => setData('full_name', e.target.value)}
                                    error={errors.full_name}
                                    required
                                    placeholder="e.g., John Doe"
                                />
                            </div>

                            <FormField
                                label="Phone"
                                name="phone"
                                value={data.phone}
                                onChange={(e) => setData('phone', e.target.value)}
                                error={errors.phone}
                                required
                                placeholder="+1234567890"
                            />

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
                                {errors.lead_status_id && (
                                    <p className="text-sm text-red-500">{errors.lead_status_id}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="lead_status_comment">Feedback Comment</Label>
                                <textarea
                                    id="lead_status_comment"
                                    name="lead_status_comment"
                                    value={data.lead_status_comment}
                                    onChange={(e) => setData('lead_status_comment', e.target.value)}
                                    className="w-full rounded-md border px-3 py-2"
                                    rows={3}
                                    placeholder="Enter lead status comment..."
                                />
                                {errors.lead_status_comment && (
                                    <p className="text-sm text-red-500">{errors.lead_status_comment}</p>
                                )}
                            </div>

                            <div className="relative cursor-pointer">
                                <Label 
                                    htmlFor="next_follow_up"
                                    className="cursor-pointer"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        const dateInput = document.getElementById('create-next-follow-up') as HTMLInputElement;
                                        if (dateInput) {
                                            dateInput.showPicker?.() || dateInput.focus();
                                        }
                                    }}
                                >
                                    Next Follow-up
                                </Label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        id="create-next-follow-up"
                                        name="next_follow_up"
                                        value={data.next_follow_up}
                                        onChange={(e) => {
                                            const selectedDate = e.target.value;
                                            const today = new Date().toISOString().split('T')[0];
                                            if (selectedDate && selectedDate < today) {
                                                alert('Next Follow-up date must be today or a future date.');
                                                return;
                                            }
                                            setData('next_follow_up', selectedDate);
                                        }}
                                        min={new Date().toISOString().split('T')[0]}
                                        className="w-full rounded-md border px-3 py-2 cursor-pointer"
                                        onClick={(e) => {
                                            const dateInput = e.target as HTMLInputElement;
                                            dateInput.showPicker?.() || dateInput.focus();
                                        }}
                                        onFocus={(e) => {
                                            e.target.showPicker?.();
                                        }}
                                        style={{ 
                                            color: data.next_follow_up ? 'transparent' : 'transparent',
                                            caretColor: 'transparent'
                                        }}
                                    />
                                    {!data.next_follow_up && (
                                        <div 
                                            className="absolute inset-0 flex items-center px-3 pointer-events-none cursor-pointer select-none"
                                            style={{ 
                                                color: '#6b7280',
                                                fontSize: '0.875rem',
                                                lineHeight: '1.25rem'
                                            }}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                const dateInput = document.getElementById('create-next-follow-up') as HTMLInputElement;
                                                if (dateInput) {
                                                    dateInput.showPicker?.() || dateInput.focus();
                                                }
                                            }}
                                        >
                                            dd / mm / yyyy
                                        </div>
                                    )}
                                    {data.next_follow_up && (
                                        <div 
                                            className="absolute inset-0 flex items-center px-3 pointer-events-none cursor-pointer select-none"
                                            style={{ 
                                                color: 'inherit',
                                                fontSize: '0.875rem',
                                                lineHeight: '1.25rem'
                                            }}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                const dateInput = document.getElementById('create-next-follow-up') as HTMLInputElement;
                                                if (dateInput) {
                                                    dateInput.showPicker?.() || dateInput.focus();
                                                }
                                            }}
                                        >
                                            {formatDate(data.next_follow_up)}
                                        </div>
                                    )}
                                </div>
                                {errors.next_follow_up && (
                                    <p className="text-sm text-red-500">{errors.next_follow_up}</p>
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
                                <Label>
                                    Assigned Users <span className="text-red-500">*</span>
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
                                    <MultiSelect
                                        options={users.map((user) => ({
                                            value: user.id,
                                            label: user.name,
                                        }))}
                                        value={data.assigned_users}
                                        onChange={(value) => setData('assigned_users', value.map(v => typeof v === 'string' ? Number(v) : v))}
                                        placeholder="Select users..."
                                        className="mt-1"
                                        disabled={loadingUsers}
                                    />
                                )}
                                {errors.assigned_users && (
                                    <p className="text-sm text-red-500 mt-1">{errors.assigned_users}</p>
                                )}
                                {(errors as Record<string, string>)['assigned_users.*'] && (
                                    <p className="text-sm text-red-500 mt-1">{(errors as Record<string, string>)['assigned_users.*']}</p>
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
                        </div>
                    </Card>

                    <div className="flex justify-end gap-4">
                        <Link href="/drivers/drivers">
                            <Button type="button" variant="outline">
                                Cancel
                            </Button>
                        </Link>
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Creating...' : 'Create Driver'}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}

