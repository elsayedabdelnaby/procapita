import { FormField } from '@/components/core/form-field';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, useForm } from '@inertiajs/react';

interface Driver {
    id: number;
    full_name: string;
}

interface RidingCompany {
    id: number;
    name: string;
}

interface DriverStage {
    id: number;
    driver_id: number;
    riding_company_id: number;
    stage_order: number;
    status: string;
    notes?: string;
}

interface DriverStagesEditProps {
    driverStage: DriverStage;
    drivers: Driver[];
    ridingCompanies: RidingCompany[];
}

export default function DriverStagesEdit({
    driverStage,
    drivers,
    ridingCompanies,
}: DriverStagesEditProps) {
    const { data, setData, put, processing, errors } = useForm({
        driver_id: driverStage.driver_id.toString(),
        riding_company_id: driverStage.riding_company_id?.toString() || '',
        stage_order: driverStage.stage_order.toString(),
        status: driverStage.status || 'pending',
        notes: driverStage.notes || '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(`/drivers/driver-stages/${driverStage.id}`);
    };

    return (
        <AppLayout>
            <Head title="Edit Driver Stage" />

            <div className="p-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold">Edit Driver Stage</h1>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        Update driver stage information
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
                            <div>
                                <Label htmlFor="driver_id">
                                    Driver <span className="text-red-500">*</span>
                                </Label>
                                <select
                                    id="driver_id"
                                    name="driver_id"
                                    value={data.driver_id}
                                    onChange={(e) => setData('driver_id', e.target.value)}
                                    className="w-full rounded-md border px-3 py-2"
                                    required
                                >
                                    <option value="">Select a driver</option>
                                    {drivers.map((driver) => (
                                        <option key={driver.id} value={driver.id}>
                                            {driver.full_name}
                                        </option>
                                    ))}
                                </select>
                                {errors.driver_id && (
                                    <p className="text-sm text-red-500">{errors.driver_id}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="riding_company_id">
                                    Riding Company <span className="text-red-500">*</span>
                                </Label>
                                <select
                                    id="riding_company_id"
                                    name="riding_company_id"
                                    value={data.riding_company_id}
                                    onChange={(e) => setData('riding_company_id', e.target.value)}
                                    className="w-full rounded-md border px-3 py-2"
                                    required
                                >
                                    <option value="">Select a riding company</option>
                                    {ridingCompanies.map((company) => (
                                        <option key={company.id} value={company.id}>
                                            {company.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.riding_company_id && (
                                    <p className="text-sm text-red-500">{errors.riding_company_id}</p>
                                )}
                            </div>

                            <div>
                                <FormField
                                    label="Stage Order"
                                    name="stage_order"
                                    type="number"
                                    value={data.stage_order}
                                    onChange={(e) => setData('stage_order', e.target.value)}
                                    error={errors.stage_order}
                                    required
                                    min="1"
                                />
                            </div>

                            <div>
                                <Label htmlFor="status">Status</Label>
                                <select
                                    id="status"
                                    name="status"
                                    value={data.status}
                                    onChange={(e) => setData('status', e.target.value)}
                                    className="w-full rounded-md border px-3 py-2"
                                >
                                    <option value="pending">Pending</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="completed">Completed</option>
                                    <option value="rejected">Rejected</option>
                                </select>
                                {errors.status && (
                                    <p className="text-sm text-red-500">{errors.status}</p>
                                )}
                            </div>

                            <div className="md:col-span-2">
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
                        <Link href="/drivers/driver-stages">
                            <Button type="button" variant="outline">
                                Cancel
                            </Button>
                        </Link>
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Updating...' : 'Update Driver Stage'}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}

