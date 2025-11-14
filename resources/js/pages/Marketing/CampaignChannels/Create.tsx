import { FormField } from '@/components/core/form-field';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { type Company } from '@/types/core';
import { type CampaignType } from '@/types/marketing';
import { Head, Link, router, useForm } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useState } from 'react';

interface CampaignChannelCreateProps {
    campaignTypes: CampaignType[];
    companies?: Company[];
    company?: Company;
}

export default function CampaignChannelCreate({
    campaignTypes: initialCampaignTypes,
    companies,
    company,
}: CampaignChannelCreateProps) {
    const [campaignTypes, setCampaignTypes] = useState<CampaignType[]>(
        initialCampaignTypes || []
    );
    const [loadingTypes, setLoadingTypes] = useState(false);

    const { data, setData, post, processing, errors } = useForm({
        campaign_type_id: '',
        name: '',
        slug: '',
        description: '',
        icon: '',
        is_active: true,
        sort_order: 0,
        company_id: company?.id || '',
    });

    // Fetch campaign types when company changes (for super admin)
    useEffect(() => {
        if (companies && data.company_id) {
            setLoadingTypes(true);
            axios
                .get(`/api/marketing/companies/${data.company_id}/campaign-types`)
                .then((response) => {
                    setCampaignTypes(response.data);
                    setData('campaign_type_id', '');
                })
                .catch((error) => {
                    console.error('Error fetching campaign types:', error);
                    setCampaignTypes([]);
                })
                .finally(() => {
                    setLoadingTypes(false);
                });
        }
    }, [data.company_id]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/marketing/campaign-channels');
    };

    return (
        <AppLayout>
            <Head title="Create Campaign Channel" />

            <div className="p-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold">Create Campaign Channel</h1>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        Create a new channel for a campaign type
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
                                <Label htmlFor="campaign_type_id">Campaign Type *</Label>
                                <select
                                    id="campaign_type_id"
                                    name="campaign_type_id"
                                    value={data.campaign_type_id}
                                    onChange={(e) => setData('campaign_type_id', e.target.value)}
                                    className="w-full rounded-md border px-3 py-2"
                                    disabled={loadingTypes || (companies && !data.company_id)}
                                    required
                                >
                                    <option value="">
                                        {loadingTypes
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
                                {companies && data.company_id && campaignTypes.length === 0 && !loadingTypes && (
                                    <p className="text-sm text-yellow-600">
                                        No campaign types available for this company
                                    </p>
                                )}
                            </div>

                            <div className="md:col-span-2">
                                <FormField
                                    label="Name"
                                    name="name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    error={errors.name}
                                    required
                                    placeholder="e.g., MailChimp, Facebook Ads"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <FormField
                                    label="Slug"
                                    name="slug"
                                    value={data.slug}
                                    onChange={(e) => setData('slug', e.target.value)}
                                    error={errors.slug}
                                    placeholder="e.g., mailchimp, facebook-ads (auto-generated if empty)"
                                    helpText="Leave empty to auto-generate from name"
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
                                    placeholder="Channel description..."
                                />
                                {errors.description && (
                                    <p className="text-sm text-red-500">{errors.description}</p>
                                )}
                            </div>

                            <FormField
                                label="Icon"
                                name="icon"
                                value={data.icon}
                                onChange={(e) => setData('icon', e.target.value)}
                                error={errors.icon}
                                placeholder="e.g., Mail, Share2"
                            />

                            <FormField
                                label="Sort Order"
                                name="sort_order"
                                type="number"
                                value={data.sort_order}
                                onChange={(e) => setData('sort_order', parseInt(e.target.value) || 0)}
                                error={errors.sort_order}
                            />

                            <div>
                                <Label htmlFor="is_active" className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="is_active"
                                        name="is_active"
                                        checked={data.is_active}
                                        onChange={(e) => setData('is_active', e.target.checked)}
                                        className="rounded border-gray-300"
                                    />
                                    <span>Active</span>
                                </Label>
                                {errors.is_active && (
                                    <p className="text-sm text-red-500">{errors.is_active}</p>
                                )}
                            </div>
                        </div>
                    </Card>

                    <div className="flex justify-end gap-4">
                        <Link href="/marketing/campaign-channels">
                            <Button type="button" variant="outline">
                                Cancel
                            </Button>
                        </Link>
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Creating...' : 'Create Channel'}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}

