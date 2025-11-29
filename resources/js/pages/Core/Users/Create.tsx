import { FormField } from '@/components/core/form-field';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { Company, Role } from '@/types/core';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { type SharedData } from '@/types';
import axios from 'axios';
import { useEffect, useState } from 'react';

interface RidingCompany {
    id: number;
    name: string;
}

interface UserCreateProps {
    companies?: Company[];
    roles: Role[];
    company?: Company;
    ridingCompanies?: RidingCompany[];
}

export default function UserCreate({ companies, roles, company, ridingCompanies: initialRidingCompanies = [] }: UserCreateProps) {
    const page = usePage<SharedData>();
    const { selectedCompany } = page.props;
    
    const [ridingCompanies, setRidingCompanies] = useState<RidingCompany[]>(initialRidingCompanies);
    const [loadingRidingCompanies, setLoadingRidingCompanies] = useState(false);

    const { data, setData, post, processing, errors } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        company_id: selectedCompany ? String(selectedCompany.id) : (company?.id || ''),
        riding_company_id: '',
        roles: [] as number[],
        is_company_admin: false,
        is_active: true,
    });

    // Update company_id when selectedCompany changes
    useEffect(() => {
        if (selectedCompany) {
            setData('company_id', String(selectedCompany.id));
        } else if (company) {
            setData('company_id', String(company.id));
        }
    }, [selectedCompany, company]);

    // Load riding companies when company/selectedCompany changes
    useEffect(() => {
        setLoadingRidingCompanies(true);
        
        // If "All Companies" is selected (selectedCompany is null) and user is super admin, load all riding companies
        if (!selectedCompany && !company) {
            axios
                .get('/api/drivers/riding-companies/all')
                .then((response) => {
                    setRidingCompanies(response.data);
                    setData('riding_company_id', '');
                })
                .catch((error) => {
                    console.error('Error fetching all riding companies:', error);
                    setRidingCompanies([]);
                })
                .finally(() => {
                    setLoadingRidingCompanies(false);
                });
        } else {
            const companyId = selectedCompany ? selectedCompany.id : company?.id;
            
            if (companyId) {
                axios
                    .get(`/api/drivers/companies/${companyId}/riding-companies`)
                    .then((response) => {
                        setRidingCompanies(response.data);
                        setData('riding_company_id', '');
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
                setLoadingRidingCompanies(false);
            }
        }
    }, [selectedCompany?.id, company?.id]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (company) {
            post(`/core/companies/${company.id}/users`);
        } else {
            post('/core/users');
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
            <Head title="Create User" />
            <div className="p-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold">Create New User</h1>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        Add a new user to {selectedCompany ? selectedCompany.name : (company ? company.name : 'the system')}
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

                            <FormField
                                label="Password"
                                name="password"
                                type="password"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                error={errors.password}
                                required
                            />

                            <FormField
                                label="Confirm Password"
                                name="password_confirmation"
                                type="password"
                                value={data.password_confirmation}
                                onChange={(e) => setData('password_confirmation', e.target.value)}
                                error={errors.password_confirmation}
                                required
                            />

                            {selectedCompany && (
                                <input type="hidden" name="company_id" value={selectedCompany.id} />
                            )}

                            {companies && companies.length > 0 && !selectedCompany && (
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

                            {company && !selectedCompany && (
                                <input type="hidden" name="company_id" value={company.id} />
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
                            <Link href={company ? `/core/companies/${company.id}` : '/core/users'}>
                                <Button type="button" variant="outline">
                                    Cancel
                                </Button>
                            </Link>
                            <Button type="submit" disabled={processing}>
                                {processing ? 'Creating...' : 'Create User'}
                            </Button>
                        </div>
                    </form>
                </Card>
            </div>
        </AppLayout>
    );
}

