import { FormField } from '@/components/core/form-field';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { Company, CoreUser, Role } from '@/types/core';
import { Head, Link, useForm } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useState } from 'react';

interface RidingCompany {
    id: number;
    name: string;
}

interface UserEditProps {
    user: CoreUser;
    companies?: Company[];
    roles: Role[];
    userRoles: number[];
    company?: Company;
    ridingCompanies: RidingCompany[];
}

export default function UserEdit({ user, companies, roles, userRoles, company, ridingCompanies: initialRidingCompanies = [] }: UserEditProps) {
    const [ridingCompanies, setRidingCompanies] = useState<RidingCompany[]>(initialRidingCompanies);
    const [loadingRidingCompanies, setLoadingRidingCompanies] = useState(false);

    const { data, setData, put, processing, errors } = useForm({
        name: user.name || '',
        email: user.email || '',
        password: '',
        password_confirmation: '',
        company_id: user.company_id || '',
        riding_company_id: user.riding_company_id || '',
        roles: userRoles || [],
        is_company_admin: user.is_company_admin || false,
        is_active: user.is_active ?? true,
    });

    // Load riding companies when company_id changes
    useEffect(() => {
        const companyId = data.company_id ? Number(data.company_id) : null;
        
        if (companyId) {
            setLoadingRidingCompanies(true);
            axios
                .get(`/api/drivers/companies/${companyId}/riding-companies`)
                .then((response) => {
                    setRidingCompanies(response.data);
                    // Reset riding_company_id if current selection is not in the new list
                    if (data.riding_company_id) {
                        const currentRidingCompanyId = Number(data.riding_company_id);
                        const exists = response.data.some((rc: RidingCompany) => rc.id === currentRidingCompanyId);
                        if (!exists) {
                            setData('riding_company_id', '');
                        }
                    }
                })
                .catch((error) => {
                    console.error('Error fetching riding companies:', error);
                    setRidingCompanies([]);
                })
                .finally(() => {
                    setLoadingRidingCompanies(false);
                });
        } else {
            setRidingCompanies([]);
            setData('riding_company_id', '');
        }
    }, [data.company_id]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (company) {
            put(`/core/companies/${company.id}/users/${user.id}`);
        } else {
            put(`/core/users/${user.id}`);
        }
    };

    const handleRoleToggle = (roleId: number, checked: boolean) => {
        if (checked) {
            setData('roles', [...data.roles, roleId]);
        } else {
            setData('roles', data.roles.filter((id) => id !== roleId));
        }
    };

    return (
        <AppLayout>
            <Head title={`Edit ${user.name}`} />
            <div className="p-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold">Edit User</h1>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        Update user information and permissions
                    </p>
                </div>

                <Card className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold">User Information</h2>

                            <FormField
                                label="Full Name"
                                name="name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                error={errors.name}
                                required
                            />

                            <FormField
                                label="Email"
                                name="email"
                                type="email"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                error={errors.email}
                                required
                            />

                            <div className="rounded-md bg-blue-50 p-4 dark:bg-blue-900/20">
                                <p className="text-sm text-blue-900 dark:text-blue-100">
                                    Leave password fields empty to keep the current password.
                                </p>
                            </div>

                            <FormField
                                label="New Password (optional)"
                                name="password"
                                type="password"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                error={errors.password}
                            />

                            <FormField
                                label="Confirm New Password"
                                name="password_confirmation"
                                type="password"
                                value={data.password_confirmation}
                                onChange={(e) => setData('password_confirmation', e.target.value)}
                                error={errors.password_confirmation}
                            />

                            {companies && companies.length > 0 && (
                                <div className="space-y-2">
                                    <Label htmlFor="company_id">Company</Label>
                                    <select
                                        id="company_id"
                                        name="company_id"
                                        value={data.company_id}
                                        onChange={(e) => setData('company_id', e.target.value)}
                                        className="w-full rounded-md border px-3 py-2"
                                        required
                                    >
                                        <option value="">Select a company</option>
                                        {companies.map((comp) => (
                                            <option key={comp.id} value={comp.id}>
                                                {comp.name}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.company_id && (
                                        <p className="text-sm text-red-500">{errors.company_id}</p>
                                    )}
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="riding_company_id">Riding Company</Label>
                                <select
                                    id="riding_company_id"
                                    name="riding_company_id"
                                    value={data.riding_company_id}
                                    onChange={(e) => setData('riding_company_id', e.target.value)}
                                    className="w-full rounded-md border px-3 py-2"
                                    disabled={loadingRidingCompanies || !data.company_id}
                                >
                                    <option value="">
                                        {loadingRidingCompanies
                                            ? 'Loading...'
                                            : !data.company_id
                                              ? 'اختر company أولاً'
                                              : 'Select a riding company (optional)'}
                                    </option>
                                    {ridingCompanies.map((ridingCompany) => (
                                        <option key={ridingCompany.id} value={ridingCompany.id}>
                                            {ridingCompany.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.riding_company_id && (
                                    <p className="text-sm text-red-500">{errors.riding_company_id}</p>
                                )}
                                {!loadingRidingCompanies && data.company_id && ridingCompanies.length === 0 && (
                                    <p className="text-xs text-neutral-500">
                                        No riding companies available for this company
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold">Roles & Permissions</h2>

                            {roles && roles.length > 0 ? (
                                <div className="space-y-2">
                                    <Label>Assign Roles</Label>
                                    <div className="space-y-2 rounded-md border p-4">
                                        {roles.map((role) => (
                                            <div key={role.id} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`role-${role.id}`}
                                                    checked={data.roles.includes(role.id)}
                                                    onCheckedChange={(checked) =>
                                                        handleRoleToggle(role.id, checked as boolean)
                                                    }
                                                />
                                                <Label
                                                    htmlFor={`role-${role.id}`}
                                                    className="font-normal"
                                                >
                                                    {role.name}
                                                    {role.hierarchy_path && (
                                                        <span className="ml-2 text-xs text-neutral-500">
                                                            ({role.hierarchy_path})
                                                        </span>
                                                    )}
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                    {errors.roles && (
                                        <p className="text-sm text-red-500">{errors.roles}</p>
                                    )}
                                </div>
                            ) : (
                                <p className="text-sm text-neutral-500">
                                    No roles available. Create roles first.
                                </p>
                            )}

                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="is_company_admin"
                                    checked={data.is_company_admin}
                                    onCheckedChange={(checked) =>
                                        setData('is_company_admin', checked as boolean)
                                    }
                                />
                                <Label htmlFor="is_company_admin">Company Administrator</Label>
                            </div>

                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="is_active"
                                    checked={data.is_active}
                                    onCheckedChange={(checked) =>
                                        setData('is_active', checked as boolean)
                                    }
                                />
                                <Label htmlFor="is_active">Active</Label>
                            </div>
                        </div>

                        <div className="flex justify-end gap-4">
                            <Link
                                href={
                                    user.company_id
                                        ? `/core/companies/${user.company_id}`
                                        : '/core/users'
                                }
                            >
                                <Button type="button" variant="outline">
                                    Cancel
                                </Button>
                            </Link>
                            <Button type="submit" disabled={processing}>
                                {processing ? 'Updating...' : 'Update User'}
                            </Button>
                        </div>
                    </form>
                </Card>
            </div>
        </AppLayout>
    );
}

