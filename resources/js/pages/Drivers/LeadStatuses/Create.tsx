import { FormField } from '@/components/core/form-field';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, useForm } from '@inertiajs/react';

interface LeadStatusOption {
    id: number;
    name: string;
}

interface LeadStatusesCreateProps {
    availableLeadStatuses?: LeadStatusOption[];
}

const DURATION_UNITS = [
    { value: 'minutes', label: 'Minutes' },
    { value: 'hours', label: 'Hours' },
    { value: 'days', label: 'Days' },
];

export default function LeadStatusesCreate({ availableLeadStatuses = [] }: LeadStatusesCreateProps) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        slug: '',
        description: '',
        color: '#3b82f6',
        order: 0,
        active: true,
        duration_value: '',
        duration_unit: '',
        change_to_lead_status_id: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/drivers/lead-statuses');
    };

    return (
        <AppLayout>
            <Head title="Create Lead Status" />

            <div className="p-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold">Create Lead Status</h1>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        Add a new lead status for tracking lead progress
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
                                    label="Name"
                                    name="name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    error={errors.name}
                                    required
                                    placeholder="e.g., New, Contacted, Qualified"
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
                                    placeholder="Lead status description..."
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
                                label="Order"
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
                        </div>
                    </Card>

                    <Card className="p-6">
                        <h2 className="mb-4 text-lg font-semibold">Lead Status Duration</h2>
                        <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">
                            After this duration from when the lead entered this status, automatically change to the selected status.
                        </p>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <Label htmlFor="duration_value">Duration (number)</Label>
                                <input
                                    id="duration_value"
                                    name="duration_value"
                                    type="number"
                                    min={0}
                                    value={data.duration_value}
                                    onChange={(e) => setData('duration_value', e.target.value ? parseInt(e.target.value, 10) : '')}
                                    className="w-full rounded-md border px-3 py-2 dark:border-neutral-600 dark:bg-neutral-800"
                                    placeholder="e.g. 3"
                                />
                                {errors.duration_value && (
                                    <p className="text-sm text-red-500">{errors.duration_value}</p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="duration_unit">Unit</Label>
                                <select
                                    id="duration_unit"
                                    name="duration_unit"
                                    value={data.duration_unit}
                                    onChange={(e) => setData('duration_unit', e.target.value)}
                                    className="w-full rounded-md border px-3 py-2 dark:border-neutral-600 dark:bg-neutral-800"
                                >
                                    <option value="">—</option>
                                    {DURATION_UNITS.map((u) => (
                                        <option key={u.value} value={u.value}>{u.label}</option>
                                    ))}
                                </select>
                                {errors.duration_unit && (
                                    <p className="text-sm text-red-500">{errors.duration_unit}</p>
                                )}
                            </div>
                            <div className="md:col-span-2">
                                <Label htmlFor="change_to_lead_status_id">Change Lead Status After Duration</Label>
                                <select
                                    id="change_to_lead_status_id"
                                    name="change_to_lead_status_id"
                                    value={data.change_to_lead_status_id}
                                    onChange={(e) => setData('change_to_lead_status_id', e.target.value)}
                                    className="w-full rounded-md border px-3 py-2 dark:border-neutral-600 dark:bg-neutral-800"
                                >
                                    <option value="">— Do not change —</option>
                                    {availableLeadStatuses.map((ls) => (
                                        <option key={ls.id} value={ls.id}>{ls.name}</option>
                                    ))}
                                </select>
                                {errors.change_to_lead_status_id && (
                                    <p className="text-sm text-red-500">{errors.change_to_lead_status_id}</p>
                                )}
                            </div>
                        </div>
                    </Card>

                    <div className="flex justify-end gap-4">
                        <Link href="/drivers/lead-statuses">
                            <Button type="button" variant="outline">
                                Cancel
                            </Button>
                        </Link>
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Creating...' : 'Create Lead Status'}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}

