import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { Building2, Mail, MapPin, Phone } from 'lucide-react';

interface RidingCompany {
    id: number;
    uuid: string;
    name: string;
    slug: string;
    description?: string;
    country?: string;
    city?: string;
    logo_path?: string;
    contact_email?: string;
    contact_phone?: string;
    active: boolean;
    created_at: string;
    updated_at: string;
    creator?: {
        id: number;
        name: string;
        email: string;
    };
    stage_templates?: Array<{
        id: number;
        name: string;
        order: number;
        target_value: number;
        target_unit: string;
        duration_days: number;
        strict_sequence: boolean;
        allow_cumulative: boolean;
        active: boolean;
    }>;
    document_requirements?: Array<{
        id: number;
        name: string;
        type: string;
        required: boolean;
        active: boolean;
    }>;
    integrations?: Array<{
        id: number;
        type: string;
        active: boolean;
    }>;
    integration_settings?: Array<{
        id: number;
        type: string;
        active: boolean;
    }>;
}

interface RidingCompanyShowProps {
    ridingCompany: RidingCompany;
}

export default function RidingCompaniesShow({ ridingCompany }: RidingCompanyShowProps) {
    const handleDelete = () => {
        if (confirm(`Are you sure you want to delete "${ridingCompany.name}"?`)) {
            router.delete(`/ridingcarcompanies/riding-companies/${ridingCompany.id}`);
        }
    };

    const handleToggleStatus = () => {
        router.post(`/ridingcarcompanies/riding-companies/${ridingCompany.id}/toggle-active`);
    };

    return (
        <AppLayout>
            <Head title={ridingCompany.name} />

            <div className="p-6">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">{ridingCompany.name}</h1>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            Riding Company Details
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Link href="/ridingcarcompanies/riding-companies">
                            <Button variant="outline">Back to List</Button>
                        </Link>
                        <Link href={`/ridingcarcompanies/riding-companies/${ridingCompany.id}/edit`}>
                            <Button variant="outline">Edit</Button>
                        </Link>
                        <Button variant="outline" onClick={handleToggleStatus}>
                            {ridingCompany.active ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button variant="destructive" onClick={handleDelete}>
                            Delete
                        </Button>
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    <Card className="p-6">
                        <h2 className="mb-4 text-lg font-semibold">Company Information</h2>
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-neutral-500">Name</p>
                                <p className="font-medium">{ridingCompany.name}</p>
                            </div>
                            <div>
                                <p className="text-sm text-neutral-500">Slug</p>
                                <p className="font-medium">{ridingCompany.slug}</p>
                            </div>
                            {ridingCompany.description && (
                                <div>
                                    <p className="text-sm text-neutral-500">Description</p>
                                    <p className="font-medium">{ridingCompany.description}</p>
                                </div>
                            )}
                            <div>
                                <p className="text-sm text-neutral-500">Status</p>
                                <Badge variant={ridingCompany.active ? 'default' : 'secondary'}>
                                    {ridingCompany.active ? 'Active' : 'Inactive'}
                                </Badge>
                            </div>
                            <div>
                                <p className="text-sm text-neutral-500">UUID</p>
                                <p className="font-mono text-xs">{ridingCompany.uuid}</p>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <h2 className="mb-4 text-lg font-semibold">Contact Information</h2>
                        <div className="space-y-4">
                            {(ridingCompany.country || ridingCompany.city) && (
                                <div className="flex items-start gap-2">
                                    <MapPin className="mt-0.5 h-4 w-4 text-neutral-500" />
                                    <div>
                                        <p className="text-sm text-neutral-500">Location</p>
                                        <p className="font-medium">
                                            {[ridingCompany.city, ridingCompany.country]
                                                .filter(Boolean)
                                                .join(', ') || '-'}
                                        </p>
                                    </div>
                                </div>
                            )}
                            {ridingCompany.contact_email && (
                                <div className="flex items-start gap-2">
                                    <Mail className="mt-0.5 h-4 w-4 text-neutral-500" />
                                    <div>
                                        <p className="text-sm text-neutral-500">Email</p>
                                        <p className="font-medium">{ridingCompany.contact_email}</p>
                                    </div>
                                </div>
                            )}
                            {ridingCompany.contact_phone && (
                                <div className="flex items-start gap-2">
                                    <Phone className="mt-0.5 h-4 w-4 text-neutral-500" />
                                    <div>
                                        <p className="text-sm text-neutral-500">Phone</p>
                                        <p className="font-medium">{ridingCompany.contact_phone}</p>
                                    </div>
                                </div>
                            )}
                            {ridingCompany.creator && (
                                <div className="flex items-start gap-2">
                                    <Building2 className="mt-0.5 h-4 w-4 text-neutral-500" />
                                    <div>
                                        <p className="text-sm text-neutral-500">Created By</p>
                                        <p className="font-medium">{ridingCompany.creator.name}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>

                    <Card className="p-6 md:col-span-2">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-lg font-semibold">Stage Templates</h2>
                            <div className="flex gap-2">
                                <Link
                                    href={`/ridingcarcompanies/riding-companies/${ridingCompany.id}/stage-templates`}
                                >
                                    <Button variant="outline" size="sm">
                                        View All
                                    </Button>
                                </Link>
                                <Link
                                    href={`/ridingcarcompanies/riding-companies/${ridingCompany.id}/stage-templates/create`}
                                >
                                    <Button size="sm">
                                        Create New Stage
                                    </Button>
                                </Link>
                            </div>
                        </div>
                        {ridingCompany.stage_templates && ridingCompany.stage_templates.length > 0 ? (
                            <div className="space-y-3">
                                {ridingCompany.stage_templates
                                    .sort((a, b) => a.order - b.order)
                                    .map((template) => (
                                        <div
                                            key={template.id}
                                            className="flex items-center justify-between rounded-md border p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                                        >
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <Link
                                                        href={`/ridingcarcompanies/stage-templates/${template.id}/edit`}
                                                        className="font-medium hover:underline"
                                                    >
                                                        {template.name}
                                                    </Link>
                                                    <Badge variant={template.active ? 'default' : 'secondary'} className="text-xs">
                                                        {template.active ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                </div>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-neutral-600 dark:text-neutral-400">
                                                    <div>
                                                        <span className="text-neutral-500">Order: </span>
                                                        <span className="font-medium">{template.order}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-neutral-500">Target: </span>
                                                        <span className="font-medium">
                                                            {template.target_value} {template.target_unit}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-neutral-500">Duration: </span>
                                                        <span className="font-medium">{template.duration_days} days</span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        {template.strict_sequence && (
                                                            <Badge variant="outline" className="text-xs">
                                                                Strict
                                                            </Badge>
                                                        )}
                                                        {template.allow_cumulative && (
                                                            <Badge variant="outline" className="text-xs">
                                                                Cumulative
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="ml-4">
                                                <Link
                                                    href={`/ridingcarcompanies/stage-templates/${template.id}/edit`}
                                                >
                                                    <Button variant="ghost" size="sm">
                                                        Edit
                                                    </Button>
                                                </Link>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        ) : (
                            <div className="py-8 text-center text-neutral-500">
                                <p className="mb-4">No stage templates found.</p>
                                <Link
                                    href={`/ridingcarcompanies/riding-companies/${ridingCompany.id}/stage-templates/create`}
                                >
                                    <Button size="sm">Create First Stage Template</Button>
                                </Link>
                            </div>
                        )}
                    </Card>

                    <Card className="p-6 md:col-span-2">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-lg font-semibold">Document Requirements</h2>
                            <div className="flex gap-2">
                                <Link
                                    href={`/ridingcarcompanies/riding-companies/${ridingCompany.id}/document-requirements`}
                                >
                                    <Button variant="outline" size="sm">
                                        View All
                                    </Button>
                                </Link>
                                <Link
                                    href={`/ridingcarcompanies/riding-companies/${ridingCompany.id}/document-requirements/create`}
                                >
                                    <Button size="sm">
                                        Create New Requirement
                                    </Button>
                                </Link>
                            </div>
                        </div>
                        {ridingCompany.document_requirements && ridingCompany.document_requirements.length > 0 ? (
                            <div className="space-y-3">
                                {ridingCompany.document_requirements.map((req) => (
                                    <div
                                        key={req.id}
                                        className="flex items-center justify-between rounded-md border p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <Link
                                                    href={`/ridingcarcompanies/document-requirements/${req.id}/edit`}
                                                    className="font-medium hover:underline"
                                                >
                                                    {req.name}
                                                </Link>
                                                <Badge variant={req.active ? 'default' : 'secondary'} className="text-xs">
                                                    {req.active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </div>
                                            <div className="flex gap-2">
                                                <Badge variant="outline" className="text-xs capitalize">
                                                    {req.type}
                                                </Badge>
                                                {req.required && (
                                                    <Badge variant="destructive" className="text-xs">
                                                        Required
                                                    </Badge>
                                                )}
                                                {!req.required && (
                                                    <Badge variant="secondary" className="text-xs">
                                                        Optional
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                        <div className="ml-4">
                                            <Link
                                                href={`/ridingcarcompanies/document-requirements/${req.id}/edit`}
                                            >
                                                <Button variant="ghost" size="sm">
                                                    Edit
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-8 text-center text-neutral-500">
                                <p className="mb-4">No document requirements found.</p>
                                <Link
                                    href={`/ridingcarcompanies/riding-companies/${ridingCompany.id}/document-requirements/create`}
                                >
                                    <Button size="sm">Create First Document Requirement</Button>
                                </Link>
                            </div>
                        )}
                    </Card>

                    {ridingCompany.integrations && ridingCompany.integrations.length > 0 && (
                        <Card className="p-6">
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="text-lg font-semibold">Integrations</h2>
                                <Link
                                    href={`/ridingcarcompanies/riding-companies/${ridingCompany.id}/integrations`}
                                >
                                    <Button variant="outline" size="sm">
                                        Manage
                                    </Button>
                                </Link>
                            </div>
                            <div className="space-y-2">
                                {ridingCompany.integrations.map((integration) => (
                                    <div
                                        key={integration.id}
                                        className="flex items-center justify-between rounded-md border p-2"
                                    >
                                        <div>
                                            <p className="font-medium capitalize">{integration.type}</p>
                                            <Badge
                                                variant={integration.active ? 'default' : 'secondary'}
                                                className="text-xs"
                                            >
                                                {integration.active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                    {ridingCompany.integration_settings &&
                        ridingCompany.integration_settings.length > 0 && (
                            <Card className="p-6">
                                <div className="mb-4 flex items-center justify-between">
                                    <h2 className="text-lg font-semibold">Integration Settings</h2>
                                    <Link
                                        href={`/ridingcarcompanies/riding-companies/${ridingCompany.id}/integration-settings`}
                                    >
                                        <Button variant="outline" size="sm">
                                            Manage
                                        </Button>
                                    </Link>
                                </div>
                                <div className="space-y-2">
                                    {ridingCompany.integration_settings.map((setting) => (
                                        <div
                                            key={setting.id}
                                            className="flex items-center justify-between rounded-md border p-2"
                                        >
                                            <div>
                                                <p className="font-medium capitalize">{setting.type}</p>
                                                <Badge
                                                    variant={setting.active ? 'default' : 'secondary'}
                                                    className="text-xs"
                                                >
                                                    {setting.active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        )}
                </div>
            </div>
        </AppLayout>
    );
}

