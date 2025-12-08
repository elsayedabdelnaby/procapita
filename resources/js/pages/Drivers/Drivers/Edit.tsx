import { FormField } from '@/components/core/form-field';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { MultiSelect } from '@/components/ui/multi-select';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, useForm, router } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useState } from 'react';

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
    const [leadStages, setLeadStages] = useState<LeadStage[]>([]);
    const [loadingLeadStages, setLoadingLeadStages] = useState(false);

    const { data, setData, put, processing, errors } = useForm({
        company_id: driver.company_id ? String(driver.company_id) : '',
        full_name: driver.full_name || '',
        phone: driver.phone || '',
        whatsapp_phone: driver.whatsapp_phone || '',
        email: driver.email || '',
        riding_company_id: driver.riding_company_id ? String(driver.riding_company_id) : '',
        campaign_id: driver.campaign_id ? String(driver.campaign_id) : '',
        lead_source_id: driver.lead_source_id ? String(driver.lead_source_id) : '',
        assigned_to: driver.assigned_to ? String(driver.assigned_to) : '',
        assigned_users: driver.assigned_users || [],
        lead_status_id: driver.lead_status_id ? String(driver.lead_status_id) : '',
        lead_status_comment: driver.lead_status_comment || '',
        next_follow_up: driver.next_follow_up || '',
        last_follow_up: driver.last_follow_up || '',
        lead_stage_id: driver.lead_stage_id ? String(driver.lead_stage_id) : '',
        current_stage_id: driver.current_stage_id ? String(driver.current_stage_id) : '',
        notes: driver.notes || '',
    });

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
        put(`/drivers/drivers/${driver.id}`, {
            onSuccess: () => {
                router.visit('/drivers/drivers');
            },
        });
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
                        </div>
                    </Card>

                    <Card className="p-6">
                        <h2 className="mb-4 text-lg font-semibold">Additional Information</h2>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <Label htmlFor="riding_company_id">Riding Company</Label>
                                <select
                                    id="riding_company_id"
                                    name="riding_company_id"
                                    value={data.riding_company_id}
                                    onChange={(e) => setData('riding_company_id', e.target.value)}
                                    className="w-full rounded-md border px-3 py-2"
                                >
                                    <option value="">Select a riding company</option>
                                    {ridingCompanies.map((company) => (
                                        <option key={company.id} value={String(company.id)}>
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
                            <div className="rounded-lg border-2 border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-900/10 p-4 space-y-4">
                                <div>
                                    <Label htmlFor="lead_status_id">Lead Status</Label>
                                    <select
                                        id="lead_status_id"
                                        name="lead_status_id"
                                        value={data.lead_status_id}
                                        onChange={(e) => setData('lead_status_id', e.target.value)}
                                        className="w-full rounded-md border px-3 py-2"
                                    >
                                        <option value="">Select a lead status</option>
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
                                    <Label htmlFor="lead_status_comment">Lead Status Comment</Label>
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

                                <div 
                                    className="cursor-pointer"
                                    onClick={() => {
                                        const dateInput = document.getElementById('edit-next-follow-up') as HTMLInputElement;
                                        if (dateInput) {
                                            dateInput.showPicker?.() || dateInput.focus();
                                        }
                                    }}
                                >
                                    <Label htmlFor="next_follow_up">Next Follow-up</Label>
                                    <input
                                        type="date"
                                        id="edit-next-follow-up"
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
                                        className="w-full rounded-md border px-3 py-2"
                                        onClick={(e) => e.stopPropagation()}
                                    />
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
                                <Label htmlFor="assigned_users">
                                    Assigned To <span className="text-red-500">*</span>
                                </Label>
                                <MultiSelect
                                    options={users.map((user) => ({
                                        value: user.id,
                                        label: user.name,
                                    }))}
                                    value={data.assigned_users}
                                    onChange={(value) => setData('assigned_users', value)}
                                    placeholder="Select users..."
                                    className="mt-1"
                                />
                                {errors.assigned_users && (
                                    <p className="text-sm text-red-500 mt-1">{errors.assigned_users}</p>
                                )}
                                {errors['assigned_users.*'] && (
                                    <p className="text-sm text-red-500 mt-1">{errors['assigned_users.*']}</p>
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
            </div>
        </AppLayout>
    );
}

