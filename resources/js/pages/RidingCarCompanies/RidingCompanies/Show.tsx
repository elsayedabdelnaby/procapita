import { DeleteDialog } from '@/components/core/delete-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { CoreUser } from '@/types/core';
import { Head, Link, router } from '@inertiajs/react';
import { Building2, ChevronLeft, ChevronRight, Mail, MapPin, Phone, Trash2, Users as UsersIcon, X, Plug, GitBranch, RefreshCw, Facebook } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { WhatsAppLinkDeviceRidingCompanyTab } from '@/components/whatsapp/whatsapp-link-device-riding-company-tab';
import { useEffect, useMemo, useState } from 'react';
import { usePermissions } from '@/hooks/use-permissions';
import { MultiSelect } from '@/components/ui/multi-select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

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
    distribution_type?: string | null;
    max_drivers_per_day?: number;
    distribution_users?: number[];
    last_distribution_date?: string | null;
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
    ridingCompany: RidingCompany & {
        default_driver_user_id?: number | null;
        default_driver_user?: {
            id: number;
            name: string;
            email: string;
        } | null;
    };
    users?: CoreUser[];
    availableUsers?: Array<{
        id: number;
        name: string;
        email: string;
    }>;
}

export default function RidingCompaniesShow({ ridingCompany, users = [], availableUsers = [] }: RidingCompanyShowProps) {
    const { can } = usePermissions();
    // Preserve active tab in localStorage
    const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'distribution' | 'rotation' | 'integrations'>(() => {
        const savedTab = localStorage.getItem('ridingCompanyActiveTab');
        return (savedTab as any) || 'overview';
    });
    
    // Save tab to localStorage when it changes
    useEffect(() => {
        localStorage.setItem('ridingCompanyActiveTab', activeTab);
    }, [activeTab]);

    // Distribution settings state
    const [distributionType, setDistributionType] = useState<string>(ridingCompany.distribution_type || '');
    // Handle distribution_users - it might be array of IDs or array of objects with user_id
    const initialDistributionUsers = useMemo(() => {
        const users = ridingCompany.distribution_users || [];
        if (users.length === 0) return [];
        // Check if it's array of objects (with user_id) or array of numbers (IDs)
        if (typeof users[0] === 'object' && users[0] !== null && 'user_id' in users[0]) {
            return (users as Array<{ user_id: number }>).map(u => u.user_id);
        }
        return users as number[];
    }, [ridingCompany.distribution_users]);
    const [distributionUsers, setDistributionUsers] = useState<number[]>(initialDistributionUsers);
    const [maxDriversPerDay, setMaxDriversPerDay] = useState<number>(ridingCompany.max_drivers_per_day || 50);
    const [savingDistribution, setSavingDistribution] = useState(false);

    // Update distributionUsers when ridingCompany changes
    useEffect(() => {
        const users = ridingCompany.distribution_users || [];
        if (users.length === 0) {
            setDistributionUsers([]);
        } else {
            // Check if it's array of objects (with user_id) or array of numbers (IDs)
            if (typeof users[0] === 'object' && users[0] !== null && 'user_id' in users[0]) {
                setDistributionUsers((users as Array<{ user_id: number }>).map(u => u.user_id));
            } else {
                setDistributionUsers(users as number[]);
            }
        }
        setDistributionType(ridingCompany.distribution_type || '');
        setMaxDriversPerDay(ridingCompany.max_drivers_per_day || 50);
    }, [ridingCompany.distribution_users, ridingCompany.distribution_type, ridingCompany.max_drivers_per_day]);

    // Filter out fresh-Leads user from available users
    const filteredAvailableUsers = useMemo(() => {
        return availableUsers.filter(user => !user.name.startsWith('fresh-Leads-'));
    }, [availableUsers]);

    // Handle distribution settings save
    const handleSaveDistribution = async () => {
        setSavingDistribution(true);
        try {
            await router.put(`/ridingcarcompanies/riding-companies/${ridingCompany.id}`, {
                distribution_type: distributionType,
                distribution_users: distributionUsers,
                max_drivers_per_day: maxDriversPerDay,
            }, {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    // Optionally show success message
                },
                onError: (errors) => {
                    console.error('Error saving distribution settings:', errors);
                },
                onFinish: () => {
                    setSavingDistribution(false);
                },
            });
        } catch (error) {
            console.error('Error saving distribution settings:', error);
            setSavingDistribution(false);
        }
    };
    const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; requirement: { id: number; name: string } | null }>({
        open: false,
        requirement: null,
    });
    const [deleteStageDialog, setDeleteStageDialog] = useState<{ open: boolean; stage: { id: number; name: string } | null }>({
        open: false,
        stage: null,
    });
    const [userFilters, setUserFilters] = useState<Record<string, string>>({
        name: '',
        email: '',
        mobile1: '',
        mobile2: '',
        roles: '',
        status: '',
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(100);

    const handleDeleteRequirement = (requirement: { id: number; name: string }) => {
        setDeleteDialog({ open: true, requirement });
    };

    const confirmDeleteRequirement = () => {
        if (deleteDialog.requirement) {
            router.delete(`/ridingcarcompanies/document-requirements/${deleteDialog.requirement.id}`, {
                onSuccess: () => {
                    router.reload({ only: ['ridingCompany'] });
                },
            });
        }
    };

    const handleDeleteStage = (stage: { id: number; name: string }) => {
        setDeleteStageDialog({ open: true, stage });
    };

    const confirmDeleteStage = () => {
        if (deleteStageDialog.stage) {
            router.delete(`/ridingcarcompanies/stage-templates/${deleteStageDialog.stage.id}`, {
                onSuccess: () => {
                    router.reload({ only: ['ridingCompany'] });
                },
            });
        }
    };

    const handleDelete = () => {
        if (confirm(`Are you sure you want to delete "${ridingCompany.name}"?`)) {
            router.delete(`/ridingcarcompanies/riding-companies/${ridingCompany.id}`);
        }
    };

    const handleToggleStatus = () => {
        router.post(`/ridingcarcompanies/riding-companies/${ridingCompany.id}/toggle-active`);
    };

    const handleUserFilterChange = (key: string, value: string) => {
        setUserFilters((prev) => ({
            ...prev,
            [key]: value === '__all__' ? '' : value,
        }));
    };

    const clearUserFilter = (key: string) => {
        setUserFilters((prev) => ({
            ...prev,
            [key]: '',
        }));
    };

    const filteredUsers = useMemo(() => {
        if (!users || users.length === 0) {
            return [];
        }

        return users.filter((user) => {
            const nameMatch = !userFilters.name || 
                user.name.toLowerCase().includes(userFilters.name.toLowerCase());
            
            const emailMatch = !userFilters.email || 
                user.email.toLowerCase().includes(userFilters.email.toLowerCase());
            
            const mobile1Match = !userFilters.mobile1 || 
                (user.mobile1 && user.mobile1.toLowerCase().includes(userFilters.mobile1.toLowerCase()));
            
            const mobile2Match = !userFilters.mobile2 || 
                (user.mobile2 && user.mobile2.toLowerCase().includes(userFilters.mobile2.toLowerCase()));
            
            const rolesMatch = !userFilters.roles || 
                userFilters.roles === '' ||
                (user.roles && user.roles.length > 0 && 
                    user.roles.some((r: any) => 
                        r.id.toString() === userFilters.roles
                    ));
            
            const statusMatch = !userFilters.status || 
                userFilters.status === '' ||
                (userFilters.status === 'active' && user.is_active) ||
                (userFilters.status === 'inactive' && !user.is_active);

            return nameMatch && emailMatch && mobile1Match && mobile2Match && rolesMatch && statusMatch;
        });
    }, [users, userFilters]);

    // Pagination
    const totalUsers = filteredUsers.length;
    const totalPages = Math.ceil(totalUsers / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [userFilters]);

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

                {/* Tabs */}
                <div className="mb-6 border-b">
                    <nav className="flex gap-6">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                                activeTab === 'overview'
                                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                                    : 'border-transparent text-neutral-600 hover:border-neutral-300 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4" />
                                Overview
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab('users')}
                            className={`border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                                activeTab === 'users'
                                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                                    : 'border-transparent text-neutral-600 hover:border-neutral-300 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <UsersIcon className="h-4 w-4" />
                                Users ({users.length})
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab('distribution')}
                            className={`border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                                activeTab === 'distribution'
                                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                                    : 'border-transparent text-neutral-600 hover:border-neutral-300 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <GitBranch className="h-4 w-4" />
                                Distribution
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab('rotation')}
                            className={`border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                                activeTab === 'rotation'
                                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                                    : 'border-transparent text-neutral-600 hover:border-neutral-300 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <RefreshCw className="h-4 w-4" />
                                Rotation
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab('integrations')}
                            className={`border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                                activeTab === 'integrations'
                                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                                    : 'border-transparent text-neutral-600 hover:border-neutral-300 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <Plug className="h-4 w-4" />
                                Integrations
                            </div>
                        </button>
                    </nav>
                </div>

                {/* Tab Content */}
                {activeTab === 'overview' && (
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
                                            <div className="ml-4 flex items-center gap-2">
                                                <Link
                                                    href={`/ridingcarcompanies/stage-templates/${template.id}/edit`}
                                                >
                                                    <Button variant="ghost" size="sm">
                                                        Edit
                                                    </Button>
                                                </Link>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDeleteStage({ id: template.id, name: template.name })}
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
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
                                        <div className="ml-4 flex items-center gap-2">
                                            <Link
                                                href={`/ridingcarcompanies/document-requirements/${req.id}/edit`}
                                            >
                                                <Button variant="ghost" size="sm">
                                                    Edit
                                                </Button>
                                            </Link>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDeleteRequirement({ id: req.id, name: req.name })}
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
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
                )}

                {activeTab === 'users' && (
                    <Card className="p-6">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-lg font-semibold">Riding Company Users</h2>
                        </div>
                        
                        {users && users.length > 0 ? (
                            <div>
                                {/* Pagination */}
                                {totalUsers > 0 && (
                                    <div className="mb-4 flex items-center justify-between border-b pb-4">
                                        <div className="flex items-center gap-4">
                                            <div className="text-sm text-neutral-600 dark:text-neutral-400">
                                                Showing {startIndex + 1} to {Math.min(endIndex, totalUsers)} of {totalUsers}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-neutral-600 dark:text-neutral-400">Rows per page:</span>
                                                <select
                                                    value={rowsPerPage}
                                                    onChange={(e) => {
                                                        setRowsPerPage(Number(e.target.value));
                                                        setCurrentPage(1);
                                                    }}
                                                    className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                                                >
                                                    <option value={10}>10</option>
                                                    <option value={25}>25</option>
                                                    <option value={50}>50</option>
                                                    <option value={100}>100</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="text-sm text-neutral-600 dark:text-neutral-400">
                                                Page {currentPage} of {totalPages || 1}
                                            </div>
                                            <div className="text-sm text-neutral-600 dark:text-neutral-400">
                                                Total: {totalUsers} user(s)
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                                    disabled={currentPage === 1}
                                                >
                                                    <ChevronLeft className="h-4 w-4" />
                                                    Previous
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                                    disabled={currentPage >= totalPages}
                                                >
                                                    Next
                                                    <ChevronRight className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div className="overflow-x-auto rounded-lg border">
                                    <table className="w-full">
                                        <thead className="bg-neutral-50 dark:bg-neutral-900">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                    Name
                                                </th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                    Email
                                                </th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                    Mobile 1
                                                </th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                    Mobile 2
                                                </th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                    Company
                                                </th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                    Roles
                                                </th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                    Status
                                                </th>
                                                <th className="px-4 py-3 text-right text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                    Actions
                                                </th>
                                            </tr>
                                            <tr>
                                                <th className="px-4 py-2">
                                                    <div className="relative">
                                                        <Input
                                                            type="text"
                                                            placeholder="Search Name..."
                                                            value={userFilters.name}
                                                            onChange={(e) => handleUserFilterChange('name', e.target.value)}
                                                            className="w-full text-xs h-8 pr-8"
                                                        />
                                                        {userFilters.name && (
                                                            <button
                                                                onClick={() => clearUserFilter('name')}
                                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-red-500 hover:text-red-700"
                                                                title="Clear filter"
                                                            >
                                                                <X className="h-3 w-3" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </th>
                                                <th className="px-4 py-2">
                                                    <div className="relative">
                                                        <Input
                                                            type="text"
                                                            placeholder="Search Email..."
                                                            value={userFilters.email}
                                                            onChange={(e) => handleUserFilterChange('email', e.target.value)}
                                                            className="w-full text-xs h-8 pr-8"
                                                        />
                                                        {userFilters.email && (
                                                            <button
                                                                onClick={() => clearUserFilter('email')}
                                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-red-500 hover:text-red-700"
                                                                title="Clear filter"
                                                            >
                                                                <X className="h-3 w-3" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </th>
                                                <th className="px-4 py-2">
                                                    <div className="relative">
                                                        <Input
                                                            type="text"
                                                            placeholder="Search Mobile 1..."
                                                            value={userFilters.mobile1}
                                                            onChange={(e) => handleUserFilterChange('mobile1', e.target.value)}
                                                            className="w-full text-xs h-8 pr-8"
                                                        />
                                                        {userFilters.mobile1 && (
                                                            <button
                                                                onClick={() => clearUserFilter('mobile1')}
                                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-red-500 hover:text-red-700"
                                                                title="Clear filter"
                                                            >
                                                                <X className="h-3 w-3" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </th>
                                                <th className="px-4 py-2">
                                                    <div className="relative">
                                                        <Input
                                                            type="text"
                                                            placeholder="Search Mobile 2..."
                                                            value={userFilters.mobile2}
                                                            onChange={(e) => handleUserFilterChange('mobile2', e.target.value)}
                                                            className="w-full text-xs h-8 pr-8"
                                                        />
                                                        {userFilters.mobile2 && (
                                                            <button
                                                                onClick={() => clearUserFilter('mobile2')}
                                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-red-500 hover:text-red-700"
                                                                title="Clear filter"
                                                            >
                                                                <X className="h-3 w-3" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </th>
                                                <th className="px-4 py-2"></th>
                                                <th className="px-4 py-2">
                                                    <div className="relative">
                                                        <Input
                                                            type="text"
                                                            placeholder="Search Status..."
                                                            value={userFilters.status}
                                                            onChange={(e) => handleUserFilterChange('status', e.target.value)}
                                                            className="w-full text-xs h-8 pr-8"
                                                        />
                                                        {userFilters.status && (
                                                            <button
                                                                onClick={() => clearUserFilter('status')}
                                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-red-500 hover:text-red-700"
                                                                title="Clear filter"
                                                            >
                                                                <X className="h-3 w-3" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </th>
                                                <th className="px-4 py-2"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                                            {paginatedUsers.length === 0 ? (
                                                <tr>
                                                    <td
                                                        colSpan={8}
                                                        className="px-4 py-8 text-center text-sm text-neutral-500"
                                                    >
                                                        No users found
                                                    </td>
                                                </tr>
                                            ) : (
                                                paginatedUsers.map((user) => (
                                                    <tr
                                                        key={user.id}
                                                        className="hover:bg-neutral-50 dark:hover:bg-neutral-900/50"
                                                    >
                                                        <td className="px-4 py-3 text-sm">{user.name}</td>
                                                        <td className="px-4 py-3 text-sm">{user.email}</td>
                                                        <td className="px-4 py-3 text-sm">{user.mobile1 || '-'}</td>
                                                        <td className="px-4 py-3 text-sm">{user.mobile2 || '-'}</td>
                                                        <td className="px-4 py-3 text-sm">
                                                            {user.company?.name || '-'}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm">
                                                            {user.roles && user.roles.length > 0
                                                                ? user.roles.map((r: any) => r.name).join(', ')
                                                                : 'No roles'}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm">
                                                            <Badge variant={user.is_active ? 'default' : 'secondary'}>
                                                                {user.is_active ? 'Active' : 'Inactive'}
                                                            </Badge>
                                                        </td>
                                                        <td className="px-4 py-3 text-right text-sm">
                                                            <div className="flex justify-end gap-2">
                                                                {can('core', 'users', 'read') && user.company_id && (
                                                                    <Link href={`/core/companies/${user.company_id}/users/${user.id}`}>
                                                                        <Button variant="ghost" size="sm">
                                                                            View
                                                                        </Button>
                                                                    </Link>
                                                                )}
                                                                {can('core', 'users', 'update') && user.company_id && (
                                                                    <Link href={`/core/companies/${user.company_id}/users/${user.id}/edit`}>
                                                                        <Button variant="ghost" size="sm">
                                                                            Edit
                                                                        </Button>
                                                                    </Link>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            <div className="py-8 text-center text-neutral-500">
                                <p>No users found for this riding company.</p>
                            </div>
                        )}
                    </Card>
                )}

                {activeTab === 'distribution' && (
                    <Card className="p-6">
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-lg font-semibold mb-2">Distribution Settings</h2>
                                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                                    Configure how leads are distributed among team members in this riding company.
                                </p>
                                
                                <div className="space-y-4">
                                    <div>
                                        <Label className="text-base font-medium mb-3 block">Distribution Method</Label>
                                        <RadioGroup
                                            value={distributionType}
                                            onValueChange={setDistributionType}
                                            className="space-y-3"
                                        >
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="equal" id="equal" />
                                                <Label htmlFor="equal" className="font-normal cursor-pointer flex-1">
                                                    Equal distribution (driver for each user)
                                                </Label>
                                            </div>
                                        </RadioGroup>
                                    </div>

                                    {distributionType === 'equal' && (
                                        <div className="space-y-4 mt-6">
                                            <div>
                                                <Label htmlFor="max_drivers_per_day" className="mb-2 block">
                                                    Max drivers per day per user
                                                </Label>
                                                <Input
                                                    id="max_drivers_per_day"
                                                    type="number"
                                                    min="1"
                                                    value={maxDriversPerDay}
                                                    onChange={(e) => setMaxDriversPerDay(parseInt(e.target.value) || 50)}
                                                    className="w-full max-w-xs"
                                                />
                                            </div>

                                            <div>
                                                <Label htmlFor="distribution_users" className="mb-2 block">
                                                    Assigned To
                                                </Label>
                                                <MultiSelect
                                                    options={filteredAvailableUsers.map((user) => ({
                                                        value: user.id,
                                                        label: user.name,
                                                    }))}
                                                    value={distributionUsers}
                                                    onChange={(value) => {
                                                        const newValue = value.map(v => typeof v === 'string' ? parseInt(v) : v);
                                                        setDistributionUsers(newValue);
                                                    }}
                                                    placeholder="Select users..."
                                                    className="w-full"
                                                    searchable={true}
                                                />
                                                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                                                    Select team members who will receive distributed drivers. You can select multiple users. The fresh-Leads user is automatically excluded.
                                                </p>
                                            </div>

                                            <Button
                                                onClick={handleSaveDistribution}
                                                disabled={savingDistribution || distributionUsers.length === 0}
                                                className="mt-4"
                                            >
                                                {savingDistribution ? 'Saving...' : 'Save Distribution Settings'}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Card>
                )}

                {activeTab === 'rotation' && (
                    <Card className="p-6">
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-lg font-semibold mb-2">Rotation Settings</h2>
                                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                                    Configure lead rotation rules and schedules for this riding company.
                                </p>
                                <div className="text-center py-12 text-neutral-500">
                                    <RefreshCw className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p>Rotation settings coming soon...</p>
                                </div>
                            </div>
                        </div>
                    </Card>
                )}

                {activeTab === 'integrations' && (
                    <Card className="p-6">
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-lg font-semibold mb-2">WhatsApp Integration</h2>
                                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                                    Connect WhatsApp to this riding company. Each riding company has its own WhatsApp session.
                                    Users in this riding company will see chats only for phone numbers they have access to.
                                </p>
                                <WhatsAppLinkDeviceRidingCompanyTab 
                                    ridingCompanyId={ridingCompany.id}
                                    defaultDriverUserId={ridingCompany.default_driver_user_id}
                                    defaultDriverUser={ridingCompany.default_driver_user}
                                    availableUsers={availableUsers || []}
                                    onUserChange={(userId, userName) => {
                                        router.put(`/ridingcarcompanies/riding-companies/${ridingCompany.id}`, {
                                            default_driver_user_id: userId,
                                        }, {
                                            preserveScroll: true,
                                            preserveState: false,
                                            onSuccess: (page) => {
                                                // The page will be reloaded automatically by Inertia::render() in the controller
                                                // No need for manual reload
                                            },
                                            onError: (errors) => {
                                                console.error('Error updating user:', errors);
                                            },
                                        });
                                    }}
                                />
                            </div>

                            <div className="border-t border-neutral-300/50 pt-6 mt-6">
                                <div className="bg-[#d0e7ff] rounded-lg p-6 text-neutral-800 dark:text-neutral-200">
                                    <h2 className="text-lg font-semibold mb-2 text-neutral-800 dark:text-neutral-200">Facebook Integration</h2>
                                    <p className="text-sm text-neutral-700 dark:text-neutral-300 mb-4">
                                        Connect your Facebook account. Any user can login with their Facebook account and access their own pages and leads.
                                    </p>
                                    <Link href={`/ridingcarcompanies/riding-companies/${ridingCompany.id}/facebook`}>
                                        <Button variant="outline" className="bg-white/80 hover:bg-white border-blue-300 text-blue-800">
                                            <Facebook className="h-4 w-4 mr-2" />
                                            Configure Facebook Integration
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </Card>
                )}
            </div>

            <DeleteDialog
                open={deleteDialog.open}
                onOpenChange={(open) => setDeleteDialog({ open, requirement: null })}
                onConfirm={confirmDeleteRequirement}
                title="Delete Document Requirement"
                description={`Are you sure you want to delete "${deleteDialog.requirement?.name}"? This action cannot be undone.`}
            />

            <DeleteDialog
                open={deleteStageDialog.open}
                onOpenChange={(open) => setDeleteStageDialog({ open, stage: null })}
                onConfirm={confirmDeleteStage}
                title="Delete Stage Template"
                description={`Are you sure you want to delete "${deleteStageDialog.stage?.name}"? This action cannot be undone.`}
            />
        </AppLayout>
    );
}

