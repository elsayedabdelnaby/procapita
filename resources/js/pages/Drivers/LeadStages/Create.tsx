import { FormField } from '@/components/core/form-field';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { MultiSelect } from '@/components/ui/multi-select';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { type SharedData } from '@/types';
import axios from 'axios';
import { useEffect, useState } from 'react';

interface RidingCompany {
    id: number;
    name: string;
}

interface LeadStagesCreateProps {
    ridingCompanies?: RidingCompany[];
}

export default function LeadStagesCreate({ ridingCompanies: initialRidingCompanies = [] }: LeadStagesCreateProps) {
    const page = usePage<SharedData>();
    const { selectedCompany } = page.props;
    
    const [ridingCompanies, setRidingCompanies] = useState<RidingCompany[]>(initialRidingCompanies);
    const [loadingRidingCompanies, setLoadingRidingCompanies] = useState(false);

    // Initialize riding companies from props on mount
    useEffect(() => {
        if (initialRidingCompanies && initialRidingCompanies.length > 0) {
            setRidingCompanies(initialRidingCompanies);
        }
    }, []);

    const { data, setData, post, processing, errors } = useForm({
        riding_company_ids: [] as string[],
        name: '',
        slug: '',
        description: '',
        color: '#3b82f6',
        order: 0,
        active: true,
        requires_all_documents_approved: false,
    });

    // Load riding companies when selectedCompany changes
    useEffect(() => {
        setLoadingRidingCompanies(true);
        
        // If "All Companies" is selected (selectedCompany is null) and user is super admin, load all riding companies
        if (!selectedCompany && page.props.auth?.user?.is_super_admin) {
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
        } else if (selectedCompany?.id) {
            axios
                .get(`/api/drivers/companies/${selectedCompany.id}/riding-companies`)
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
            // If no selectedCompany or user is not super admin, use initial riding companies from controller
            setRidingCompanies(initialRidingCompanies);
            setLoadingRidingCompanies(false);
        }
    }, [selectedCompany?.id, initialRidingCompanies]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/drivers/lead-stages');
    };

    return (
        <AppLayout>
            <Head title="Create Lead Stage" />

            <div className="p-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold">Create Lead Stage</h1>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        Add a new lead stage for tracking driver progress by riding company
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
                            <div className="md:col-span-2">
                                <FormField
                                    label="Lead Stage Name"
                                    name="name"
                                    type="text"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    error={errors.name}
                                    required
                                    placeholder="Enter lead stage name"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <Label htmlFor="riding_company_ids">
                                    Riding Companies <span className="text-red-500">*</span>
                                </Label>
                                <MultiSelect
                                    options={ridingCompanies.map((company) => ({
                                        value: company.id.toString(),
                                        label: company.name,
                                    }))}
                                    value={data.riding_company_ids}
                                    onChange={(value) => setData('riding_company_ids', value)}
                                    placeholder="Select riding companies..."
                                    className="w-full"
                                    searchable={true}
                                />
                                {errors.riding_company_ids && (
                                    <p className="text-sm text-red-500 mt-1">{errors.riding_company_ids}</p>
                                )}
                                <p className="mt-1 text-xs text-neutral-500">
                                    Select one or more riding companies. This stage will be available for all drivers in the selected companies.
                                </p>
                            </div>

                            <div className="md:col-span-2">
                                <FormField
                                    label="Slug"
                                    name="slug"
                                    value={data.slug}
                                    onChange={(e) => setData('slug', e.target.value)}
                                    error={errors.slug}
                                    placeholder="auto-generated if left empty"
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
                                    placeholder="Lead stage description..."
                                />
                                {errors.description && (
                                    <p className="text-sm text-red-500">{errors.description}</p>
                                )}
                            </div>

                            <FormField
                                label="Color"
                                name="color"
                                type="color"
                                value={data.color}
                                onChange={(e) => setData('color', e.target.value)}
                                error={errors.color}
                            />

                            <FormField
                                label="Trip"
                                name="order"
                                type="number"
                                value={data.order}
                                onChange={(e) => setData('order', parseInt(e.target.value) || 0)}
                                error={errors.order}
                            />

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

                            <div>
                                <Label htmlFor="requires_all_documents_approved" className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="requires_all_documents_approved"
                                        name="requires_all_documents_approved"
                                        checked={data.requires_all_documents_approved}
                                        onChange={(e) => setData('requires_all_documents_approved', e.target.checked)}
                                        className="rounded border-gray-300"
                                    />
                                    <span>Requires All Documents Approved</span>
                                </Label>
                                <p className="mt-1 text-xs text-neutral-500">
                                    If checked, drivers must have all documents approved before moving to this stage
                                </p>
                                {errors.requires_all_documents_approved && (
                                    <p className="text-sm text-red-500">{errors.requires_all_documents_approved}</p>
                                )}
                            </div>

                        </div>
                    </Card>

                    <div className="flex justify-end gap-4">
                        <Link href="/drivers/lead-stages">
                            <Button type="button" variant="outline">
                                Cancel
                            </Button>
                        </Link>
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Creating...' : 'Create Lead Stage'}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}

