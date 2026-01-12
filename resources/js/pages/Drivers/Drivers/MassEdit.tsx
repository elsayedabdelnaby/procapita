import { FormField } from '@/components/core/form-field';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, useForm } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useState } from 'react';
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
    color?: string;
}

interface User {
    id: number;
    name: string;
}

interface Driver {
    id: number;
    full_name: string;
    phone: string;
}

interface DriversMassEditProps {
    drivers: Driver[];
    ids: number[];
    companies?: Company[];
    ridingCompanies: RidingCompany[];
    campaigns: Campaign[];
    leadSources: LeadSource[];
    leadStatuses: LeadStatus[];
    users: User[];
}

export default function DriversMassEdit({
    drivers,
    ids,
    companies,
    ridingCompanies: initialRidingCompanies,
    campaigns: initialCampaigns,
    leadSources: initialLeadSources,
    leadStatuses: initialLeadStatuses,
    users: initialUsers,
}: DriversMassEditProps) {
    const [ridingCompanies, setRidingCompanies] = useState<RidingCompany[]>(initialRidingCompanies || []);
    const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns || []);
    const [leadSources, setLeadSources] = useState<LeadSource[]>(initialLeadSources || []);
    const [leadStatuses, setLeadStatuses] = useState<LeadStatus[]>(initialLeadStatuses || []);
    const [users, setUsers] = useState<User[]>(initialUsers || []);

    const [loadingRidingCompanies, setLoadingRidingCompanies] = useState(false);
    const [loadingCampaigns, setLoadingCampaigns] = useState(false);
    const [loadingLeadSources, setLoadingLeadSources] = useState(false);
    const [loadingLeadStatuses, setLoadingLeadStatuses] = useState(false);
    const [loadingUsers, setLoadingUsers] = useState(false);

    const { data, setData, post, processing, errors } = useForm({
        ids: ids,
        company_id: '',
        riding_company_id: '',
        campaign_id: '',
        lead_source_id: '',
        assigned_to: '',
        lead_status_id: '',
        lead_status_comment: '',
        next_follow_up: '',
        notes: '',
    });

    const [clearFields, setClearFields] = useState<Set<string>>(new Set());

    const handleClearField = (fieldName: string, checked: boolean) => {
        const newClearFields = new Set(clearFields);
        if (checked) {
            newClearFields.add(fieldName);
                setData(fieldName as any, '');
        } else {
            newClearFields.delete(fieldName);
        }
        setClearFields(newClearFields);
    };

    // Fetch data when company changes (for super admin)
    useEffect(() => {
        if (companies && data.company_id) {
            // Fetch riding companies
            setLoadingRidingCompanies(true);
            axios
                .get(`/api/drivers/companies/${data.company_id}/riding-companies`)
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

            // Fetch campaigns
            setLoadingCampaigns(true);
            axios
                .get(`/api/drivers/companies/${data.company_id}/campaigns`)
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
                .get(`/api/drivers/companies/${data.company_id}/lead-sources`)
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
                .get(`/api/drivers/companies/${data.company_id}/lead-statuses`)
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
                .get(`/api/drivers/companies/${data.company_id}/users`)
                .then((response) => {
                    setUsers(response.data);
                    setData('assigned_to', '');
                })
                .catch((error) => {
                    console.error('Error fetching users:', error);
                    setUsers([]);
                })
                .finally(() => {
                    setLoadingUsers(false);
                });
        } else if (!companies) {
            setRidingCompanies(initialRidingCompanies || []);
            setCampaigns(initialCampaigns || []);
            setLeadSources(initialLeadSources || []);
            setLeadStatuses(initialLeadStatuses || []);
            setUsers(initialUsers || []);
        }
    }, [data.company_id, companies]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/drivers/drivers/mass-update', {
            clear_fields: Array.from(clearFields),
        });
    };

    return (
        <AppLayout>
            <Head title="Mass Edit Drivers" />

            <div className="p-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold mb-2">Mass Edit Drivers</h1>
                    <p className="text-sm text-muted-foreground">
                        Update {drivers.length} selected driver(s). Leave fields empty to keep existing values.
                    </p>
                </div>

                {/* Selected Drivers List */}
                <Card className="p-4 mb-6">
                    <Label className="mb-2 block">Selected Drivers ({drivers.length})</Label>
                    <div className="flex flex-wrap gap-2">
                        {drivers.map((driver) => (
                            <Badge key={driver.id} variant="outline">
                                {driver.full_name} ({driver.phone})
                            </Badge>
                        ))}
                    </div>
                </Card>

                <form onSubmit={handleSubmit}>
                    <Card className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {companies && companies.length > 0 && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            checked={clearFields.has('company_id')}
                                            onCheckedChange={(checked) => handleClearField('company_id', checked as boolean)}
                                        />
                                        <Label htmlFor="company_id" className="text-sm font-medium">
                                            Company
                                        </Label>
                                    </div>
                                    <select
                                        id="company_id"
                                        value={data.company_id}
                                        onChange={(e) => setData('company_id', e.target.value)}
                                        disabled={clearFields.has('company_id')}
                                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
                                    >
                                        <option value="">-- Keep existing --</option>
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

                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        checked={clearFields.has('riding_company_id')}
                                        onCheckedChange={(checked) => handleClearField('riding_company_id', checked as boolean)}
                                    />
                                    <Label htmlFor="riding_company_id" className="text-sm font-medium">
                                        Riding Company
                                    </Label>
                                </div>
                                <select
                                    id="riding_company_id"
                                    value={data.riding_company_id}
                                    onChange={(e) => setData('riding_company_id', e.target.value)}
                                    disabled={loadingRidingCompanies || clearFields.has('riding_company_id')}
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
                                >
                                    <option value="">-- Keep existing --</option>
                                    {ridingCompanies.map((ridingCompany) => (
                                        <option key={ridingCompany.id} value={ridingCompany.id}>
                                            {ridingCompany.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.riding_company_id && (
                                    <p className="text-sm text-red-500">{errors.riding_company_id}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        checked={clearFields.has('campaign_id')}
                                        onCheckedChange={(checked) => handleClearField('campaign_id', checked as boolean)}
                                    />
                                    <Label htmlFor="campaign_id" className="text-sm font-medium">
                                        Campaign
                                    </Label>
                                </div>
                                <select
                                    id="campaign_id"
                                    value={data.campaign_id}
                                    onChange={(e) => setData('campaign_id', e.target.value)}
                                    disabled={loadingCampaigns || clearFields.has('campaign_id')}
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
                                >
                                    <option value="">-- Keep existing --</option>
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

                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        checked={clearFields.has('lead_source_id')}
                                        onCheckedChange={(checked) => handleClearField('lead_source_id', checked as boolean)}
                                    />
                                    <Label htmlFor="lead_source_id" className="text-sm font-medium">
                                        Lead Source
                                    </Label>
                                </div>
                                <select
                                    id="lead_source_id"
                                    value={data.lead_source_id}
                                    onChange={(e) => setData('lead_source_id', e.target.value)}
                                    disabled={loadingLeadSources || clearFields.has('lead_source_id')}
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
                                >
                                    <option value="">-- Keep existing --</option>
                                    {leadSources.map((leadSource) => (
                                        <option key={leadSource.id} value={leadSource.id}>
                                            {leadSource.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.lead_source_id && (
                                    <p className="text-sm text-red-500">{errors.lead_source_id}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        checked={clearFields.has('lead_status_id')}
                                        onCheckedChange={(checked) => handleClearField('lead_status_id', checked as boolean)}
                                    />
                                    <Label htmlFor="lead_status_id" className="text-sm font-medium">
                                        Lead Status
                                    </Label>
                                </div>
                                <select
                                    id="lead_status_id"
                                    value={data.lead_status_id}
                                    onChange={(e) => setData('lead_status_id', e.target.value)}
                                    disabled={loadingLeadStatuses || clearFields.has('lead_status_id')}
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
                                >
                                    <option value="">-- Keep existing --</option>
                                    {leadStatuses.map((leadStatus) => (
                                        <option key={leadStatus.id} value={leadStatus.id}>
                                            {leadStatus.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.lead_status_id && (
                                    <p className="text-sm text-red-500">{errors.lead_status_id}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        checked={clearFields.has('lead_status_comment')}
                                        onCheckedChange={(checked) => handleClearField('lead_status_comment', checked as boolean)}
                                    />
                                    <Label htmlFor="lead_status_comment" className="text-sm font-medium">
                                        Feedback Comment
                                    </Label>
                                </div>
                                <textarea
                                    id="lead_status_comment"
                                    value={data.lead_status_comment}
                                    onChange={(e) => setData('lead_status_comment', e.target.value)}
                                    disabled={clearFields.has('lead_status_comment')}
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                                    rows={3}
                                    placeholder="-- Keep existing --"
                                />
                                {errors.lead_status_comment && (
                                    <p className="text-sm text-red-500">{errors.lead_status_comment}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        checked={clearFields.has('next_follow_up')}
                                        onCheckedChange={(checked) => handleClearField('next_follow_up', checked as boolean)}
                                    />
                                    <Label 
                                        htmlFor="next_follow_up" 
                                        className="text-sm font-medium cursor-pointer"
                                        onClick={(e) => {
                                            if (clearFields.has('next_follow_up')) return;
                                            e.preventDefault();
                                            const dateInput = document.getElementById('mass-edit-next-follow-up') as HTMLInputElement;
                                            if (dateInput) {
                                                dateInput.showPicker?.() || dateInput.focus();
                                            }
                                        }}
                                    >
                                        Next Follow-up
                                    </Label>
                                </div>
                                <div 
                                    className="relative cursor-pointer"
                                    onClick={(e) => {
                                        if (clearFields.has('next_follow_up')) return;
                                        const dateInput = document.getElementById('mass-edit-next-follow-up') as HTMLInputElement;
                                        if (dateInput && e.target !== dateInput && !(e.target as HTMLElement).closest('.date-display-overlay')) {
                                            dateInput.showPicker?.() || dateInput.focus();
                                        }
                                    }}
                                >
                                    <div className="relative">
                                        <Input
                                            type="date"
                                            id="mass-edit-next-follow-up"
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
                                            disabled={clearFields.has('next_follow_up')}
                                            className={`w-full cursor-pointer ${clearFields.has('next_follow_up') ? 'opacity-50' : ''}`}
                                            onClick={(e) => {
                                                if (clearFields.has('next_follow_up')) return;
                                                e.stopPropagation();
                                                const dateInput = e.target as HTMLInputElement;
                                                dateInput.showPicker?.() || dateInput.focus();
                                            }}
                                            onFocus={(e) => {
                                                if (clearFields.has('next_follow_up')) return;
                                                e.target.showPicker?.();
                                            }}
                                            style={{ 
                                                color: data.next_follow_up ? 'transparent' : 'transparent',
                                                caretColor: 'transparent'
                                            }}
                                        />
                                        {!clearFields.has('next_follow_up') && !data.next_follow_up && (
                                            <div 
                                                className="date-display-overlay absolute inset-0 flex items-center px-3 pointer-events-none cursor-pointer select-none"
                                                style={{ 
                                                    color: '#6b7280',
                                                    fontSize: '0.875rem',
                                                    lineHeight: '1.25rem'
                                                }}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    const dateInput = document.getElementById('mass-edit-next-follow-up') as HTMLInputElement;
                                                    if (dateInput) {
                                                        dateInput.showPicker?.() || dateInput.focus();
                                                    }
                                                }}
                                            >
                                                dd / mm / yyyy
                                            </div>
                                        )}
                                        {!clearFields.has('next_follow_up') && data.next_follow_up && (
                                            <div 
                                                className="date-display-overlay absolute inset-0 flex items-center px-3 pointer-events-none cursor-pointer select-none"
                                                style={{ 
                                                    color: 'inherit',
                                                    fontSize: '0.875rem',
                                                    lineHeight: '1.25rem'
                                                }}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    const dateInput = document.getElementById('mass-edit-next-follow-up') as HTMLInputElement;
                                                    if (dateInput) {
                                                        dateInput.showPicker?.() || dateInput.focus();
                                                    }
                                                }}
                                            >
                                                {formatDate(data.next_follow_up)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {errors.next_follow_up && (
                                    <p className="text-sm text-red-500">{errors.next_follow_up}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="last_follow_up" className="text-sm font-medium">
                                    Last Follow-up
                                </Label>
                                <Input
                                    type="date"
                                    id="last_follow_up"
                                    value=""
                                    disabled
                                    className="w-full bg-neutral-100 dark:bg-neutral-800 cursor-not-allowed"
                                />
                                <p className="text-xs text-neutral-500 mt-1">Read-only: Automatically updated</p>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        checked={clearFields.has('assigned_to')}
                                        onCheckedChange={(checked) => handleClearField('assigned_to', checked as boolean)}
                                    />
                                    <Label htmlFor="assigned_to" className="text-sm font-medium">
                                        Assigned To
                                    </Label>
                                </div>
                                <select
                                    id="assigned_to"
                                    value={data.assigned_to}
                                    onChange={(e) => setData('assigned_to', e.target.value)}
                                    disabled={loadingUsers || clearFields.has('assigned_to')}
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
                                >
                                    <option value="">-- Keep existing --</option>
                                    {users.map((user) => (
                                        <option key={user.id} value={user.id}>
                                            {user.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.assigned_to && (
                                    <p className="text-sm text-red-500">{errors.assigned_to}</p>
                                )}
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        checked={clearFields.has('notes')}
                                        onCheckedChange={(checked) => handleClearField('notes', checked as boolean)}
                                    />
                                    <Label htmlFor="notes" className="text-sm font-medium">
                                        Notes
                                    </Label>
                                </div>
                                <textarea
                                    id="notes"
                                    value={data.notes}
                                    onChange={(e) => setData('notes', e.target.value)}
                                    disabled={clearFields.has('notes')}
                                    rows={4}
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
                                    placeholder="Add notes (will be appended to existing notes)"
                                />
                                {errors.notes && (
                                    <p className="text-sm text-red-500">{errors.notes}</p>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-6 border-t mt-6">
                            <Link href="/drivers/drivers">
                                <Button type="button" variant="outline">
                                    Cancel
                                </Button>
                            </Link>
                            <Button type="submit" disabled={processing}>
                                {processing ? 'Updating...' : `Update ${drivers.length} Driver(s)`}
                            </Button>
                        </div>
                    </Card>
                </form>
            </div>
        </AppLayout>
    );
}

