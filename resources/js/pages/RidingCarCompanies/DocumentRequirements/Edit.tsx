import { FormField } from '@/components/core/form-field';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { MultiSelect } from '@/components/ui/multi-select';
import { DataTable } from '@/components/core/data-table';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, useForm } from '@inertiajs/react';

interface RidingCompany {
    id: number;
    name: string;
}

interface DocumentRequirement {
    id: number;
    riding_company_id: number;
    ridingCompany?: RidingCompany;
    name: string;
    type: string;
    required: boolean;
    instructions?: string;
    active: boolean;
    default_status?: string;
}

interface Driver {
    id: number;
    full_name: string;
    phone: string;
    documents: {
        [key: string]: {
            status: string;
            id: number | null;
        };
    };
}

interface AllDocumentRequirement {
    id: number;
    name: string;
    type: string;
    required: boolean;
    active: boolean;
}

interface DocumentRequirementsEditProps {
    documentRequirement: DocumentRequirement;
    drivers?: Driver[];
    allDocumentRequirements?: AllDocumentRequirement[];
    ridingCompanies?: RidingCompany[];
}

export default function DocumentRequirementsEdit({ 
    documentRequirement, 
    drivers = [], 
    allDocumentRequirements = [],
    ridingCompanies = []
}: DocumentRequirementsEditProps) {
    const ridingCompany = documentRequirement.ridingCompany || { id: documentRequirement.riding_company_id, name: '' };

    const { data, setData, put, processing, errors, transform } = useForm({
        name: documentRequirement.name || '',
        type: documentRequirement.type || 'file',
        required: documentRequirement.required ?? false,
        instructions: documentRequirement.instructions || '',
        active: documentRequirement.active ?? true,
        default_status: documentRequirement.default_status || 'pending',
        riding_company_ids: documentRequirement.riding_company_id ? [documentRequirement.riding_company_id.toString()] : [],
    });

    // Transform data before submitting - convert string IDs to integers
    transform((data) => ({
        ...data,
        riding_company_ids: data.riding_company_ids.map((id: string | number) => parseInt(id.toString())),
    }));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(`/ridingcarcompanies/document-requirements/${documentRequirement.id}`);
    };

    return (
        <AppLayout>
            <Head title={`Edit Document Requirement - ${documentRequirement.name}`} />

            <div className="p-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold">Edit Document Requirement</h1>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        Update document requirement for <strong>{ridingCompany.name}</strong>
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
                        <h2 className="mb-4 text-lg font-semibold">Requirement Information</h2>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="md:col-span-2">
                                <FormField
                                    label="Requirement Name"
                                    name="name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    error={errors.name}
                                    required
                                />
                            </div>

                            {ridingCompanies.length > 0 && (
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
                                        Select one or more riding companies for this requirement.
                                    </p>
                                </div>
                            )}

                            <div>
                                <Label htmlFor="type">
                                    Document Type <span className="text-red-500">*</span>
                                </Label>
                                <select
                                    id="type"
                                    name="type"
                                    value={data.type}
                                    onChange={(e) => setData('type', e.target.value)}
                                    className="w-full rounded-md border px-3 py-2"
                                    required
                                >
                                    <option value="file">File (Image)</option>
                                    <option value="pdf">PDF</option>
                                    <option value="text">Text</option>
                                </select>
                                {errors.type && <p className="text-sm text-red-500">{errors.type}</p>}
                            </div>

                            <div>
                                <Label htmlFor="default_status">
                                    Default Status <span className="text-red-500">*</span>
                                </Label>
                                <select
                                    id="default_status"
                                    name="default_status"
                                    value={data.default_status}
                                    onChange={(e) => setData('default_status', e.target.value)}
                                    className="w-full rounded-md border px-3 py-2"
                                    required
                                >
                                    <option value="pending">Pending</option>
                                    <option value="approved">Approved</option>
                                    <option value="rejected">Rejected</option>
                                </select>
                                {errors.default_status && (
                                    <p className="text-sm text-red-500">{errors.default_status}</p>
                                )}
                                <p className="mt-1 text-xs text-neutral-500">
                                    Default status for documents created from this requirement.
                                </p>
                            </div>

                            <div className="md:col-span-2">
                                <Label htmlFor="instructions">Instructions</Label>
                                <textarea
                                    id="instructions"
                                    name="instructions"
                                    value={data.instructions}
                                    onChange={(e) => setData('instructions', e.target.value)}
                                    className="w-full rounded-md border px-3 py-2"
                                    rows={3}
                                />
                                {errors.instructions && (
                                    <p className="text-sm text-red-500">{errors.instructions}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="required" className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="required"
                                        name="required"
                                        checked={data.required}
                                        onChange={(e) => setData('required', e.target.checked)}
                                        className="rounded border-gray-300"
                                    />
                                    <span>Required (Mandatory)</span>
                                </Label>
                                {errors.required && (
                                    <p className="text-sm text-red-500">{errors.required}</p>
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
                            href={`/ridingcarcompanies/riding-companies/${ridingCompany.id}/document-requirements`}
                        >
                            <Button type="button" variant="outline">
                                Cancel
                            </Button>
                        </Link>
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Updating...' : 'Update Document Requirement'}
                        </Button>
                    </div>
                </form>

                {/* Drivers Table with Document Requirements */}
                {drivers.length > 0 && allDocumentRequirements.length > 0 && (
                    <Card className="p-6 mt-6">
                        <h2 className="mb-4 text-lg font-semibold">Leads & Document Status</h2>
                        <DataTable
                            data={drivers}
                            columns={[
                                {
                                    header: 'Lead Name',
                                    accessor: (row) => row.full_name,
                                },
                                {
                                    header: 'Phone',
                                    accessor: (row) => row.phone,
                                },
                                ...allDocumentRequirements.map((req) => ({
                                    header: req.name,
                                    accessor: (row: Driver) => {
                                        const doc = row.documents[req.name];
                                        if (!doc || doc.status === 'not_required') {
                                            return (
                                                <span className="text-sm text-neutral-500 italic">
                                                    Not Required
                                                </span>
                                            );
                                        }
                                        return (
                                            <Badge 
                                                variant={
                                                    doc.status === 'approved' ? 'default' :
                                                    doc.status === 'rejected' ? 'destructive' :
                                                    'secondary'
                                                }
                                            >
                                                {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                                            </Badge>
                                        );
                                    },
                                })),
                            ]}
                        />
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}

