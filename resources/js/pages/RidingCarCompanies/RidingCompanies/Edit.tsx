import { FormField } from '@/components/core/form-field';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, useForm, router } from '@inertiajs/react';
import { useState, useRef, useEffect } from 'react';

interface Company {
    id: number;
    name: string;
}

interface RidingCompany {
    id: number;
    company_id?: number;
    company?: Company;
    name: string;
    slug: string;
    description?: string;
    country?: string;
    city?: string;
    contact_email?: string;
    contact_phone?: string;
    active: boolean;
    logo_path?: string;
    logo_url?: string;
}

interface RidingCompanyEditProps {
    ridingCompany: RidingCompany;
    companies?: Company[];
}

export default function RidingCompaniesEdit({ ridingCompany, companies }: RidingCompanyEditProps) {
    const [logoPreview, setLogoPreview] = useState<string | null>(ridingCompany.logo_url || null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const formRef = useRef<HTMLFormElement>(null);

    // Update logoPreview when ridingCompany.logo_url changes (after redirect from update)
    useEffect(() => {
        if (ridingCompany.logo_url) {
            setLogoPreview(ridingCompany.logo_url);
        } else {
            setLogoPreview(null);
        }
    }, [ridingCompany.logo_url]);

    const { data, setData, processing, errors } = useForm({
        company_id: ridingCompany.company_id?.toString() || '',
        name: ridingCompany.name || '',
        slug: ridingCompany.slug || '',
        description: ridingCompany.description || '',
        country: ridingCompany.country || '',
        city: ridingCompany.city || '',
        contact_email: ridingCompany.contact_email || '',
        contact_phone: ridingCompany.contact_phone || '',
        active: ridingCompany.active ?? true,
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
                if (img.width > 125 || img.height > 40) {
                    alert(`The logo dimensions must be 125x40 pixels or less. Current dimensions: ${img.width}x${img.height}.`);
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
        
        // Get values directly from form elements
        const form = formRef.current;
        if (!form) return;
        
        const companyIdInput = form.querySelector('[name="company_id"]') as HTMLSelectElement;
        const nameInput = form.querySelector('[name="name"]') as HTMLInputElement;
        
        const companyId = companyIdInput?.value || data.company_id || ridingCompany.company_id?.toString() || '';
        const name = nameInput?.value || data.name || ridingCompany.name || '';
        
        // Create FormData manually
        const formData = new FormData();
        formData.append('company_id', companyId);
        formData.append('name', name);
        formData.append('slug', data.slug || '');
        formData.append('description', data.description || '');
        formData.append('country', data.country || '');
        formData.append('city', data.city || '');
        formData.append('contact_email', data.contact_email || '');
        formData.append('contact_phone', data.contact_phone || '');
        formData.append('active', data.active ? '1' : '0');
        
        if (data.logo instanceof File) {
            formData.append('logo', data.logo);
        }
        
        // Add _method for PUT request (Laravel requires this for PUT/PATCH with FormData)
        formData.append('_method', 'PUT');
        
        // Debug log
        console.log('Submitting - company_id:', companyId, 'name:', name);
        console.log('Submitting - FormData entries:', Array.from(formData.entries()));
        
        // Use router.post with _method: PUT instead of router.put
        // This is the correct way to send FormData with PUT in Laravel
        router.post(`/ridingcarcompanies/riding-companies/${ridingCompany.id}`, formData, {
            preserveScroll: true,
            forceFormData: true,
            onError: (errors) => {
                console.error('Form errors:', errors);
            },
        });
    };

    return (
        <AppLayout>
            <Head title={`Edit ${ridingCompany.name}`} />

            <div className="p-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold">Edit ReSeller</h1>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        Update reseller information
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
                                    {Object.keys(errors).length === 1 ? '' : 's'} with your
                                    submission
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

                <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
                    <Card className="p-6">
                        <h2 className="mb-4 text-lg font-semibold">Basic Information</h2>
                        <div className="grid gap-4 md:grid-cols-2">
                            {companies && companies.length > 0 && (
                                <div className="md:col-span-2">
                                    <Label htmlFor="company_id">
                                        Main Company <span className="text-red-500">*</span>
                                    </Label>
                                    <select
                                        id="company_id"
                                        name="company_id"
                                        value={data.company_id}
                                        onChange={(e) => setData('company_id', e.target.value)}
                                        className="w-full rounded-md border px-3 py-2"
                                        required
                                    >
                                        <option value="">Select a company</option>
                                        {companies.map((company) => (
                                            <option key={company.id} value={company.id}>
                                                {company.name}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.company_id && (
                                        <p className="text-sm text-red-500">{errors.company_id}</p>
                                    )}
                                </div>
                            )}

                            <div className="md:col-span-2">
                                <FormField
                                    label="ReSeller Name"
                                    name="name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    error={errors.name}
                                    required
                                />
                            </div>

                            <div className="md:col-span-2">
                                <FormField
                                    label="Slug"
                                    name="slug"
                                    value={data.slug}
                                    onChange={(e) => setData('slug', e.target.value)}
                                    error={errors.slug}
                                />
                            </div>

                            <div className="md:col-span-2">
                                <Label htmlFor="description">Description</Label>
                                <textarea
                                    id="description"
                                    name="description"
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    className="w-full rounded-md border px-3 py-2"
                                    rows={3}
                                />
                                {errors.description && (
                                    <p className="text-sm text-red-500">{errors.description}</p>
                                )}
                            </div>

                            <FormField
                                label="Country"
                                name="country"
                                value={data.country}
                                onChange={(e) => setData('country', e.target.value)}
                                error={errors.country}
                            />

                            <FormField
                                label="City"
                                name="city"
                                value={data.city}
                                onChange={(e) => setData('city', e.target.value)}
                                error={errors.city}
                            />

                            <FormField
                                label="Contact Email"
                                name="contact_email"
                                type="email"
                                value={data.contact_email}
                                onChange={(e) => setData('contact_email', e.target.value)}
                                error={errors.contact_email}
                            />

                            <FormField
                                label="Contact Phone"
                                name="contact_phone"
                                value={data.contact_phone}
                                onChange={(e) => setData('contact_phone', e.target.value)}
                                error={errors.contact_phone}
                            />

                            <div className="md:col-span-2">
                                <div className="space-y-4">
                                    <h3 className="text-md font-semibold">Company Logo</h3>
                                    
                                    {/* Current Logo Preview */}
                                    {logoPreview && (
                                        <div className="space-y-2">
                                            <Label>Current Logo</Label>
                                            <div className="flex items-center gap-4">
                                                <img
                                                    src={logoPreview}
                                                    alt="Riding Company Logo"
                                                    className="h-10 w-40 object-contain border rounded p-2"
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
                                            Allowed size 125X40 pixels( .jpeg , .jpg , .png , .gif , .pjpeg , .x-png format ).
                                        </p>
                                        <p className="text-xs text-neutral-500 mt-1">
                                            The logo dimensions must be 125x40 pixels or less.
                                        </p>
                                    </div>
                                </div>
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
                        <Link href="/ridingcarcompanies/riding-companies">
                            <Button type="button" variant="outline">
                                Cancel
                            </Button>
                        </Link>
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Updating...' : 'Update ReSeller'}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}

