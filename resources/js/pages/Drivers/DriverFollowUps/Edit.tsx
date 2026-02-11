import { FormField } from '@/components/core/form-field';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, useForm, usePage } from '@inertiajs/react';

interface Driver {
    id: number;
    full_name: string;
    phone: string;
}

interface User {
    id: number;
    name: string;
}

interface DriverFollowUp {
    id: number;
    driver_id: number;
    assigned_to?: number;
    user_name: string;
    created_time: string;
    riding_company?: string;
    lead_stage?: string;
    notes?: string;
}

interface DriverFollowUpsEditProps {
    followUp: DriverFollowUp;
    drivers: Driver[];
    users: User[];
}

export default function DriverFollowUpsEdit({
    followUp,
    drivers,
    users,
}: DriverFollowUpsEditProps) {
    const page = usePage();
    const isSuperAdmin = (page.props as any).auth?.user?.is_super_admin ?? false;
    const { data, setData, put, processing, errors } = useForm({
        assigned_to: followUp.assigned_to?.toString() || '',
        user_name: followUp.user_name || '',
        created_time: followUp.created_time
            ? new Date(followUp.created_time).toISOString().slice(0, 16)
            : new Date().toISOString().slice(0, 16),
        lead_stage: followUp.lead_stage || '',
        notes: followUp.notes || '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(`/leads/lead-follow-ups/${followUp.id}`);
    };

    return (
        <AppLayout>
            <Head title="Edit Follow-up" />

            <div className="p-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold">Edit Follow-up</h1>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        Update follow-up record information
                    </p>
                </div>

                <Card className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="assigned_to">Assigned To</Label>
                                <select
                                    id="assigned_to"
                                    name="assigned_to"
                                    value={data.assigned_to}
                                    onChange={(e) => setData('assigned_to', e.target.value)}
                                    className="w-full rounded-md border px-3 py-2"
                                >
                                    <option value="">Select a user</option>
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

                            <FormField
                                label={isSuperAdmin ? 'User Name (Signed 2)' : 'User Name *'}
                                name="user_name"
                                value={data.user_name}
                                onChange={(e) => setData('user_name', e.target.value)}
                                error={errors.user_name}
                                placeholder="Enter the name of the user who made the change"
                                required={!isSuperAdmin}
                            />

                            <div className="space-y-2">
                                <Label htmlFor="created_time">Created Time *</Label>
                                <input
                                    type="datetime-local"
                                    id="created_time"
                                    name="created_time"
                                    value={data.created_time}
                                    onChange={(e) => setData('created_time', e.target.value)}
                                    className="w-full rounded-md border px-3 py-2"
                                    required
                                />
                                {errors.created_time && (
                                    <p className="text-sm text-red-500">{errors.created_time}</p>
                                )}
                            </div>

                            <FormField
                                label="Lead Stage"
                                name="lead_stage"
                                value={data.lead_stage}
                                onChange={(e) => setData('lead_stage', e.target.value)}
                                error={errors.lead_stage}
                                placeholder="Enter lead stage name"
                            />

                            <div className="space-y-2">
                                <Label htmlFor="notes">Notes</Label>
                                <textarea
                                    id="notes"
                                    name="notes"
                                    value={data.notes}
                                    onChange={(e) => setData('notes', e.target.value)}
                                    className="w-full rounded-md border px-3 py-2"
                                    rows={4}
                                    placeholder="Enter notes"
                                />
                                {errors.notes && (
                                    <p className="text-sm text-red-500">{errors.notes}</p>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end gap-4">
                            <Link href="/leads/lead-follow-ups">
                                <Button type="button" variant="outline">
                                    Cancel
                                </Button>
                            </Link>
                            <Button type="submit" disabled={processing}>
                                {processing ? 'Updating...' : 'Update Follow-up'}
                            </Button>
                        </div>
                    </form>
                </Card>
            </div>
        </AppLayout>
    );
}

