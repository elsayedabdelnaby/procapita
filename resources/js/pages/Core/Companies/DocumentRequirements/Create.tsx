import { FormField } from '@/components/core/form-field';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, useForm } from '@inertiajs/react';
import { ChevronLeft } from 'lucide-react';

interface Company {
    id: number;
    name: string;
}

interface DocumentRequirementsCreateProps {
    company: Company;
}

export default function DocumentRequirementsCreate({ company }: DocumentRequirementsCreateProps) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        type: 'file',
        required: false,
        instructions: '',
        active: true,
        default_status: 'pending',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(`/core/companies/${company.id}/document-requirements`);
    };

    return (
        <AppLayout>
            <Head title="Create Document Requirement" />

            <div className="p-6">
                <Link
                    href={`/core/companies/${company.id}/document-requirements`}
                    className="mb-4 inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Back to Documents Required
                </Link>
                <div className="mb-6">
                    <h1 className="text-2xl font-bold">Create Document Requirement</h1>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        Add a document requirement for reseller: <strong>{company.name}</strong>
                    </p>
                </div>

                {Object.keys(errors).length > 0 && (
                    <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
                        <ul className="list-inside list-disc space-y-1 text-sm text-red-700 dark:text-red-300">
                            {Object.entries(errors).map(([field, message]) => (
                                <li key={field}>{message}</li>
                            ))}
                        </ul>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <Card className="p-6">
                        <h2 className="mb-4 text-lg font-semibold">Requirement details</h2>
                        <div className="grid gap-4 md:grid-cols-2">
                            <FormField
                                label="Name"
                                required
                                error={errors.name}
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                placeholder="e.g. National ID"
                            />
                            <div className="space-y-2">
                                <Label>Type</Label>
                                <select
                                    value={data.type}
                                    onChange={(e) => setData('type', e.target.value)}
                                    className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 dark:border-neutral-600 dark:bg-neutral-800"
                                >
                                    <option value="file">File</option>
                                    <option value="pdf">PDF</option>
                                    <option value="text">Text</option>
                                </select>
                                {errors.type && <p className="text-sm text-red-500">{errors.type}</p>}
                            </div>
                            <div className="md:col-span-2 flex items-center gap-4">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={data.required}
                                        onChange={(e) => setData('required', e.target.checked)}
                                        className="rounded border-neutral-300"
                                    />
                                    <span className="text-sm">Required</span>
                                </label>
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={data.active}
                                        onChange={(e) => setData('active', e.target.checked)}
                                        className="rounded border-neutral-300"
                                    />
                                    <span className="text-sm">Active</span>
                                </label>
                            </div>
                            <div className="md:col-span-2">
                                <Label htmlFor="instructions">Instructions (optional)</Label>
                                <textarea
                                    id="instructions"
                                    value={data.instructions}
                                    onChange={(e) => setData('instructions', e.target.value)}
                                    rows={3}
                                    className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-600 dark:bg-neutral-800"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Default status for new documents</Label>
                                <select
                                    value={data.default_status}
                                    onChange={(e) => setData('default_status', e.target.value)}
                                    className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 dark:border-neutral-600 dark:bg-neutral-800"
                                >
                                    <option value="pending">Pending</option>
                                    <option value="approved">Approved</option>
                                    <option value="rejected">Rejected</option>
                                </select>
                            </div>
                        </div>
                    </Card>
                    <div className="flex gap-2">
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Creating...' : 'Create'}
                        </Button>
                        <Link href={`/core/companies/${company.id}/document-requirements`}>
                            <Button type="button" variant="outline">
                                Cancel
                            </Button>
                        </Link>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
