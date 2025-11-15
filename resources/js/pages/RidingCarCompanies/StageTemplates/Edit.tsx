import { FormField } from '@/components/core/form-field';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, useForm } from '@inertiajs/react';

interface RidingCompany {
    id: number;
    name: string;
}

interface StageTemplate {
    id: number;
    riding_company_id: number;
    ridingCompany?: RidingCompany;
    name: string;
    order: number;
    target_value: number;
    target_unit: string;
    duration_days: number;
    strict_sequence: boolean;
    allow_cumulative: boolean;
    description?: string;
    active: boolean;
}

interface StageTemplatesEditProps {
    stageTemplate: StageTemplate;
}

export default function StageTemplatesEdit({ stageTemplate }: StageTemplatesEditProps) {
    const ridingCompany = stageTemplate.ridingCompany || { id: stageTemplate.riding_company_id, name: '' };

    const { data, setData, put, processing, errors } = useForm({
        name: stageTemplate.name || '',
        order: stageTemplate.order || 1,
        target_value: stageTemplate.target_value || 0,
        target_unit: stageTemplate.target_unit || 'rides',
        duration_days: stageTemplate.duration_days || 0,
        strict_sequence: stageTemplate.strict_sequence ?? false,
        allow_cumulative: stageTemplate.allow_cumulative ?? false,
        description: stageTemplate.description || '',
        active: stageTemplate.active ?? true,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(`/ridingcarcompanies/stage-templates/${stageTemplate.id}`);
    };

    return (
        <AppLayout>
            <Head title={`Edit Stage Template - ${stageTemplate.name}`} />

            <div className="p-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold">Edit Stage Template</h1>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        Update stage template for <strong>{ridingCompany.name}</strong>
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
                        <h2 className="mb-4 text-lg font-semibold">Stage Information</h2>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="md:col-span-2">
                                <FormField
                                    label="Stage Name"
                                    name="name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    error={errors.name}
                                    required
                                />
                            </div>

                            <FormField
                                label="Order"
                                name="order"
                                type="number"
                                value={data.order.toString()}
                                onChange={(e) => setData('order', parseInt(e.target.value) || 1)}
                                error={errors.order}
                                required
                                min={1}
                            />

                            <FormField
                                label="Target Value"
                                name="target_value"
                                type="number"
                                value={data.target_value.toString()}
                                onChange={(e) => setData('target_value', parseInt(e.target.value) || 0)}
                                error={errors.target_value}
                                required
                                min={0}
                            />

                            <div>
                                <Label htmlFor="target_unit">
                                    Target Unit <span className="text-red-500">*</span>
                                </Label>
                                <select
                                    id="target_unit"
                                    name="target_unit"
                                    value={data.target_unit}
                                    onChange={(e) => setData('target_unit', e.target.value)}
                                    className="w-full rounded-md border px-3 py-2"
                                    required
                                >
                                    <option value="rides">Rides</option>
                                    <option value="hours">Hours</option>
                                    <option value="days">Days</option>
                                </select>
                                {errors.target_unit && (
                                    <p className="text-sm text-red-500">{errors.target_unit}</p>
                                )}
                            </div>

                            <FormField
                                label="Duration (Days)"
                                name="duration_days"
                                type="number"
                                value={data.duration_days.toString()}
                                onChange={(e) => setData('duration_days', parseInt(e.target.value) || 0)}
                                error={errors.duration_days}
                                required
                                min={0}
                            />

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
                                <Label htmlFor="strict_sequence" className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="strict_sequence"
                                        name="strict_sequence"
                                        checked={data.strict_sequence}
                                        onChange={(e) => setData('strict_sequence', e.target.checked)}
                                        className="rounded border-gray-300"
                                    />
                                    <span>Strict Sequence (Must complete previous stages first)</span>
                                </Label>
                                {errors.strict_sequence && (
                                    <p className="text-sm text-red-500">{errors.strict_sequence}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="allow_cumulative" className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="allow_cumulative"
                                        name="allow_cumulative"
                                        checked={data.allow_cumulative}
                                        onChange={(e) => setData('allow_cumulative', e.target.checked)}
                                        className="rounded border-gray-300"
                                    />
                                    <span>Allow Cumulative (Can accumulate with other stages)</span>
                                </Label>
                                {errors.allow_cumulative && (
                                    <p className="text-sm text-red-500">{errors.allow_cumulative}</p>
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
                        <Link
                            href={`/ridingcarcompanies/riding-companies/${ridingCompany.id}/stage-templates`}
                        >
                            <Button type="button" variant="outline">
                                Cancel
                            </Button>
                        </Link>
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Updating...' : 'Update Stage Template'}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}

