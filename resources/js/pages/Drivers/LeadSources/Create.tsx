import { FormField } from '@/components/core/form-field';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { type SharedData } from '@/types';
import { useEffect } from 'react';

interface Company {
    id: number;
    name: string;
}

interface LeadSourcesCreateProps {
    companies?: Company[];
}

export default function LeadSourcesCreate({ companies }: LeadSourcesCreateProps) {
    const page = usePage<SharedData>();
    const { selectedCompany } = page.props;
    
    const { data, setData, post, processing, errors } = useForm({
        company_id: selectedCompany ? String(selectedCompany.id) : '',
        name: '',
        slug: '',
        description: '',
        active: true,
    });

    // Set selected company on mount if available
    useEffect(() => {
        if (selectedCompany && !data.company_id) {
            setData('company_id', String(selectedCompany.id));
        }
    }, [selectedCompany]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/drivers/lead-sources');
    };

    return (
        <AppLayout>
            <Head title="Create Lead Source" />

            <div className="p-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold">Create Lead Source</h1>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        Add a new lead source to track where drivers come from
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
                                    label="Name"
                                    name="name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    error={errors.name}
                                    required
                                    placeholder="e.g., Facebook Ads, Google Ads"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <FormField
                                    label="Slug"
                                    name="slug"
                                    value={data.slug}
                                    onChange={(e) => setData('slug', e.target.value)}
                                    error={errors.slug}
                                    placeholder="auto-generated if left empty"
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
                                    placeholder="Lead source description..."
                                />
                                {errors.description && (
                                    <p className="text-sm text-red-500">{errors.description}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="active" className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="active"
                                        name="active"
                                        checked={data.active}
                                        onChange={(e) => setData('active', e.target.checked)}
                                        className="rounded border-gray-300"
                                    />
                                    <span>Active</span>
                                </Label>
                                {errors.active && (
                                    <p className="text-sm text-red-500">{errors.active}</p>
                                )}
                            </div>
                        </div>
                    </Card>

                    <div className="flex justify-end gap-4">
                        <Link href="/drivers/lead-sources">
                            <Button type="button" variant="outline">
                                Cancel
                            </Button>
                        </Link>
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Creating...' : 'Create Lead Source'}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}

