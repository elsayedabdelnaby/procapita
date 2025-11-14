import { FormField } from '@/components/core/form-field';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { Head, useForm } from '@inertiajs/react';

export default function CompaniesCreate() {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        slug: '',
        email: '',
        phone: '',
        address: '',
        is_active: true,
        admin_user: {
            name: '',
            email: '',
            password: '',
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/core/companies');
    };

    return (
        <AppLayout>
            <Head title="Create Company" />
            <div className="p-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold">Create Company</h1>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        Add a new company to the system
                    </p>
                </div>

                <Card className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold">Company Information</h2>

                            <FormField
                                label="Company Name"
                                name="name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                error={errors.name}
                                required
                            />

                            <FormField
                                label="Slug"
                                name="slug"
                                value={data.slug}
                                onChange={(e) => setData('slug', e.target.value)}
                                error={errors.slug}
                                placeholder="auto-generated if left empty"
                            />

                            <FormField
                                label="Email"
                                name="email"
                                type="email"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                error={errors.email}
                            />

                            <FormField
                                label="Phone"
                                name="phone"
                                value={data.phone}
                                onChange={(e) => setData('phone', e.target.value)}
                                error={errors.phone}
                            />

                            <div className="space-y-2">
                                <Label htmlFor="address">Address</Label>
                                <textarea
                                    id="address"
                                    name="address"
                                    value={data.address}
                                    onChange={(e) => setData('address', e.target.value)}
                                    className="w-full rounded-md border px-3 py-2"
                                    rows={3}
                                />
                                {errors.address && (
                                    <p className="text-sm text-red-500">{errors.address}</p>
                                )}
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

                        <div className="space-y-4 border-t pt-6">
                            <h2 className="text-lg font-semibold">Admin User</h2>

                            <FormField
                                label="Admin Name"
                                name="admin_user.name"
                                value={data.admin_user.name}
                                onChange={(e) =>
                                    setData('admin_user', {
                                        ...data.admin_user,
                                        name: e.target.value,
                                    })
                                }
                                error={errors['admin_user.name']}
                            />

                            <FormField
                                label="Admin Email"
                                name="admin_user.email"
                                type="email"
                                value={data.admin_user.email}
                                onChange={(e) =>
                                    setData('admin_user', {
                                        ...data.admin_user,
                                        email: e.target.value,
                                    })
                                }
                                error={errors['admin_user.email']}
                            />

                            <FormField
                                label="Admin Password"
                                name="admin_user.password"
                                type="password"
                                value={data.admin_user.password}
                                onChange={(e) =>
                                    setData('admin_user', {
                                        ...data.admin_user,
                                        password: e.target.value,
                                    })
                                }
                                error={errors['admin_user.password']}
                            />
                        </div>

                        <div className="flex justify-end gap-4">
                            <Button type="button" variant="outline" onClick={() => window.history.back()}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={processing}>
                                {processing ? 'Creating...' : 'Create Company'}
                            </Button>
                        </div>
                    </form>
                </Card>
            </div>
        </AppLayout>
    );
}

