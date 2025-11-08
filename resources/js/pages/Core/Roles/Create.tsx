import { FormField } from '@/components/core/form-field';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { Company, Role } from '@/types/core';
import { Head, Link, useForm } from '@inertiajs/react';

interface RoleCreateProps {
    company: Company;
    availableRoles: Role[];
    permissions?: any;
}

export default function RoleCreate({ company, availableRoles }: RoleCreateProps) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        parent_id: '',
        module_name: '',
        entity_name: '',
        team_id: company.id,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(`/core/companies/${company.id}/roles`);
    };

    return (
        <AppLayout>
            <Head title="Create Role" />
            <div className="p-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold">Create New Role</h1>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        Add a new role to {company.name}
                    </p>
                </div>

                <Card className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold">Role Information</h2>

                            <FormField
                                label="Role Name"
                                name="name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                error={errors.name}
                                placeholder="e.g., Sales Manager, HR Specialist"
                                required
                            />

                            <div className="space-y-2">
                                <Label htmlFor="parent_id">Parent Role (Optional)</Label>
                                <select
                                    id="parent_id"
                                    name="parent_id"
                                    value={data.parent_id}
                                    onChange={(e) => setData('parent_id', e.target.value)}
                                    className="w-full rounded-md border px-3 py-2"
                                >
                                    <option value="">No Parent (Root Role)</option>
                                    {availableRoles.map((role) => (
                                        <option key={role.id} value={role.id}>
                                            {role.name}
                                            {role.hierarchy_path && ` (${role.hierarchy_path})`}
                                        </option>
                                    ))}
                                </select>
                                {errors.parent_id && (
                                    <p className="text-sm text-red-500">{errors.parent_id}</p>
                                )}
                                <p className="text-xs text-neutral-500">
                                    Select a parent role to create a hierarchical structure. Leave empty to
                                    create a root role.
                                </p>
                            </div>

                            <FormField
                                label="Module Name (Optional)"
                                name="module_name"
                                value={data.module_name}
                                onChange={(e) => setData('module_name', e.target.value)}
                                error={errors.module_name}
                                placeholder="e.g., Core, CRM, Inventory"
                            />

                            <FormField
                                label="Entity Name (Optional)"
                                name="entity_name"
                                value={data.entity_name}
                                onChange={(e) => setData('entity_name', e.target.value)}
                                error={errors.entity_name}
                                placeholder="e.g., Users, Products, Orders"
                            />

                            <div className="rounded-md bg-blue-50 p-4 dark:bg-blue-900/20">
                                <h3 className="mb-2 text-sm font-semibold text-blue-900 dark:text-blue-100">
                                    Hierarchy Information
                                </h3>
                                <ul className="space-y-1 text-xs text-blue-900 dark:text-blue-100">
                                    <li>
                                        • <strong>Root Role:</strong> A top-level role with no parent (e.g.,
                                        CEO)
                                    </li>
                                    <li>
                                        • <strong>Child Role:</strong> A role that reports to another role
                                        (e.g., Sales Manager reports to CEO)
                                    </li>
                                    <li>
                                        • <strong>Hierarchy Path:</strong> Automatically generated (e.g.,
                                        H1:H3:H5)
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <div className="flex justify-end gap-4">
                            <Link href={`/core/companies/${company.id}`}>
                                <Button type="button" variant="outline">
                                    Cancel
                                </Button>
                            </Link>
                            <Button type="submit" disabled={processing}>
                                {processing ? 'Creating...' : 'Create Role'}
                            </Button>
                        </div>
                    </form>
                </Card>
            </div>
        </AppLayout>
    );
}

