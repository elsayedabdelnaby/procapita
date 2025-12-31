import { FormField } from '@/components/core/form-field';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { Company } from '@/types/core';
import { Head, Link, useForm } from '@inertiajs/react';
import { useState, useRef } from 'react';

interface CompanyEditProps {
    company: Company;
}

export default function CompanyEdit({ company }: CompanyEditProps) {
    const [logoPreview, setLogoPreview] = useState<string | null>(company.logo_url || null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { data, setData, put, processing, errors } = useForm({
        name: company.name || '',
        slug: company.slug || '',
        email: company.email || '',
        phone: company.phone || '',
        address: company.address || '',
        is_active: company.is_active ?? true,
        logo: null as File | null,
    });

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file type
            const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/pjpeg', 'image/x-png'];
            const validExtensions = ['.jpeg', '.jpg', '.png', '.gif', '.pjpeg', '.x-png'];
            const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
            
            if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
                alert('Only .jpeg, .jpg, .png, .gif, .pjpeg, .x-png files are allowed.');
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
                return;
            }

            // Validate image dimensions
            const img = new Image();
            img.onload = () => {
                if (img.width > 160 || img.height > 40) {
                    alert(`The logo dimensions must be 160x40 pixels or less. Current dimensions: ${img.width}x${img.height}.`);
                    if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                    }
                    return;
                }
                
                setData('logo', file);

                // Create preview
                const reader = new FileReader();
                reader.onloadend = () => {
                    setLogoPreview(reader.result as string);
                };
                reader.readAsDataURL(file);
            };
            img.onerror = () => {
                alert('Unable to read image file.');
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            };
            img.src = URL.createObjectURL(file);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        put(`/core/companies/${company.id}`, {
            forceFormData: true,
            preserveScroll: true,
        });
    };

    return (
        <AppLayout>
            <Head title={`Edit ${company.name}`} />
            <div className="p-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold">Edit Company</h1>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        Update company information
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

                            <div className="space-y-4">
                                <h3 className="text-md font-semibold">Company Logo</h3>
                                
                                {/* Current Logo Preview */}
                                {logoPreview && (
                                    <div className="space-y-2">
                                        <Label>Current Logo</Label>
                                        <div className="flex items-center gap-4">
                                            <img
                                                src={logoPreview}
                                                alt="Company Logo"
                                                className="h-20 w-20 object-contain border rounded p-2"
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setLogoPreview(null);
                                                    setData('logo', null);
                                                    if (fileInputRef.current) {
                                                        fileInputRef.current.value = '';
                                                    }
                                                }}
                                            >
                                                Remove Logo
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* Logo Upload */}
                                <div className="space-y-2">
                                    <Label htmlFor="logo">Company Logo</Label>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        id="logo"
                                        name="logo"
                                        accept=".jpeg,.jpg,.png,.gif,.pjpeg,.x-png"
                                        onChange={handleLogoChange}
                                        className="w-full rounded-md border px-3 py-2"
                                    />
                                    {errors.logo && (
                                        <p className="text-sm text-red-500">{errors.logo}</p>
                                    )}
                                        <p className="text-xs text-neutral-500">
                                            Allowed size 160X40 pixels( .jpeg , .jpg , .png , .gif , .pjpeg , .x-png format ).
                                        </p>
                                        <p className="text-xs text-neutral-500 mt-1">
                                            The logo dimensions must be 160x40 pixels or less.
                                        </p>
                                </div>
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
                            <Link href={`/core/companies/${company.id}`}>
                                <Button type="button" variant="outline">
                                    Cancel
                                </Button>
                            </Link>
                            <Button type="submit" disabled={processing}>
                                {processing ? 'Updating...' : 'Update Company'}
                            </Button>
                        </div>
                    </form>
                </Card>
            </div>
        </AppLayout>
    );
}

