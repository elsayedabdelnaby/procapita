import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { Head, Link } from '@inertiajs/react';
import { formatDate } from '@/utils/date-format';

interface Driver {
    id: number;
    full_name: string;
    phone: string;
    email?: string;
}

interface User {
    id: number;
    name: string;
    email?: string;
}

interface DriverFollowUp {
    id: number;
    driver?: Driver;
    assigned_to?: number;
    assigned_to_user?: User;
    user_name: string;
    created_time: string;
    riding_company?: string;
    lead_stage?: string;
    lead_status?: string;
    lead_status_comment?: string;
    notes?: string;
    created_at: string;
    updated_at: string;
}

interface DriverFollowUpsShowProps {
    followUp: DriverFollowUp;
}

export default function DriverFollowUpsShow({ followUp }: DriverFollowUpsShowProps) {
    return (
        <AppLayout>
            <Head title="Follow-up Details" />

            <div className="p-6">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Follow-up Details</h1>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            View follow-up record information
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Link href={`/leads/lead-follow-ups/${followUp.id}/edit`}>
                            <Button variant="outline">Edit</Button>
                        </Link>
                        <Link href="/leads/lead-follow-ups">
                            <Button variant="outline">Back to List</Button>
                        </Link>
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    <Card className="p-6">
                        <h2 className="mb-4 text-lg font-semibold">Follow-up Information</h2>
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-neutral-500">Lead</p>
                                <p className="font-medium">
                                    {followUp.driver?.full_name || 'N/A'}
                                    {followUp.driver?.phone && ` (${followUp.driver.phone})`}
                                </p>
                            </div>

                            <div>
                                <p className="text-sm text-neutral-500">User Name</p>
                                <p className="font-medium">{followUp.user_name}</p>
                            </div>

                            <div>
                                <p className="text-sm text-neutral-500">Assigned To</p>
                                <p className="font-medium">
                                    {followUp.assigned_to_user?.name || 'N/A'}
                                </p>
                            </div>

                            <div>
                                <p className="text-sm text-neutral-500">Created Time</p>
                                <p className="font-medium">
                                    {followUp.created_time
                                        ? new Date(followUp.created_time).toLocaleString()
                                        : 'N/A'}
                                </p>
                            </div>

                            <div>
                                <p className="text-sm text-neutral-500">Stage</p>
                                <p className="font-medium">{followUp.lead_stage || 'N/A'}</p>
                            </div>

                            <div>
                                <p className="text-sm text-neutral-500">Lead Status</p>
                                <p className="font-medium">{followUp.lead_status || 'N/A'}</p>
                            </div>

                            {followUp.lead_status_comment && (
                                <div>
                                    <p className="text-sm text-neutral-500">Feedback Comment</p>
                                    <p className="font-medium whitespace-pre-wrap">{followUp.lead_status_comment}</p>
                                </div>
                            )}

                            {followUp.notes && (
                                <div>
                                    <p className="text-sm text-neutral-500">Notes</p>
                                    <p className="font-medium whitespace-pre-wrap">{followUp.notes}</p>
                                </div>
                            )}
                        </div>
                    </Card>

                    <Card className="p-6">
                        <h2 className="mb-4 text-lg font-semibold">Timestamps</h2>
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-neutral-500">Created At</p>
                                <p className="font-medium">
                                    {followUp.created_at
                                        ? formatDate(followUp.created_at)
                                        : 'N/A'}
                                </p>
                            </div>

                            <div>
                                <p className="text-sm text-neutral-500">Updated At</p>
                                <p className="font-medium">
                                    {followUp.updated_at
                                        ? formatDate(followUp.updated_at)
                                        : 'N/A'}
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}

