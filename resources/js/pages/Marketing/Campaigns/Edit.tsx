import { FormField } from '@/components/core/form-field';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { type Campaign, type CampaignType, type CampaignStatus, type CampaignChannel } from '@/types/marketing';
import { Head, Link, useForm } from '@inertiajs/react';

interface CampaignEditProps {
    campaign: Campaign;
    campaignTypes: CampaignType[];
    campaignStatuses: CampaignStatus[];
    campaignChannels: CampaignChannel[];
}

export default function CampaignEdit({
    campaign,
    campaignTypes,
    campaignStatuses,
    campaignChannels,
}: CampaignEditProps) {
    const { data, setData, put, processing, errors } = useForm({
        name: campaign.name || '',
        description: campaign.description || '',
        campaign_type_id: campaign.campaign_type_id || '',
        campaign_status_id: campaign.campaign_status_id || '',
        campaign_channel_id: campaign.campaign_channel_id || '',
        start_date: campaign.start_date || '',
        end_date: campaign.end_date || '',
        expected_budget: campaign.expected_budget || '',
        expected_roi: campaign.expected_roi || '',
        expected_leads: campaign.expected_leads || '',
        expected_conversions: campaign.expected_conversions || '',
        expected_conversion_rate: campaign.expected_conversion_rate || '',
        expected_reach: campaign.expected_reach || '',
        expected_impressions: campaign.expected_impressions || '',
        expected_clicks: campaign.expected_clicks || '',
        expected_ctr: campaign.expected_ctr || '',
        expected_revenue: campaign.expected_revenue || '',
        actual_spend: campaign.actual_spend || '',
        actual_roi: campaign.actual_roi || '',
        actual_leads: campaign.actual_leads || '',
        actual_conversions: campaign.actual_conversions || '',
        actual_conversion_rate: campaign.actual_conversion_rate || '',
        actual_reach: campaign.actual_reach || '',
        actual_impressions: campaign.actual_impressions || '',
        actual_clicks: campaign.actual_clicks || '',
        actual_ctr: campaign.actual_ctr || '',
        actual_revenue: campaign.actual_revenue || '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(`/marketing/campaigns/${campaign.id}`);
    };

    return (
        <AppLayout>
            <Head title={`Edit ${campaign.name}`} />

            <div className="p-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold">Edit Campaign</h1>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        Update campaign details and metrics
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
                            <div className="md:col-span-2">
                                <FormField
                                    label="Campaign Name"
                                    name="name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    error={errors.name}
                                    required
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
                                    required
                                >
                                    <option value="">Select Type</option>
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
                            </div>

                            <div>
                                <Label htmlFor="campaign_status_id">Status *</Label>
                                <select
                                    id="campaign_status_id"
                                    name="campaign_status_id"
                                    value={data.campaign_status_id}
                                    onChange={(e) => setData('campaign_status_id', e.target.value)}
                                    className="w-full rounded-md border px-3 py-2"
                                    required
                                >
                                    <option value="">Select Status</option>
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
                            </div>

                            <div>
                                <Label htmlFor="campaign_channel_id">Channel *</Label>
                                <select
                                    id="campaign_channel_id"
                                    name="campaign_channel_id"
                                    value={data.campaign_channel_id}
                                    onChange={(e) => setData('campaign_channel_id', e.target.value)}
                                    className="w-full rounded-md border px-3 py-2"
                                    required
                                >
                                    <option value="">Select Channel</option>
                                    {campaignChannels.map((channel) => (
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
                        <h2 className="mb-4 text-lg font-semibold">Expected Metrics (Goals)</h2>
                        <div className="grid gap-4 md:grid-cols-3">
                            <FormField
                                label="Budget ($)"
                                name="expected_budget"
                                type="number"
                                value={data.expected_budget}
                                onChange={(e) => setData('expected_budget', e.target.value)}
                                error={errors.expected_budget}
                            />

                            <FormField
                                label="ROI (%)"
                                name="expected_roi"
                                type="number"
                                value={data.expected_roi}
                                onChange={(e) => setData('expected_roi', e.target.value)}
                                error={errors.expected_roi}
                            />

                            <FormField
                                label="Revenue ($)"
                                name="expected_revenue"
                                type="number"
                                value={data.expected_revenue}
                                onChange={(e) => setData('expected_revenue', e.target.value)}
                                error={errors.expected_revenue}
                            />

                            <FormField
                                label="Leads"
                                name="expected_leads"
                                type="number"
                                value={data.expected_leads}
                                onChange={(e) => setData('expected_leads', e.target.value)}
                                error={errors.expected_leads}
                            />

                            <FormField
                                label="Conversions"
                                name="expected_conversions"
                                type="number"
                                value={data.expected_conversions}
                                onChange={(e) => setData('expected_conversions', e.target.value)}
                                error={errors.expected_conversions}
                            />

                            <FormField
                                label="Conversion Rate (%)"
                                name="expected_conversion_rate"
                                type="number"
                                value={data.expected_conversion_rate}
                                onChange={(e) =>
                                    setData('expected_conversion_rate', e.target.value)
                                }
                                error={errors.expected_conversion_rate}
                            />

                            <FormField
                                label="Reach"
                                name="expected_reach"
                                type="number"
                                value={data.expected_reach}
                                onChange={(e) => setData('expected_reach', e.target.value)}
                                error={errors.expected_reach}
                            />

                            <FormField
                                label="Impressions"
                                name="expected_impressions"
                                type="number"
                                value={data.expected_impressions}
                                onChange={(e) => setData('expected_impressions', e.target.value)}
                                error={errors.expected_impressions}
                            />

                            <FormField
                                label="Clicks"
                                name="expected_clicks"
                                type="number"
                                value={data.expected_clicks}
                                onChange={(e) => setData('expected_clicks', e.target.value)}
                                error={errors.expected_clicks}
                            />

                            <FormField
                                label="CTR (%)"
                                name="expected_ctr"
                                type="number"
                                value={data.expected_ctr}
                                onChange={(e) => setData('expected_ctr', e.target.value)}
                                error={errors.expected_ctr}
                            />
                        </div>
                    </Card>

                    {/* Actual Metrics */}
                    <Card className="p-6">
                        <h2 className="mb-4 text-lg font-semibold">Actual Metrics (Performance)</h2>
                        <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">
                            Track the actual performance against your expected goals
                        </p>
                        <div className="grid gap-4 md:grid-cols-3">
                            <FormField
                                label="Actual Spend ($)"
                                name="actual_spend"
                                type="number"
                                value={data.actual_spend}
                                onChange={(e) => setData('actual_spend', e.target.value)}
                                error={errors.actual_spend}
                            />

                            <FormField
                                label="Actual ROI (%)"
                                name="actual_roi"
                                type="number"
                                value={data.actual_roi}
                                onChange={(e) => setData('actual_roi', e.target.value)}
                                error={errors.actual_roi}
                            />

                            <FormField
                                label="Actual Revenue ($)"
                                name="actual_revenue"
                                type="number"
                                value={data.actual_revenue}
                                onChange={(e) => setData('actual_revenue', e.target.value)}
                                error={errors.actual_revenue}
                            />

                            <FormField
                                label="Actual Leads"
                                name="actual_leads"
                                type="number"
                                value={data.actual_leads}
                                onChange={(e) => setData('actual_leads', e.target.value)}
                                error={errors.actual_leads}
                            />

                            <FormField
                                label="Actual Conversions"
                                name="actual_conversions"
                                type="number"
                                value={data.actual_conversions}
                                onChange={(e) => setData('actual_conversions', e.target.value)}
                                error={errors.actual_conversions}
                            />

                            <FormField
                                label="Actual Conversion Rate (%)"
                                name="actual_conversion_rate"
                                type="number"
                                value={data.actual_conversion_rate}
                                onChange={(e) =>
                                    setData('actual_conversion_rate', e.target.value)
                                }
                                error={errors.actual_conversion_rate}
                            />

                            <FormField
                                label="Actual Reach"
                                name="actual_reach"
                                type="number"
                                value={data.actual_reach}
                                onChange={(e) => setData('actual_reach', e.target.value)}
                                error={errors.actual_reach}
                            />

                            <FormField
                                label="Actual Impressions"
                                name="actual_impressions"
                                type="number"
                                value={data.actual_impressions}
                                onChange={(e) => setData('actual_impressions', e.target.value)}
                                error={errors.actual_impressions}
                            />

                            <FormField
                                label="Actual Clicks"
                                name="actual_clicks"
                                type="number"
                                value={data.actual_clicks}
                                onChange={(e) => setData('actual_clicks', e.target.value)}
                                error={errors.actual_clicks}
                            />

                            <FormField
                                label="Actual CTR (%)"
                                name="actual_ctr"
                                type="number"
                                value={data.actual_ctr}
                                onChange={(e) => setData('actual_ctr', e.target.value)}
                                error={errors.actual_ctr}
                            />
                        </div>
                    </Card>

                    {/* Actions */}
                    <div className="flex justify-end gap-4">
                        <Link href={`/marketing/campaigns/${campaign.id}`}>
                            <Button type="button" variant="outline">
                                Cancel
                            </Button>
                        </Link>
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Updating...' : 'Update Campaign'}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}

