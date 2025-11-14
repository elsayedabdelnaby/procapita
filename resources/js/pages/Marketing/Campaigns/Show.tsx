import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type Campaign } from '@/types/marketing';
import { Head, Link, router } from '@inertiajs/react';
import { Calendar, DollarSign, Target, TrendingUp } from 'lucide-react';

interface CampaignShowProps {
    campaign: Campaign;
}

export default function CampaignShow({ campaign }: CampaignShowProps) {
    const handleDelete = () => {
        if (confirm(`Are you sure you want to delete "${campaign.name}"?`)) {
            router.delete(`/marketing/campaigns/${campaign.id}`);
        }
    };

    const handleToggleStatus = () => {
        const action = campaign.status?.slug === 'active' ? 'pause' : 'activate';
        router.post(`/marketing/campaigns/${campaign.id}/${action}`);
    };

    return (
        <AppLayout>
            <Head title={campaign.name} />

            <div className="p-6">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">{campaign.name}</h1>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            Campaign Details
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Link href="/marketing/campaigns">
                            <Button variant="outline">Back to List</Button>
                        </Link>
                        <Link href={`/marketing/campaigns/${campaign.id}/edit`}>
                            <Button variant="outline">Edit</Button>
                        </Link>
                        {(campaign.status?.slug === 'active' ||
                            campaign.status?.slug === 'paused') && (
                            <Button variant="outline" onClick={handleToggleStatus}>
                                {campaign.status?.slug === 'active' ? 'Pause' : 'Activate'}
                            </Button>
                        )}
                        <Button variant="destructive" onClick={handleDelete}>
                            Delete
                        </Button>
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    <Card className="p-6">
                        <h2 className="mb-4 text-lg font-semibold">Campaign Information</h2>
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-neutral-500">Name</p>
                                <p className="font-medium">{campaign.name}</p>
                            </div>
                            {campaign.description && (
                                <div>
                                    <p className="text-sm text-neutral-500">Description</p>
                                    <p className="font-medium">{campaign.description}</p>
                                </div>
                            )}
                            <div>
                                <p className="text-sm text-neutral-500">Type</p>
                                <Badge
                                    variant="secondary"
                                    style={{ backgroundColor: campaign.type?.color }}
                                >
                                    {campaign.type?.name || '-'}
                                </Badge>
                            </div>
                            <div>
                                <p className="text-sm text-neutral-500">Status</p>
                                <Badge style={{ backgroundColor: campaign.status?.color }}>
                                    {campaign.status?.name || '-'}
                                </Badge>
                            </div>
                            {campaign.channel && (
                                <div>
                                    <p className="text-sm text-neutral-500">Channel</p>
                                    <Badge variant="outline">{campaign.channel.name}</Badge>
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-neutral-500" />
                                <div>
                                    <p className="text-sm text-neutral-500">Duration</p>
                                    <p className="font-medium">
                                        {new Date(campaign.start_date).toLocaleDateString()}
                                        {campaign.end_date &&
                                            ` - ${new Date(campaign.end_date).toLocaleDateString()}`}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <h2 className="mb-4 text-lg font-semibold">Expected Metrics</h2>
                        <div className="space-y-4">
                            {campaign.expected_budget && (
                                <div className="flex items-center gap-2">
                                    <DollarSign className="h-4 w-4 text-green-500" />
                                    <div>
                                        <p className="text-sm text-neutral-500">Budget</p>
                                        <p className="font-medium">
                                            ${campaign.expected_budget.toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            )}
                            {campaign.expected_leads && (
                                <div className="flex items-center gap-2">
                                    <Target className="h-4 w-4 text-blue-500" />
                                    <div>
                                        <p className="text-sm text-neutral-500">Leads</p>
                                        <p className="font-medium">
                                            {campaign.expected_leads.toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            )}
                            {campaign.expected_conversions && (
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-purple-500" />
                                    <div>
                                        <p className="text-sm text-neutral-500">Conversions</p>
                                        <p className="font-medium">
                                            {campaign.expected_conversions.toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            )}
                            {campaign.expected_roi && (
                                <div>
                                    <p className="text-sm text-neutral-500">ROI</p>
                                    <p className="font-medium">{campaign.expected_roi}%</p>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}

