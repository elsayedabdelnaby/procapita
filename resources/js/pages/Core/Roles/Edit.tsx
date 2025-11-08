import { FormField } from '@/components/core/form-field';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { Company, Role } from '@/types/core';
import { Head, Link, useForm } from '@inertiajs/react';

interface RoleEditProps {
    company: Company;
    role: Role;
    availableRoles: Role[];
    permissions?: any;
}

export default function RoleEdit({ company, role, availableRoles }: RoleEditProps) {
    const { data, setData, put, processing, errors } = useForm({
        name: role.name || '',
        parent_id: role.parent_id || '',
        module_name: role.module_name || '',
        entity_name: role.entity_name || '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(`/core/companies/${company.id}/roles/${role.id}`);
    };

    // Filter out current role and its descendants from available parents
    const availableParents = availableRoles.filter((r) => {
        // Can't be its own parent
        if (r.id === role.id) return false;
        // Can't be a descendant (would create circular reference)
        if (r.hierarchy_path && role.hierarchy_path) {
            return !r.hierarchy_path.startsWith(role.hierarchy_path);
        }
        return true;
    });

    return (
        <AppLayout>
            <Head title={`Edit ${role.name}`} />
            <div className="p-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold">Edit Role</h1>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        Update role information for {company.name}
                    </p>
                </div>

                <Card className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold">Role Information</h2>

                            <div className="rounded-md bg-neutral-50 p-4 dark:bg-neutral-900/20">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-neutral-500">Current Level</p>
                                        <p className="font-medium">Level {role.hierarchy_level}</p>
                                    </div>
                                    <div>
                                        <p className="text-neutral-500">Hierarchy Path</p>
                                        <p className="font-medium">{role.hierarchy_path || 'Root'}</p>
                                    </div>
                                    <div>
                                        <p className="text-neutral-500">Type</p>
                                        <p className="font-medium">{role.is_root ? 'Root Role' : 'Child Role'}</p>
                                    </div>
                                    <div>
                                        <p className="text-neutral-500">Current Parent</p>
                                        <p className="font-medium">
                                            {role.parent?.name || 'None (Root)'}
                                        </p>
                                    </div>
                                </div>
                            </div>

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
                                <Label htmlFor="parent_id">Parent Role</Label>
                                <select
                                    id="parent_id"
                                    name="parent_id"
                                    value={data.parent_id}
                                    onChange={(e) => setData('parent_id', e.target.value)}
                                    className="w-full rounded-md border px-3 py-2"
                                >
                                    <option value="">No Parent (Root Role)</option>
                                    {availableParents.map((r) => (
                                        <option key={r.id} value={r.id}>
                                            {r.name}
                                            {r.hierarchy_path && ` (${r.hierarchy_path})`}
                                        </option>
                                    ))}
                                </select>
                                {errors.parent_id && (
                                    <p className="text-sm text-red-500">{errors.parent_id}</p>
                                )}
                                <p className="text-xs text-neutral-500">
                                    Changing the parent will update the hierarchy path automatically.
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

                            <div className="rounded-md bg-yellow-50 p-4 dark:bg-yellow-900/20">
                                <h3 className="mb-2 text-sm font-semibold text-yellow-900 dark:text-yellow-100">
                                    ⚠️ Important
                                </h3>
                                <ul className="space-y-1 text-xs text-yellow-900 dark:text-yellow-100">
                                    <li>
                                        • Changing the parent role will update the hierarchy path for this
                                        role and all its children.
                                    </li>
                                    <li>
                                        • You cannot set this role as its own parent or as a child of one
                                        of its descendants.
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
                                {processing ? 'Updating...' : 'Update Role'}
                            </Button>
                        </div>
                    </form>
                </Card>
            </div>
        </AppLayout>
    );
}

