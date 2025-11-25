import { FormField } from '@/components/core/form-field';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { type SharedData } from '@/types';

interface CampaignType {
    id: number;
    name: string;
    slug: string;
}

interface CampaignStatus {
    id: number;
    name: string;
    slug: string;
}

interface CampaignChannel {
    id: number;
    campaign_type_id: number;
    name: string;
    slug: string;
}

interface Company {
    id: number;
    name: string;
}

interface CampaignCreateProps {
    companies?: Company[];
    company?: Company;
    campaignTypes: CampaignType[];
    campaignStatuses: CampaignStatus[];
}

export default function CampaignCreate({
    companies,
    company,
    campaignTypes: initialCampaignTypes,
    campaignStatuses: initialCampaignStatuses,
}: CampaignCreateProps) {
    const page = usePage<SharedData>();
    const { selectedCompany } = page.props;
    
    const [campaignTypes, setCampaignTypes] = useState<CampaignType[]>(initialCampaignTypes || []);
    const [campaignStatuses, setCampaignStatuses] = useState<CampaignStatus[]>(initialCampaignStatuses || []);
    const [availableChannels, setAvailableChannels] = useState<CampaignChannel[]>([]);
    const [loadingChannels, setLoadingChannels] = useState(false);
    const [loadingTypesStatuses, setLoadingTypesStatuses] = useState(false);

    const { data, setData, post, processing, errors } = useForm({
        name: '',
        description: '',
        company_id: selectedCompany ? String(selectedCompany.id) : (company?.id || ''),
        campaign_type_id: '',
        campaign_status_id: initialCampaignStatuses[0]?.id || '',
        campaign_channel_id: '',
        start_date: '',
        end_date: '',
        expected_budget: '',
        expected_roi: '',
        expected_leads: '',
        expected_conversions: '',
        expected_conversion_rate: '',
        expected_reach: '',
        expected_impressions: '',
        expected_clicks: '',
        expected_ctr: '',
        expected_revenue: '',
    });

    // Set selected company on mount if available
    useEffect(() => {
        if (selectedCompany && !data.company_id) {
            setData('company_id', String(selectedCompany.id));
        }
    }, [selectedCompany]);

    // Fetch types and statuses when company changes (for super admin)
    useEffect(() => {
        if (companies && data.company_id) {
            setLoadingTypesStatuses(true);
            
            // Fetch campaign types and statuses for selected company
            Promise.all([
                axios.get(`/api/marketing/companies/${data.company_id}/campaign-types`),
                axios.get(`/api/marketing/companies/${data.company_id}/campaign-statuses`),
            ])
                .then(([typesResponse, statusesResponse]) => {
                    setCampaignTypes(typesResponse.data);
                    setCampaignStatuses(statusesResponse.data);
                    // Reset type, status, and channel when company changes
                    setData('campaign_type_id', '');
                    setData('campaign_status_id', statusesResponse.data[0]?.id || '');
                    setData('campaign_channel_id', '');
                })
                .catch((error) => {
                    console.error('Error fetching types/statuses:', error);
                    setCampaignTypes([]);
                    setCampaignStatuses([]);
                })
                .finally(() => {
                    setLoadingTypesStatuses(false);
                });
        }
    }, [data.company_id]);

    // Fetch channels when campaign type changes
    useEffect(() => {
        if (data.campaign_type_id) {
            setLoadingChannels(true);
            axios
                .get(`/api/marketing/campaign-types/${data.campaign_type_id}/channels`)
                .then((response) => {
                    setAvailableChannels(response.data);
                    // Reset channel selection when type changes
                    setData('campaign_channel_id', '');
                })
                .catch((error) => {
                    console.error('Error fetching channels:', error);
                    setAvailableChannels([]);
                })
                .finally(() => {
                    setLoadingChannels(false);
                });
        } else {
            setAvailableChannels([]);
            setData('campaign_channel_id', '');
        }
    }, [data.campaign_type_id]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/marketing/campaigns');
    };

    return (
        <AppLayout>
            <Head title="Create Campaign" />

            <div className="p-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold">Create Campaign</h1>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        Create a new marketing campaign with expected metrics
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
                                    {Object.keys(errors).length === 1 ? '' : 's'} with your
                                    submission
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
                    {/* Basic Information */}
                    <Card className="p-6">
                        <h2 className="mb-4 text-lg font-semibold">Basic Information</h2>
                        <div className="grid gap-4 md:grid-cols-2">
                            {companies && (
                                <div className="md:col-span-2">
                                    <Label htmlFor="company_id">Company *</Label>
                                    <select
                                        id="company_id"
                                        name="company_id"
                                        value={data.company_id}
                                        onChange={(e) => setData('company_id', e.target.value)}
                                        className="w-full rounded-md border px-3 py-2"
                                        required
                                    >
                                        <option value="">Select Company</option>
                                        {companies.map((comp) => (
                                            <option key={comp.id} value={comp.id}>
                                                {comp.name}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.company_id && (
                                        <p className="text-sm text-red-500">{errors.company_id}</p>
                                    )}
                                </div>
                            )}

                            {company && (
                                <input type="hidden" name="company_id" value={company.id} />
                            )}

                            <div className="md:col-span-2">
                                <FormField
                                    label="Campaign Name"
                                    name="name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    error={errors.name}
                                    required
                                    placeholder="e.g., Summer Email Campaign 2024"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <Label htmlFor="description">Description</Label>
                                <textarea
                                    id="description"
                                    name="description"
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    className="w-full rounded-md border px-3 py-2"
                                    rows={3}
                                    placeholder="Campaign description and objectives..."
                                />
                                {errors.description && (
                                    <p className="text-sm text-red-500">{errors.description}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="campaign_type_id">Campaign Type *</Label>
                                <select
                                    id="campaign_type_id"
                                    name="campaign_type_id"
                                    value={data.campaign_type_id}
                                    onChange={(e) => setData('campaign_type_id', e.target.value)}
                                    className="w-full rounded-md border px-3 py-2"
                                    disabled={loadingTypesStatuses || (companies && !data.company_id)}
                                    required
                                >
                                    <option value="">
                                        {loadingTypesStatuses
                                            ? 'Loading types...'
                                            : companies && !data.company_id
                                            ? 'Select company first'
                                            : 'Select Type'}
                                    </option>
                                    {campaignTypes.map((type) => (
                                        <option key={type.id} value={type.id}>
                                            {type.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.campaign_type_id && (
                                    <p className="text-sm text-red-500">
                                        {errors.campaign_type_id}
                                    </p>
                                )}
                                {companies && data.company_id && campaignTypes.length === 0 && !loadingTypesStatuses && (
                                    <p className="text-sm text-yellow-600">
                                        No campaign types available for this company
                                    </p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="campaign_status_id">Status *</Label>
                                <select
                                    id="campaign_status_id"
                                    name="campaign_status_id"
                                    value={data.campaign_status_id}
                                    onChange={(e) => setData('campaign_status_id', e.target.value)}
                                    className="w-full rounded-md border px-3 py-2"
                                    disabled={loadingTypesStatuses || (companies && !data.company_id)}
                                    required
                                >
                                    <option value="">
                                        {loadingTypesStatuses
                                            ? 'Loading statuses...'
                                            : companies && !data.company_id
                                            ? 'Select company first'
                                            : 'Select Status'}
                                    </option>
                                    {campaignStatuses.map((status) => (
                                        <option key={status.id} value={status.id}>
                                            {status.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.campaign_status_id && (
                                    <p className="text-sm text-red-500">
                                        {errors.campaign_status_id}
                                    </p>
                                )}
                                {companies && data.company_id && campaignStatuses.length === 0 && !loadingTypesStatuses && (
                                    <p className="text-sm text-yellow-600">
                                        No campaign statuses available for this company
                                    </p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="campaign_channel_id">Channel *</Label>
                                <select
                                    id="campaign_channel_id"
                                    name="campaign_channel_id"
                                    value={data.campaign_channel_id}
                                    onChange={(e) => setData('campaign_channel_id', e.target.value)}
                                    className="w-full rounded-md border px-3 py-2"
                                    disabled={!data.campaign_type_id || loadingChannels}
                                    required
                                >
                                    <option value="">
                                        {loadingChannels
                                            ? 'Loading channels...'
                                            : data.campaign_type_id
                                            ? 'Select Channel'
                                            : 'Select type first'}
                                    </option>
                                    {availableChannels.map((channel) => (
                                        <option key={channel.id} value={channel.id}>
                                            {channel.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.campaign_channel_id && (
                                    <p className="text-sm text-red-500">
                                        {errors.campaign_channel_id}
                                    </p>
                                )}
                                {data.campaign_type_id && availableChannels.length === 0 && !loadingChannels && (
                                    <p className="text-sm text-yellow-600">
                                        No channels available for this type
                                    </p>
                                )}
                            </div>

                            <FormField
                                label="Start Date"
                                name="start_date"
                                type="date"
                                value={data.start_date}
                                onChange={(e) => setData('start_date', e.target.value)}
                                error={errors.start_date}
                                required
                            />

                            <FormField
                                label="End Date"
                                name="end_date"
                                type="date"
                                value={data.end_date}
                                onChange={(e) => setData('end_date', e.target.value)}
                                error={errors.end_date}
                            />
                        </div>
                    </Card>

                    {/* Expected Metrics */}
                    <Card className="p-6">
                        <h2 className="mb-4 text-lg font-semibold">Expected Metrics</h2>
                        <div className="grid gap-4 md:grid-cols-3">
                            <FormField
                                label="Expected Budget ($)"
                                name="expected_budget"
                                type="number"
                                value={data.expected_budget}
                                onChange={(e) => setData('expected_budget', e.target.value)}
                                error={errors.expected_budget}
                                placeholder="10000"
                            />

                            <FormField
                                label="Expected ROI (%)"
                                name="expected_roi"
                                type="number"
                                value={data.expected_roi}
                                onChange={(e) => setData('expected_roi', e.target.value)}
                                error={errors.expected_roi}
                                placeholder="150"
                            />

                            <FormField
                                label="Expected Revenue ($)"
                                name="expected_revenue"
                                type="number"
                                value={data.expected_revenue}
                                onChange={(e) => setData('expected_revenue', e.target.value)}
                                error={errors.expected_revenue}
                                placeholder="25000"
                            />

                            <FormField
                                label="Expected Leads"
                                name="expected_leads"
                                type="number"
                                value={data.expected_leads}
                                onChange={(e) => setData('expected_leads', e.target.value)}
                                error={errors.expected_leads}
                                placeholder="500"
                            />

                            <FormField
                                label="Expected Conversions"
                                name="expected_conversions"
                                type="number"
                                value={data.expected_conversions}
                                onChange={(e) => setData('expected_conversions', e.target.value)}
                                error={errors.expected_conversions}
                                placeholder="50"
                            />

                            <FormField
                                label="Expected Conversion Rate (%)"
                                name="expected_conversion_rate"
                                type="number"
                                value={data.expected_conversion_rate}
                                onChange={(e) =>
                                    setData('expected_conversion_rate', e.target.value)
                                }
                                error={errors.expected_conversion_rate}
                                placeholder="10"
                            />

                            <FormField
                                label="Expected Reach"
                                name="expected_reach"
                                type="number"
                                value={data.expected_reach}
                                onChange={(e) => setData('expected_reach', e.target.value)}
                                error={errors.expected_reach}
                                placeholder="10000"
                            />

                            <FormField
                                label="Expected Impressions"
                                name="expected_impressions"
                                type="number"
                                value={data.expected_impressions}
                                onChange={(e) => setData('expected_impressions', e.target.value)}
                                error={errors.expected_impressions}
                                placeholder="50000"
                            />

                            <FormField
                                label="Expected Clicks"
                                name="expected_clicks"
                                type="number"
                                value={data.expected_clicks}
                                onChange={(e) => setData('expected_clicks', e.target.value)}
                                error={errors.expected_clicks}
                                placeholder="2500"
                            />

                            <FormField
                                label="Expected CTR (%)"
                                name="expected_ctr"
                                type="number"
                                value={data.expected_ctr}
                                onChange={(e) => setData('expected_ctr', e.target.value)}
                                error={errors.expected_ctr}
                                placeholder="5"
                            />
                        </div>
                    </Card>

                    {/* Actions */}
                    <div className="flex justify-end gap-4">
                        <Link href="/marketing/campaigns">
                            <Button type="button" variant="outline">
                                Cancel
                            </Button>
                        </Link>
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Creating...' : 'Create Campaign'}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}

