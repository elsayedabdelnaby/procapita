import { ActivityLog } from '@/components/core/activity-log';
import { DataTable } from '@/components/core/data-table';
import { DeleteDialog } from '@/components/core/delete-dialog';
import { ImportModal } from '@/components/core/import-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Search, X, Pencil, Check, Eye, Phone, MessageCircle, ArrowUp, ArrowDown, User, Mail, CheckCircle2, FileText, Activity } from 'lucide-react';
import { useState, useMemo, useRef } from 'react';
import { type SharedData } from '@/types';

interface Company {
    id: number;
    name: string;
}

interface RidingCompany {
    id: number;
    name: string;
}

interface Campaign {
    id: number;
    name: string;
}

interface LeadSource {
    id: number;
    name: string;
}

interface LeadStatus {
    id: number;
    name: string;
    color?: string;
}

interface User {
    id: number;
    name: string;
}

interface Driver {
    id: number;
    uuid: string;
    company_id?: number;
    full_name: string;
    phone: string;
    whatsapp_phone?: string;
    email?: string;
    riding_company?: RidingCompany;
    campaign?: Campaign;
    lead_source?: LeadSource;
    assigned_to?: User;
    lead_status?: LeadStatus;
    created_at: string;
    updated_at: string;
}

interface FilterOption {
    id: number;
    name: string;
}

interface DriversIndexProps {
    drivers: Driver[];
    importAvailableFields?: Array<{ 
        value: string; 
        label: string; 
        type?: 'text' | 'email' | 'phone' | 'date' | 'picklist' | 'textarea';
        options?: Array<{ value: string | number; label: string }>;
    }>;
    filterOptions?: {
        companies: FilterOption[];
        ridingCompanies: FilterOption[];
        campaigns: FilterOption[];
        leadSources: FilterOption[];
        leadStatuses: FilterOption[];
        users: FilterOption[];
    };
}

export default function DriversIndex({ drivers, importAvailableFields, filterOptions = {} }: DriversIndexProps) {
    const page = usePage<SharedData>();
    const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; driver: Driver | null }>({
        open: false,
        driver: null,
    });

    const hasPermission = (permission: string): boolean => {
        const user = page.props.auth?.user;
        if (user?.is_super_admin || user?.is_company_admin) {
            return true;
        }
        const permissions = (user as any)?.permissions || [];
        return permissions.some((p: any) => p.name === permission);
    };

    const canMassEdit = () => {
        return hasPermission('drivers.drivers.mass-edit');
    };

    const canMassDelete = () => {
        return hasPermission('drivers.drivers.mass-delete');
    };

    const canDeleteDriver = () => {
        return hasPermission('drivers.drivers.delete');
    };

    const canDeleteAllDrivers = () => {
        return hasPermission('drivers.drivers.delete-all');
    };
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [selectedDrivers, setSelectedDrivers] = useState<Set<number>>(new Set());
    const [massDeleteDialog, setMassDeleteDialog] = useState(false);
    
    // Quick edit states
    const [editingRowId, setEditingRowId] = useState<number | null>(null);
    const [editingData, setEditingData] = useState<Partial<Driver> | null>(null);
    
    // View details dialog states
    const [viewDialogOpen, setViewDialogOpen] = useState(false);
    const [viewingDriver, setViewingDriver] = useState<Driver | null>(null);
    const [driverDetails, setDriverDetails] = useState<any>(null);
    const [driverActivities, setDriverActivities] = useState<any[]>([]);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [hoveredPhone, setHoveredPhone] = useState<string | null>(null);
    const [hoveredEmail, setHoveredEmail] = useState<string | null>(null);
    const [viewDialogTab, setViewDialogTab] = useState<'overview' | 'updates'>('overview');
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const emailHoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [viewingDocument, setViewingDocument] = useState<{ id: number; url: string; extension?: string } | null>(null);

    // Sort states
    const [sortField, setSortField] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    // Filter states
    const [filters, setFilters] = useState<Record<string, string | number | null | 'is_empty'>>({
        full_name: '',
        phone: '',
        whatsapp_phone: '',
        email: '',
        riding_company: '',
        campaign_id: null,
        lead_source_id: null,
        lead_status_id: null,
        assigned_to: null,
    });

    const defaultAvailableFields = [
        { value: 'full_name', label: 'Full Name' },
        { value: 'phone', label: 'Phone' },
        { value: 'whatsapp_phone', label: 'WhatsApp Phone' },
        { value: 'email', label: 'Email' },
        { value: 'company_id', label: 'Company' },
        { value: 'riding_company_id', label: 'Riding Company' },
        { value: 'campaign_id', label: 'Campaign' },
        { value: 'lead_source_id', label: 'Lead Source' },
        { value: 'lead_status_id', label: 'Lead Status' },
        { value: 'assigned_to', label: 'Assigned To' },
        { value: 'notes', label: 'Notes' },
    ];

    const availableFields = importAvailableFields || defaultAvailableFields;

    const handleDelete = (driver: Driver) => {
        setDeleteDialog({ open: true, driver });
    };

    const confirmDelete = () => {
        if (deleteDialog.driver) {
            router.delete(`/drivers/drivers/${deleteDialog.driver.id}`, {
                onSuccess: () => {
                    // Reload current page and related pages
                    router.reload({ only: ['drivers'] });
                },
            });
        }
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedDrivers(new Set(drivers.map((d) => d.id)));
        } else {
            setSelectedDrivers(new Set());
        }
    };

    const handleSelectDriver = (driverId: number, checked: boolean) => {
        const newSelected = new Set(selectedDrivers);
        if (checked) {
            newSelected.add(driverId);
        } else {
            newSelected.delete(driverId);
        }
        setSelectedDrivers(newSelected);
    };

    const isAllSelected = drivers.length > 0 && selectedDrivers.size === drivers.length;
    const isIndeterminate = selectedDrivers.size > 0 && selectedDrivers.size < drivers.length;

    // Filter drivers based on active filters
    const filteredDrivers = useMemo(() => {
        return drivers.filter((driver) => {
            // Full name filter
            if (filters.full_name) {
                if (filters.full_name === 'is_empty') {
                    if (driver.full_name && driver.full_name.trim() !== '') {
                        return false;
                    }
                } else if (!driver.full_name.toLowerCase().includes(String(filters.full_name).toLowerCase())) {
                    return false;
                }
            }
            // Phone filter (contains search)
            if (filters.phone) {
                if (filters.phone === 'is_empty') {
                    if (driver.phone && driver.phone.trim() !== '') {
                        return false;
                    }
                } else if (String(filters.phone).trim() !== '') {
                    const phoneStr = driver.phone ? String(driver.phone).toLowerCase() : '';
                    const filterPhone = String(filters.phone).toLowerCase().trim();
                    if (!phoneStr.includes(filterPhone)) {
                        return false;
                    }
                }
            }
            // WhatsApp filter (contains search)
            if (filters.whatsapp_phone) {
                if (filters.whatsapp_phone === 'is_empty') {
                    if (driver.whatsapp_phone && driver.whatsapp_phone.trim() !== '') {
                        return false;
                    }
                } else if (String(filters.whatsapp_phone).trim() !== '') {
                    const whatsappStr = driver.whatsapp_phone ? String(driver.whatsapp_phone).toLowerCase() : '';
                    const filterWhatsapp = String(filters.whatsapp_phone).toLowerCase().trim();
                    if (!whatsappStr.includes(filterWhatsapp)) {
                        return false;
                    }
                }
            }
            // Email filter
            if (filters.email) {
                if (filters.email === 'is_empty') {
                    if (driver.email && driver.email.trim() !== '') {
                        return false;
                    }
                } else if (!driver.email || !driver.email.toLowerCase().includes(String(filters.email).toLowerCase())) {
                    return false;
                }
            }
            // Riding Company filter (text search)
            if (filters.riding_company) {
                if (filters.riding_company === 'is_empty') {
                    if (driver.riding_company?.name && driver.riding_company.name.trim() !== '') {
                        return false;
                    }
                } else if (!driver.riding_company?.name || !driver.riding_company.name.toLowerCase().includes(String(filters.riding_company).toLowerCase())) {
                    return false;
                }
            }
            // Campaign filter
            if (filters.campaign_id) {
                if (filters.campaign_id === 'is_empty') {
                    if (driver.campaign?.id) {
                        return false;
                    }
                } else if (driver.campaign?.id !== filters.campaign_id) {
                    return false;
                }
            }
            // Lead Source filter
            if (filters.lead_source_id) {
                if (filters.lead_source_id === 'is_empty') {
                    if (driver.lead_source?.id) {
                        return false;
                    }
                } else if (driver.lead_source?.id !== filters.lead_source_id) {
                    return false;
                }
            }
            // Lead Status filter
            if (filters.lead_status_id) {
                if (filters.lead_status_id === 'is_empty') {
                    if (driver.lead_status?.id) {
                        return false;
                    }
                } else if (driver.lead_status?.id !== filters.lead_status_id) {
                    return false;
                }
            }
            // Assigned To filter
            if (filters.assigned_to) {
                if (filters.assigned_to === 'is_empty') {
                    if (driver.assigned_to?.id) {
                        return false;
                    }
                } else if (driver.assigned_to?.id !== filters.assigned_to) {
                    return false;
                }
            }
            return true;
        });
    }, [drivers, filters]);

    const sortedAndFilteredDrivers = useMemo(() => {
        let result = [...filteredDrivers];
        
        if (sortField) {
            result.sort((a, b) => {
                let aValue: any;
                let bValue: any;
                
                switch (sortField) {
                    case 'full_name':
                        aValue = a.full_name || '';
                        bValue = b.full_name || '';
                        break;
                    case 'phone':
                        aValue = a.phone || '';
                        bValue = b.phone || '';
                        break;
                    case 'whatsapp_phone':
                        aValue = a.whatsapp_phone || '';
                        bValue = b.whatsapp_phone || '';
                        break;
                    case 'email':
                        aValue = a.email || '';
                        bValue = b.email || '';
                        break;
                    case 'riding_company':
                        aValue = a.riding_company?.name || '';
                        bValue = b.riding_company?.name || '';
                        break;
                    case 'campaign':
                        aValue = a.campaign?.name || '';
                        bValue = b.campaign?.name || '';
                        break;
                    case 'lead_source':
                        aValue = a.lead_source?.name || '';
                        bValue = b.lead_source?.name || '';
                        break;
                    case 'lead_status':
                        aValue = a.lead_status?.name || '';
                        bValue = b.lead_status?.name || '';
                        break;
                    case 'assigned_to':
                        aValue = a.assigned_to?.name || '';
                        bValue = b.assigned_to?.name || '';
                        break;
                    default:
                        return 0;
                }
                
                // Convert to string for comparison
                aValue = String(aValue).toLowerCase();
                bValue = String(bValue).toLowerCase();
                
                if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
                return 0;
            });
        } else {
            // Default sort by updated_at desc
            result.sort((a, b) => {
                const aDate = new Date(a.updated_at).getTime();
                const bDate = new Date(b.updated_at).getTime();
                return bDate - aDate;
            });
        }
        
        return result;
    }, [filteredDrivers, sortField, sortDirection]);

    const handleFilterChange = (field: string, value: string | number | null | 'is_empty') => {
        setFilters((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const clearFilter = (field: string) => {
        setFilters((prev) => ({
            ...prev,
            [field]: field.includes('_id') || field.includes('_to') ? null : '',
        }));
    };

    const hasActiveFilter = (field: string): boolean => {
        const value = filters[field];
        return value !== null && value !== '' && value !== undefined;
    };

    const hasAnyActiveFilter = (): boolean => {
        return Object.values(filters).some((value) => value !== null && value !== '' && value !== undefined);
    };

    const clearAllFilters = () => {
        setFilters({
            full_name: '',
            phone: '',
            whatsapp_phone: '',
            email: '',
            riding_company: '',
            campaign_id: null,
            lead_source_id: null,
            lead_status_id: null,
            assigned_to: null,
        });
    };

    const handleSort = (field: string) => {
        if (sortField === field) {
            // Toggle direction
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            // New field, start with ascending
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const clearSort = () => {
        setSortField(null);
        setSortDirection('desc');
    };

    const isFilterEmpty = (field: string): boolean => {
        return filters[field] === 'is_empty';
    };

    const handleMassDelete = () => {
        setMassDeleteDialog(true);
    };

    const confirmMassDelete = () => {
        if (selectedDrivers.size > 0) {
            router.post('/drivers/drivers/mass-delete', {
                ids: Array.from(selectedDrivers),
            }, {
                onSuccess: () => {
                    setSelectedDrivers(new Set());
                    setMassDeleteDialog(false);
                    // Reload current page
                    router.reload({ only: ['drivers'] });
                },
            });
        }
    };

    const handleMassEdit = () => {
        if (selectedDrivers.size > 0) {
            const ids = Array.from(selectedDrivers);
            router.visit(`/drivers/drivers/mass-edit?ids=${ids.join(',')}`);
        }
    };

    const handleQuickEdit = (driver: Driver) => {
        setEditingRowId(driver.id);
        // Reset editing data to ensure clean state
        setEditingData({
            full_name: driver.full_name || '',
            phone: driver.phone || '',
            whatsapp_phone: driver.whatsapp_phone || '',
            email: driver.email || '',
            riding_company_id: driver.riding_company?.id || null,
            campaign_id: driver.campaign?.id || null,
            lead_source_id: driver.lead_source?.id || null,
            lead_status_id: driver.lead_status?.id || null,
            assigned_to: driver.assigned_to?.id || null,
        });
    };

    const handleQuickSave = (driverId: number) => {
        if (!editingData) return;

        // Validate required fields
        if (!editingData.full_name || !editingData.phone) {
            alert('Full Name and Phone are required fields.');
            return;
        }

        // Find the driver to get company_id
        const driver = drivers.find((d) => d.id === driverId);
        if (!driver) {
            alert('Driver not found.');
            return;
        }

        // Close editing mode immediately for better UX
        setEditingRowId(null);
        const savedData = { ...editingData };
        setEditingData(null);

        // Prepare data for submission
        const submitData: Record<string, any> = {
            full_name: savedData.full_name,
            phone: savedData.phone,
        };

        // Add optional fields only if they have values
        if (savedData.whatsapp_phone) {
            submitData.whatsapp_phone = savedData.whatsapp_phone;
        }
        if (savedData.email) {
            submitData.email = savedData.email;
        }
        if (savedData.riding_company_id) {
            submitData.riding_company_id = savedData.riding_company_id;
        }
        if (savedData.campaign_id) {
            submitData.campaign_id = savedData.campaign_id;
        }
        if (savedData.lead_source_id) {
            submitData.lead_source_id = savedData.lead_source_id;
        }
        if (savedData.lead_status_id) {
            submitData.lead_status_id = savedData.lead_status_id;
        }
        if (savedData.assigned_to) {
            submitData.assigned_to = savedData.assigned_to;
        }
        // Add company_id if driver has it
        if (driver.company_id) {
            submitData.company_id = driver.company_id;
        }

        router.put(
            `/drivers/drivers/${driverId}`,
            submitData,
            {
                preserveScroll: true,
                onSuccess: () => {
                    // Reload to get updated data
                    router.reload({ only: ['drivers', 'filterOptions', 'importAvailableFields'] });
                },
                onError: (errors) => {
                    console.error('Error saving driver:', errors);
                    // Reopen editing mode on error
                    setEditingRowId(driverId);
                    setEditingData(savedData);
                    
                    // Extract error messages
                    let errorMessage = 'Error saving driver. Please try again.';
                    if (errors && typeof errors === 'object') {
                        const errorArray = Object.values(errors).flat();
                        if (errorArray.length > 0) {
                            errorMessage = Array.isArray(errorArray) 
                                ? errorArray.join(', ')
                                : String(errorArray);
                        }
                    }
                    alert(errorMessage);
                },
            }
        );
    };

    const handleQuickCancel = () => {
        setEditingRowId(null);
        setEditingData(null);
    };

    const updateEditingData = (field: string, value: string | number | null) => {
        setEditingData((prev) => (prev ? { ...prev, [field]: value } : null));
    };

    const formatPhoneForWhatsApp = (phone: string): string => {
        // Remove all non-numeric characters except +
        let cleaned = phone.replace(/[^\d+]/g, '');
        // If starts with 0, replace with country code
        if (cleaned.startsWith('0')) {
            cleaned = '+20' + cleaned.substring(1);
        } else if (cleaned.startsWith('20')) {
            cleaned = '+' + cleaned;
        } else if (!cleaned.startsWith('+')) {
            cleaned = '+20' + cleaned;
        }
        // URL encode
        return encodeURIComponent(cleaned);
    };

    const handleViewDetails = async (driver: Driver) => {
        setViewingDriver(driver);
        setViewDialogOpen(true);
        setViewDialogTab('overview');
        setLoadingDetails(true);
        
        try {
            const response = await fetch(`/drivers/drivers/${driver.id}/details`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
            });
            
            if (response.ok) {
                const data = await response.json();
                setDriverDetails(data.driver);
                setDriverActivities(data.activities || []);
            } else {
                const errorText = await response.text();
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch {
                    errorData = { error: errorText || 'Unknown error' };
                }
                console.error('Failed to load driver details:', errorData);
                alert(errorData.error || 'Failed to load driver details. Please try again.');
                setViewDialogOpen(false);
            }
        } catch (error) {
            console.error('Error loading driver details:', error);
            alert('Error loading driver details. Please try again.');
            setViewDialogOpen(false);
        } finally {
            setLoadingDetails(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
            completed: 'default',
            pending: 'secondary',
            in_progress: 'outline',
            rejected: 'destructive',
            approved: 'default',
        };

        return (
            <Badge variant={variants[status] || 'secondary'}>
                {status.replace('_', ' ').toUpperCase()}
            </Badge>
        );
    };

    const handleViewFile = (docId: number) => {
        const url = `/drivers/driver-documents/${docId}/view`;
        const doc = driverDetails?.documents?.find((d: any) => d.id === docId);
        const extension = getFileExtension(doc?.original_filename, doc?.uploaded_path)?.toLowerCase();
        setViewingDocument({ id: docId, url, extension: extension || undefined });
    };

    const getFileExtension = (filename?: string, path?: string): string | null => {
        const source = filename || path;
        if (!source) return null;
        
        const parts = source.split('.');
        if (parts.length > 1) {
            return parts[parts.length - 1].toUpperCase();
        }
        return null;
    };

    return (
        <AppLayout>
            <Head title="Drivers" />

            <div className="p-6">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Drivers</h1>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            Manage drivers and their onboarding process
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                window.location.href = '/drivers/drivers/export';
                            }}
                        >
                                Export
                            </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setImportModalOpen(true)}
                        >
                                Import
                            </Button>
                        {canDeleteAllDrivers() && drivers.length > 0 && (
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={() => {
                                    if (confirm(`Are you sure you want to delete ALL ${drivers.length} driver(s)? This action cannot be undone.`)) {
                                        const allIds = drivers.map(d => d.id);
                                        router.post('/drivers/drivers/mass-delete', {
                                            ids: allIds,
                                        }, {
                                            onSuccess: () => {
                                                router.reload({ only: ['drivers'] });
                                            },
                                        });
                                    }
                                }}
                            >
                                Delete All
                            </Button>
                        )}
                        <Link href="/drivers/drivers/create">
                            <Button>Create Driver</Button>
                        </Link>
                    </div>
                </div>

                <Card className="p-6">
                    {drivers.length > 0 ? (
                        <>
                            {/* Mass Actions Bar */}
                            {selectedDrivers.size > 0 && (
                                <div className="mb-4 p-3 bg-muted rounded-md flex items-center justify-between">
                                    <span className="text-sm font-medium">
                                        {selectedDrivers.size} driver(s) selected
                                    </span>
                                    <div className="flex gap-2">
                                        {canMassEdit() && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={handleMassEdit}
                                            >
                                                Mass Edit
                                            </Button>
                                        )}
                                        {canMassDelete() && (
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                size="sm"
                                                onClick={handleMassDelete}
                                            >
                                                Delete Selected
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="overflow-x-auto rounded-lg border">
                                <table className="w-full">
                                    <thead className="bg-neutral-50 dark:bg-neutral-900">
                                        <tr>
                                            <th className="px-4 py-3 text-left w-12">
                                                <Checkbox
                                                    checked={isAllSelected || isIndeterminate}
                                                    onCheckedChange={handleSelectAll}
                                                />
                                            </th>
                                            <th className="px-4 py-3 text-center text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                Actions
                                            </th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                <button
                                                    type="button"
                                                    onClick={() => handleSort('full_name')}
                                                    className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                                >
                                                    {sortField === 'full_name' && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                clearSort();
                                                            }}
                                                            className="text-red-500 hover:text-red-700 mr-1"
                                                            title="Clear sort"
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    )}
                                                    <span>Name</span>
                                                    {sortField === 'full_name' ? (
                                                        sortDirection === 'asc' ? (
                                                            <ArrowUp className="h-3 w-3" />
                                                        ) : (
                                                            <ArrowDown className="h-3 w-3" />
                                                        )
                                                    ) : (
                                                        <div className="h-3 w-3" />
                                                    )}
                                                </button>
                                            </th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                <button
                                                    type="button"
                                                    onClick={() => handleSort('phone')}
                                                    className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                                >
                                                    {sortField === 'phone' && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                clearSort();
                                                            }}
                                                            className="text-red-500 hover:text-red-700 mr-1"
                                                            title="Clear sort"
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    )}
                                                    <span>Phone</span>
                                                    {sortField === 'phone' ? (
                                                        sortDirection === 'asc' ? (
                                                            <ArrowUp className="h-3 w-3" />
                                                        ) : (
                                                            <ArrowDown className="h-3 w-3" />
                                                        )
                                                    ) : (
                                                        <div className="h-3 w-3" />
                                                    )}
                                                </button>
                                            </th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                <button
                                                    type="button"
                                                    onClick={() => handleSort('whatsapp_phone')}
                                                    className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                                >
                                                    {sortField === 'whatsapp_phone' && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                clearSort();
                                                            }}
                                                            className="text-red-500 hover:text-red-700 mr-1"
                                                            title="Clear sort"
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    )}
                                                    <span>WhatsApp</span>
                                                    {sortField === 'whatsapp_phone' ? (
                                                        sortDirection === 'asc' ? (
                                                            <ArrowUp className="h-3 w-3" />
                                                        ) : (
                                                            <ArrowDown className="h-3 w-3" />
                                                        )
                                                    ) : (
                                                        <div className="h-3 w-3" />
                                                    )}
                                                </button>
                                            </th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                <button
                                                    type="button"
                                                    onClick={() => handleSort('email')}
                                                    className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                                >
                                                    {sortField === 'email' && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                clearSort();
                                                            }}
                                                            className="text-red-500 hover:text-red-700 mr-1"
                                                            title="Clear sort"
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    )}
                                                    <span>Email</span>
                                                    {sortField === 'email' ? (
                                                        sortDirection === 'asc' ? (
                                                            <ArrowUp className="h-3 w-3" />
                                                        ) : (
                                                            <ArrowDown className="h-3 w-3" />
                                                        )
                                                    ) : (
                                                        <div className="h-3 w-3" />
                                                    )}
                                                </button>
                                            </th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                <button
                                                    type="button"
                                                    onClick={() => handleSort('riding_company')}
                                                    className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                                >
                                                    {sortField === 'riding_company' && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                clearSort();
                                                            }}
                                                            className="text-red-500 hover:text-red-700 mr-1"
                                                            title="Clear sort"
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    )}
                                                    <span>Riding Company</span>
                                                    {sortField === 'riding_company' ? (
                                                        sortDirection === 'asc' ? (
                                                            <ArrowUp className="h-3 w-3" />
                                                        ) : (
                                                            <ArrowDown className="h-3 w-3" />
                                                        )
                                                    ) : (
                                                        <div className="h-3 w-3" />
                                                    )}
                                                </button>
                                            </th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                <button
                                                    type="button"
                                                    onClick={() => handleSort('campaign')}
                                                    className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                                >
                                                    {sortField === 'campaign' && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                clearSort();
                                                            }}
                                                            className="text-red-500 hover:text-red-700 mr-1"
                                                            title="Clear sort"
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    )}
                                                    <span>Campaign</span>
                                                    {sortField === 'campaign' ? (
                                                        sortDirection === 'asc' ? (
                                                            <ArrowUp className="h-3 w-3" />
                                                        ) : (
                                                            <ArrowDown className="h-3 w-3" />
                                                        )
                                                    ) : (
                                                        <div className="h-3 w-3" />
                                                    )}
                                                </button>
                                            </th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                <button
                                                    type="button"
                                                    onClick={() => handleSort('lead_source')}
                                                    className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                                >
                                                    {sortField === 'lead_source' && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                clearSort();
                                                            }}
                                                            className="text-red-500 hover:text-red-700 mr-1"
                                                            title="Clear sort"
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    )}
                                                    <span>Lead Source</span>
                                                    {sortField === 'lead_source' ? (
                                                        sortDirection === 'asc' ? (
                                                            <ArrowUp className="h-3 w-3" />
                                                        ) : (
                                                            <ArrowDown className="h-3 w-3" />
                                                        )
                                                    ) : (
                                                        <div className="h-3 w-3" />
                                                    )}
                                                </button>
                                            </th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                <button
                                                    type="button"
                                                    onClick={() => handleSort('lead_status')}
                                                    className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                                >
                                                    {sortField === 'lead_status' && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                clearSort();
                                                            }}
                                                            className="text-red-500 hover:text-red-700 mr-1"
                                                            title="Clear sort"
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    )}
                                                    <span>Lead Status</span>
                                                    {sortField === 'lead_status' ? (
                                                        sortDirection === 'asc' ? (
                                                            <ArrowUp className="h-3 w-3" />
                                                        ) : (
                                                            <ArrowDown className="h-3 w-3" />
                                                        )
                                                    ) : (
                                                        <div className="h-3 w-3" />
                                                    )}
                                                </button>
                                            </th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                <button
                                                    type="button"
                                                    onClick={() => handleSort('assigned_to')}
                                                    className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                                >
                                                    {sortField === 'assigned_to' && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                clearSort();
                                                            }}
                                                            className="text-red-500 hover:text-red-700 mr-1"
                                                            title="Clear sort"
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    )}
                                                    <span>Assigned To</span>
                                                    {sortField === 'assigned_to' ? (
                                                        sortDirection === 'asc' ? (
                                                            <ArrowUp className="h-3 w-3" />
                                                        ) : (
                                                            <ArrowDown className="h-3 w-3" />
                                                        )
                                                    ) : (
                                                        <div className="h-3 w-3" />
                                                    )}
                                                </button>
                                            </th>
                                        </tr>
                                        {/* Filter Row */}
                                        <tr className="bg-neutral-100 dark:bg-neutral-800/50">
                                            <th className="px-4 py-2"></th>
                                            <th className="px-4 py-2">
                                                <div className="flex items-center justify-center">
                                                    {hasAnyActiveFilter() ? (
                                                        <button
                                                            onClick={clearAllFilters}
                                                            className="text-red-500 hover:text-red-700 transition-colors"
                                                            title="Clear all filters"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                    ) : (
                                                        <div className="text-green-500">
                                                            <Search className="h-4 w-4" />
                                                        </div>
                                                    )}
                                                </div>
                                            </th>
                                            {/* Name Filter */}
                                            <th className="px-4 py-2">
                                                <div className="relative">
                                                    <Input
                                                        type="text"
                                                        placeholder="Search name..."
                                                        value={typeof filters.full_name === 'string' && filters.full_name !== 'is_empty' ? filters.full_name : ''}
                                                        onChange={(e) => handleFilterChange('full_name', e.target.value)}
                                                        className="w-full text-xs h-8 pr-20"
                                                    />
                                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                                        {!hasActiveFilter('full_name') && (
                                                            <button
                                                                onClick={() => handleFilterChange('full_name', 'is_empty')}
                                                                className="text-xs text-blue-500 hover:text-blue-700 px-1"
                                                                title="Filter empty"
                                                            >
                                                                Empty
                                                            </button>
                                                        )}
                                                        {hasActiveFilter('full_name') && (
                                                            <button
                                                                onClick={() => clearFilter('full_name')}
                                                                className="text-red-500 hover:text-red-700"
                                                                title="Clear filter"
                                                            >
                                                                <X className="h-3 w-3" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </th>
                                            {/* Phone Filter */}
                                            <th className="px-4 py-2">
                                                <div className="relative">
                                                    <Input
                                                        type="text"
                                                        placeholder="Search phone..."
                                                        value={typeof filters.phone === 'string' && filters.phone !== 'is_empty' ? filters.phone : ''}
                                                        onChange={(e) => handleFilterChange('phone', e.target.value)}
                                                        className="w-full text-xs h-8 pr-20"
                                                    />
                                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                                        {!hasActiveFilter('phone') && (
                                                            <button
                                                                onClick={() => handleFilterChange('phone', 'is_empty')}
                                                                className="text-xs text-blue-500 hover:text-blue-700 px-1"
                                                                title="Filter empty"
                                                            >
                                                                Empty
                                                            </button>
                                                        )}
                                                        {hasActiveFilter('phone') && (
                                                            <button
                                                                onClick={() => clearFilter('phone')}
                                                                className="text-red-500 hover:text-red-700"
                                                                title="Clear filter"
                                                            >
                                                                <X className="h-3 w-3" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </th>
                                            {/* WhatsApp Filter */}
                                            <th className="px-4 py-2">
                                                <div className="relative">
                                                    <Input
                                                        type="text"
                                                        placeholder="Search WhatsApp..."
                                                        value={typeof filters.whatsapp_phone === 'string' && filters.whatsapp_phone !== 'is_empty' ? filters.whatsapp_phone : ''}
                                                        onChange={(e) => handleFilterChange('whatsapp_phone', e.target.value)}
                                                        className="w-full text-xs h-8 pr-20"
                                                    />
                                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                                        {!hasActiveFilter('whatsapp_phone') && (
                                                            <button
                                                                onClick={() => handleFilterChange('whatsapp_phone', 'is_empty')}
                                                                className="text-xs text-blue-500 hover:text-blue-700 px-1"
                                                                title="Filter empty"
                                                            >
                                                                Empty
                                                            </button>
                                                        )}
                                                        {hasActiveFilter('whatsapp_phone') && (
                                                            <button
                                                                onClick={() => clearFilter('whatsapp_phone')}
                                                                className="text-red-500 hover:text-red-700"
                                                                title="Clear filter"
                                                            >
                                                                <X className="h-3 w-3" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </th>
                                            {/* Email Filter */}
                                            <th className="px-4 py-2">
                                                <div className="relative">
                                                    <Input
                                                        type="text"
                                                        placeholder="Search email..."
                                                        value={typeof filters.email === 'string' && filters.email !== 'is_empty' ? filters.email : ''}
                                                        onChange={(e) => handleFilterChange('email', e.target.value)}
                                                        className="w-full text-xs h-8 pr-20"
                                                    />
                                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                                        {!hasActiveFilter('email') && (
                                                            <button
                                                                onClick={() => handleFilterChange('email', 'is_empty')}
                                                                className="text-xs text-blue-500 hover:text-blue-700 px-1"
                                                                title="Filter empty"
                                                            >
                                                                Empty
                                                            </button>
                                                        )}
                                                        {hasActiveFilter('email') && (
                                                            <button
                                                                onClick={() => clearFilter('email')}
                                                                className="text-red-500 hover:text-red-700"
                                                                title="Clear filter"
                                                            >
                                                                <X className="h-3 w-3" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </th>
                                            {/* Riding Company Filter */}
                                            <th className="px-4 py-2">
                                                <div className="relative">
                                                    <Input
                                                        type="text"
                                                        placeholder="Search riding company..."
                                                        value={typeof filters.riding_company === 'string' && filters.riding_company !== 'is_empty' ? filters.riding_company : ''}
                                                        onChange={(e) => handleFilterChange('riding_company', e.target.value)}
                                                        className="w-full text-xs h-8 pr-20"
                                                    />
                                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                                        {!hasActiveFilter('riding_company') && (
                                                            <button
                                                                onClick={() => handleFilterChange('riding_company', 'is_empty')}
                                                                className="text-xs text-blue-500 hover:text-blue-700 px-1"
                                                                title="Filter empty"
                                                            >
                                                                Empty
                                                            </button>
                                                        )}
                                                        {hasActiveFilter('riding_company') && (
                                                            <button
                                                                onClick={() => clearFilter('riding_company')}
                                                                className="text-red-500 hover:text-red-700"
                                                                title="Clear filter"
                                                            >
                                                                <X className="h-3 w-3" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </th>
                                            {/* Campaign Filter */}
                                            <th className="px-4 py-2">
                                                <div className="relative">
                                                    <Select
                                                        key={`campaign-${filters.campaign_id === 'is_empty' ? 'is_empty' : (filters.campaign_id || 'empty')}`}
                                                        value={filters.campaign_id === 'is_empty' ? 'is_empty' : (filters.campaign_id ? String(filters.campaign_id) : undefined)}
                                                        onValueChange={(value) => {
                                                            if (value === '__none__') {
                                                                clearFilter('campaign_id');
                                                            } else if (value === 'is_empty') {
                                                                handleFilterChange('campaign_id', 'is_empty');
                                                            } else {
                                                                handleFilterChange('campaign_id', Number(value));
                                                            }
                                                        }}
                                                    >
                                                        <SelectTrigger className="w-full text-xs h-8 pr-8">
                                                            <SelectValue placeholder="Select..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="__none__">-- All --</SelectItem>
                                                            <SelectItem value="is_empty" className="text-blue-500 hover:text-blue-700">Is Empty</SelectItem>
                                                            {filterOptions.campaigns?.map((option) => (
                                                                <SelectItem key={option.id} value={String(option.id)}>
                                                                    {option.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    {hasActiveFilter('campaign_id') && (
                                                        <button
                                                            onClick={() => clearFilter('campaign_id')}
                                                            className="absolute right-8 top-1/2 -translate-y-1/2 text-red-500 hover:text-red-700 z-10"
                                                            title="Clear filter"
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    )}
                                                </div>
                                            </th>
                                            {/* Lead Source Filter */}
                                            <th className="px-4 py-2">
                                                <div className="relative">
                                                    <Select
                                                        key={`lead_source-${filters.lead_source_id === 'is_empty' ? 'is_empty' : (filters.lead_source_id || 'empty')}`}
                                                        value={filters.lead_source_id === 'is_empty' ? 'is_empty' : (filters.lead_source_id ? String(filters.lead_source_id) : undefined)}
                                                        onValueChange={(value) => {
                                                            if (value === '__none__') {
                                                                clearFilter('lead_source_id');
                                                            } else if (value === 'is_empty') {
                                                                handleFilterChange('lead_source_id', 'is_empty');
                                                            } else {
                                                                handleFilterChange('lead_source_id', Number(value));
                                                            }
                                                        }}
                                                    >
                                                        <SelectTrigger className="w-full text-xs h-8 pr-8">
                                                            <SelectValue placeholder="Select..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="__none__">-- All --</SelectItem>
                                                            <SelectItem value="is_empty" className="text-blue-500 hover:text-blue-700">Is Empty</SelectItem>
                                                            {filterOptions.leadSources?.map((option) => (
                                                                <SelectItem key={option.id} value={String(option.id)}>
                                                                    {option.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    {hasActiveFilter('lead_source_id') && (
                                                        <button
                                                            onClick={() => clearFilter('lead_source_id')}
                                                            className="absolute right-8 top-1/2 -translate-y-1/2 text-red-500 hover:text-red-700 z-10"
                                                            title="Clear filter"
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    )}
                                                </div>
                                            </th>
                                            {/* Lead Status Filter */}
                                            <th className="px-4 py-2">
                                                <div className="relative">
                                                    <Select
                                                        key={`lead_status-${filters.lead_status_id === 'is_empty' ? 'is_empty' : (filters.lead_status_id || 'empty')}`}
                                                        value={filters.lead_status_id === 'is_empty' ? 'is_empty' : (filters.lead_status_id ? String(filters.lead_status_id) : undefined)}
                                                        onValueChange={(value) => {
                                                            if (value === '__none__') {
                                                                clearFilter('lead_status_id');
                                                            } else if (value === 'is_empty') {
                                                                handleFilterChange('lead_status_id', 'is_empty');
                                                            } else {
                                                                handleFilterChange('lead_status_id', Number(value));
                                                            }
                                                        }}
                                                    >
                                                        <SelectTrigger className="w-full text-xs h-8 pr-8">
                                                            <SelectValue placeholder="Select..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="__none__">-- All --</SelectItem>
                                                            <SelectItem value="is_empty" className="text-blue-500 hover:text-blue-700">Is Empty</SelectItem>
                                                            {filterOptions.leadStatuses?.map((option) => (
                                                                <SelectItem key={option.id} value={String(option.id)}>
                                                                    {option.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    {hasActiveFilter('lead_status_id') && (
                                                        <button
                                                            onClick={() => clearFilter('lead_status_id')}
                                                            className="absolute right-8 top-1/2 -translate-y-1/2 text-red-500 hover:text-red-700 z-10"
                                                            title="Clear filter"
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    )}
                                                </div>
                                            </th>
                                            {/* Assigned To Filter */}
                                            <th className="px-4 py-2">
                                                <div className="relative">
                                                    <Select
                                                        key={`assigned_to-${filters.assigned_to === 'is_empty' ? 'is_empty' : (filters.assigned_to || 'empty')}`}
                                                        value={filters.assigned_to === 'is_empty' ? 'is_empty' : (filters.assigned_to ? String(filters.assigned_to) : undefined)}
                                                        onValueChange={(value) => {
                                                            if (value === '__none__') {
                                                                clearFilter('assigned_to');
                                                            } else if (value === 'is_empty') {
                                                                handleFilterChange('assigned_to', 'is_empty');
                                                            } else {
                                                                handleFilterChange('assigned_to', Number(value));
                                                            }
                                                        }}
                                                    >
                                                        <SelectTrigger className="w-full text-xs h-8 pr-8">
                                                            <SelectValue placeholder="Select..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="__none__">-- All --</SelectItem>
                                                            <SelectItem value="is_empty" className="text-blue-500 hover:text-blue-700">Is Empty</SelectItem>
                                                            {filterOptions.users?.map((option) => (
                                                                <SelectItem key={option.id} value={String(option.id)}>
                                                                    {option.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    {hasActiveFilter('assigned_to') && (
                                                        <button
                                                            onClick={() => clearFilter('assigned_to')}
                                                            className="absolute right-8 top-1/2 -translate-y-1/2 text-red-500 hover:text-red-700 z-10"
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
                                        {sortedAndFilteredDrivers.map((row) => (
                                            <tr
                                                key={row.id}
                                                className="hover:bg-neutral-50 dark:hover:bg-neutral-900/50"
                                            >
                                                <td className="px-4 py-3">
                                                    <Checkbox
                                                        checked={selectedDrivers.has(row.id)}
                                                        onCheckedChange={(checked) =>
                                                            handleSelectDriver(row.id, checked as boolean)
                                                        }
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleViewDetails(row)}
                                                            className="flex items-center justify-center h-8 w-8 rounded-md border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                                                            title="View Details"
                                                        >
                                                            <Eye className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                                                        </button>
                                                        {editingRowId === row.id ? (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleQuickSave(row.id)}
                                                                    className="flex items-center justify-center h-8 w-8 rounded-md bg-green-500 text-white hover:bg-green-600 transition-colors"
                                                                    title="Save"
                                                                >
                                                                    <Check className="h-4 w-4" />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={handleQuickCancel}
                                                                    className="flex items-center justify-center h-8 w-8 rounded-md bg-red-500 text-white hover:bg-red-600 transition-colors"
                                                                    title="Cancel"
                                                                >
                                                                    <X className="h-4 w-4" />
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleQuickEdit(row)}
                                                                    className="flex items-center justify-center h-8 w-8 rounded-md border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                                                                    title="Quick Edit"
                                                                >
                                                                    <Pencil className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                                                                </button>
                                                                <Link href={`/drivers/drivers/${row.id}/edit`}>
                                                                    <Button type="button" variant="outline" size="sm">
                                                                        Edit
                                                                    </Button>
                                                                </Link>
                                                                {canDeleteDriver() && (
                                                                    <Button
                                                                        type="button"
                                                                        variant="destructive"
                                                                        size="sm"
                                                                        onClick={() => handleDelete(row)}
                                                                    >
                                                                        Delete
                                                                    </Button>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    {editingRowId === row.id ? (
                                                        <Input
                                                            type="text"
                                                            value={editingData?.full_name || ''}
                                                            onChange={(e) => updateEditingData('full_name', e.target.value)}
                                                            className="h-8 text-sm"
                                                            autoFocus
                                                        />
                                                    ) : (
                                        <Link
                                            href={`/drivers/drivers/${row.id}`}
                                            className="font-medium hover:underline"
                                        >
                                            {row.full_name}
                                        </Link>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    {editingRowId === row.id ? (
                                                        <Input
                                                            type="text"
                                                            value={editingData?.phone || ''}
                                                            onChange={(e) => updateEditingData('phone', e.target.value)}
                                                            className="h-8 text-sm"
                                                        />
                                                    ) : (
                                                        <div 
                                                            className="relative inline-block group"
                                                            onMouseEnter={() => {
                                                                if (hoverTimeoutRef.current) {
                                                                    clearTimeout(hoverTimeoutRef.current);
                                                                    hoverTimeoutRef.current = null;
                                                                }
                                                                if (row.phone) {
                                                                    setHoveredPhone(`phone-${row.id}`);
                                                                }
                                                            }}
                                                            onMouseLeave={() => {
                                                                hoverTimeoutRef.current = setTimeout(() => {
                                                                    setHoveredPhone(null);
                                                                }, 200);
                                                            }}
                                                        >
                                                            <span className="cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                                                {row.phone}
                                                            </span>
                                                            {hoveredPhone === `phone-${row.id}` && row.phone && (
                                                                <div 
                                                                    className="absolute left-0 bottom-full mb-3 z-[9999] bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg p-3 flex gap-3 pointer-events-auto"
                                                                    onMouseEnter={() => {
                                                                        if (hoverTimeoutRef.current) {
                                                                            clearTimeout(hoverTimeoutRef.current);
                                                                            hoverTimeoutRef.current = null;
                                                                        }
                                                                        setHoveredPhone(`phone-${row.id}`);
                                                                    }}
                                                                    onMouseLeave={() => {
                                                                        hoverTimeoutRef.current = setTimeout(() => {
                                                                            setHoveredPhone(null);
                                                                        }, 200);
                                                                    }}
                                                                >
                                                                    <a
                                                                        href={`tel:${row.phone}`}
                                                                        className="flex items-center justify-center w-10 h-10 rounded-md bg-green-500 hover:bg-green-600 text-white transition-colors"
                                                                        title="Call"
                                                                    >
                                                                        <Phone className="h-5 w-5" />
                                                                    </a>
                                                                    <a
                                                                        href={`https://api.whatsapp.com/send/?phone=${formatPhoneForWhatsApp(row.phone)}&text&type=phone_number&app_absent=0`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="flex items-center justify-center w-10 h-10 rounded-md bg-green-600 hover:bg-green-700 text-white transition-colors"
                                                                        title="WhatsApp"
                                                                    >
                                                                        <MessageCircle className="h-5 w-5" />
                                                                    </a>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    {editingRowId === row.id ? (
                                                        <Input
                                                            type="text"
                                                            value={editingData?.whatsapp_phone || ''}
                                                            onChange={(e) => updateEditingData('whatsapp_phone', e.target.value)}
                                                            className="h-8 text-sm"
                                                        />
                                                    ) : (
                                                        row.whatsapp_phone ? (
                                                            <div 
                                                                className="relative inline-block group"
                                                                onMouseEnter={() => {
                                                                    if (hoverTimeoutRef.current) {
                                                                        clearTimeout(hoverTimeoutRef.current);
                                                                        hoverTimeoutRef.current = null;
                                                                    }
                                                                    if (row.whatsapp_phone) {
                                                                        setHoveredPhone(`whatsapp-${row.id}`);
                                                                    }
                                                                }}
                                                                onMouseLeave={() => {
                                                                    hoverTimeoutRef.current = setTimeout(() => {
                                                                        setHoveredPhone(null);
                                                                    }, 200);
                                                                }}
                                                            >
                                                                <span className="cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                                                    {row.whatsapp_phone}
                                                                </span>
                                                                {hoveredPhone === `whatsapp-${row.id}` && row.whatsapp_phone && (
                                                                    <div 
                                                                        className="absolute left-0 bottom-full mb-3 z-[9999] bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg p-3 flex gap-3 pointer-events-auto"
                                                                        onMouseEnter={() => {
                                                                            if (hoverTimeoutRef.current) {
                                                                                clearTimeout(hoverTimeoutRef.current);
                                                                                hoverTimeoutRef.current = null;
                                                                            }
                                                                            setHoveredPhone(`whatsapp-${row.id}`);
                                                                        }}
                                                                        onMouseLeave={() => {
                                                                            hoverTimeoutRef.current = setTimeout(() => {
                                                                                setHoveredPhone(null);
                                                                            }, 200);
                                                                        }}
                                                                    >
                                                                        <a
                                                                            href={`tel:${row.whatsapp_phone}`}
                                                                            className="flex items-center justify-center w-10 h-10 rounded-md bg-green-500 hover:bg-green-600 text-white transition-colors"
                                                                            title="Call"
                                                                        >
                                                                            <Phone className="h-5 w-5" />
                                                                        </a>
                                                                        <a
                                                                            href={`https://api.whatsapp.com/send/?phone=${formatPhoneForWhatsApp(row.whatsapp_phone)}&text&type=phone_number&app_absent=0`}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="flex items-center justify-center w-10 h-10 rounded-md bg-green-600 hover:bg-green-700 text-white transition-colors"
                                                                            title="WhatsApp"
                                                                        >
                                                                            <MessageCircle className="h-5 w-5" />
                                                                        </a>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : '-'
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    {editingRowId === row.id ? (
                                                        <Input
                                                            type="email"
                                                            value={editingData?.email || ''}
                                                            onChange={(e) => updateEditingData('email', e.target.value)}
                                                            className="h-8 text-sm"
                                                        />
                                                    ) : (
                                                        row.email ? (
                                                            <div 
                                                                className="relative inline-block group"
                                                                onMouseEnter={() => {
                                                                    if (emailHoverTimeoutRef.current) {
                                                                        clearTimeout(emailHoverTimeoutRef.current);
                                                                        emailHoverTimeoutRef.current = null;
                                                                    }
                                                                    if (row.email) {
                                                                        setHoveredEmail(`email-${row.id}`);
                                                                    }
                                                                }}
                                                                onMouseLeave={() => {
                                                                    emailHoverTimeoutRef.current = setTimeout(() => {
                                                                        setHoveredEmail(null);
                                                                    }, 200);
                                                                }}
                                                            >
                                                                <span className="cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                                                    {row.email}
                                                                </span>
                                                                {hoveredEmail === `email-${row.id}` && row.email && (
                                                                    <div 
                                                                        className="absolute left-0 bottom-full mb-3 z-[9999] bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg p-3 flex gap-3 pointer-events-auto"
                                                                        onMouseEnter={() => {
                                                                            if (emailHoverTimeoutRef.current) {
                                                                                clearTimeout(emailHoverTimeoutRef.current);
                                                                                emailHoverTimeoutRef.current = null;
                                                                            }
                                                                            setHoveredEmail(`email-${row.id}`);
                                                                        }}
                                                                        onMouseLeave={() => {
                                                                            emailHoverTimeoutRef.current = setTimeout(() => {
                                                                                setHoveredEmail(null);
                                                                            }, 200);
                                                                        }}
                                                                    >
                                                                        <a
                                                                            href={`mailto:${row.email}`}
                                                                            className="flex items-center justify-center w-10 h-10 rounded-md bg-blue-500 hover:bg-blue-600 text-white transition-colors"
                                                                            title="Send Email"
                                                                        >
                                                                            <Mail className="h-5 w-5" />
                                                                        </a>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : '-'
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    {editingRowId === row.id ? (
                                                        <Select
                                                            key={`riding-company-${row.id}-${editingData?.riding_company_id || 'none'}`}
                                                            value={editingData?.riding_company_id ? String(editingData.riding_company_id) : '__none__'}
                                                            onValueChange={(value) => updateEditingData('riding_company_id', value === '__none__' ? null : Number(value))}
                                                        >
                                                            <SelectTrigger className="h-8 text-sm">
                                                                <SelectValue placeholder="Select..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="__none__">-- None --</SelectItem>
                                                                {filterOptions.ridingCompanies?.map((option) => (
                                                                    <SelectItem key={option.id} value={String(option.id)}>
                                                                        {option.name}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    ) : (
                                                        row.riding_company?.name || '-'
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    {editingRowId === row.id ? (
                                                        <Select
                                                            key={`campaign-${row.id}-${editingData?.campaign_id || 'none'}`}
                                                            value={editingData?.campaign_id ? String(editingData.campaign_id) : '__none__'}
                                                            onValueChange={(value) => updateEditingData('campaign_id', value === '__none__' ? null : Number(value))}
                                                        >
                                                            <SelectTrigger className="h-8 text-sm">
                                                                <SelectValue placeholder="Select..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="__none__">-- None --</SelectItem>
                                                                {filterOptions.campaigns?.map((option) => (
                                                                    <SelectItem key={option.id} value={String(option.id)}>
                                                                        {option.name}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    ) : (
                                                        row.campaign?.name || '-'
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    {editingRowId === row.id ? (
                                                        <Select
                                                            key={`lead-source-${row.id}-${editingData?.lead_source_id || 'none'}`}
                                                            value={editingData?.lead_source_id ? String(editingData.lead_source_id) : '__none__'}
                                                            onValueChange={(value) => updateEditingData('lead_source_id', value === '__none__' ? null : Number(value))}
                                                        >
                                                            <SelectTrigger className="h-8 text-sm">
                                                                <SelectValue placeholder="Select..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="__none__">-- None --</SelectItem>
                                                                {filterOptions.leadSources?.map((option) => (
                                                                    <SelectItem key={option.id} value={String(option.id)}>
                                                                        {option.name}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    ) : (
                                                        row.lead_source?.name || '-'
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    {editingRowId === row.id ? (
                                                        <Select
                                                            key={`lead-status-${row.id}-${editingData?.lead_status_id || 'none'}`}
                                                            value={editingData?.lead_status_id ? String(editingData.lead_status_id) : '__none__'}
                                                            onValueChange={(value) => updateEditingData('lead_status_id', value === '__none__' ? null : Number(value))}
                                                        >
                                                            <SelectTrigger className="h-8 text-sm">
                                                                <SelectValue placeholder="Select..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="__none__">-- None --</SelectItem>
                                                                {filterOptions.leadStatuses?.map((option) => (
                                                                    <SelectItem key={option.id} value={String(option.id)}>
                                                                        {option.name}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    ) : (
                                        row.lead_status ? (
                                            <Badge
                                                variant="outline"
                                                style={{
                                                    borderColor: row.lead_status.color || 'gray',
                                                    color: row.lead_status.color || 'gray',
                                                }}
                                            >
                                                {row.lead_status.name}
                                            </Badge>
                                        ) : (
                                            '-'
                                                        )
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    {editingRowId === row.id ? (
                                                        <Select
                                                            key={`assigned-to-edit-${row.id}`}
                                                            value={editingData?.assigned_to ? String(editingData.assigned_to) : undefined}
                                                            onValueChange={(value) => updateEditingData('assigned_to', value === '__none__' ? null : Number(value))}
                                                        >
                                                            <SelectTrigger className="h-8 text-sm">
                                                                <SelectValue placeholder="Select a user..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="__none__">-- None --</SelectItem>
                                                                {filterOptions.users?.map((option) => (
                                                                    <SelectItem key={option.id} value={String(option.id)}>
                                                                        {option.name}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    ) : (
                                                        row.assigned_to?.name || '-'
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                        </div>
                        </>
                    ) : (
                        <div className="py-12 text-center">
                            <p className="text-neutral-500">No drivers found.</p>
                            <Link href="/drivers/drivers/create" className="mt-4 inline-block">
                                <Button>Create First Driver</Button>
                            </Link>
                        </div>
                    )}
                </Card>

                <DeleteDialog
                    open={deleteDialog.open}
                    onOpenChange={(open) => setDeleteDialog({ open, driver: null })}
                    onConfirm={confirmDelete}
                    title="Delete Driver"
                    description={`Are you sure you want to delete ${deleteDialog.driver?.full_name}? This action cannot be undone.`}
                />

                <DeleteDialog
                    open={massDeleteDialog}
                    onOpenChange={setMassDeleteDialog}
                    onConfirm={confirmMassDelete}
                    title="Delete Selected Drivers"
                    description={`Are you sure you want to delete ${selectedDrivers.size} driver(s)? This action cannot be undone.`}
                />

                <ImportModal
                    open={importModalOpen}
                    onOpenChange={setImportModalOpen}
                    importStoreUrl="/drivers/drivers/import"
                    availableFields={availableFields}
                    entityName="Drivers"
                />

                {/* View Details Dialog */}
                <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
                    <DialogContent 
                        className="!max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
                        overlayClassName="bg-black/40"
                    >
                        <DialogHeader>
                            <DialogTitle>{viewingDriver?.full_name || 'Driver Details'}</DialogTitle>
                            <DialogDescription>
                                Driver Details & Onboarding Progress
                            </DialogDescription>
                        </DialogHeader>
                        
                        {loadingDetails ? (
                            <div className="py-8 text-center">
                                <p className="text-muted-foreground">Loading...</p>
                            </div>
                        ) : driverDetails ? (
                            <div className="flex-1 overflow-y-auto">
                                {/* Tabs */}
                                <div className="mb-6 border-b">
                                    <nav className="flex gap-6">
                                        <button
                                            onClick={() => setViewDialogTab('overview')}
                                            className={`border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                                                viewDialogTab === 'overview'
                                                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                                                    : 'border-transparent text-neutral-600 hover:border-neutral-300 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
                                            }`}
                                        >
                                            Overview
                                        </button>
                                        <button
                                            onClick={() => setViewDialogTab('updates')}
                                            className={`border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                                                viewDialogTab === 'updates'
                                                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                                                    : 'border-transparent text-neutral-600 hover:border-neutral-300 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Activity className="h-4 w-4" />
                                                Updates ({driverActivities.length})
                                            </div>
                                        </button>
                                    </nav>
                                </div>

                                {/* Tab Content */}
                                {viewDialogTab === 'overview' && (
                                    <div className="space-y-6">
                                        {/* Personal Information & CRM Information */}
                                        <div className="grid gap-6 md:grid-cols-2">
                                            <Card className="p-6">
                                                <h2 className="mb-4 text-lg font-semibold">Personal Information</h2>
                                                <div className="space-y-4">
                                                    <div className="flex items-start gap-2">
                                                        <User className="mt-0.5 h-4 w-4 text-neutral-500" />
                                                        <div className="flex-1">
                                                            <p className="text-sm text-neutral-500">Full Name</p>
                                                            <p className="font-medium">{driverDetails.full_name}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-start gap-2">
                                                        <Phone className="mt-0.5 h-4 w-4 text-neutral-500" />
                                                        <div className="flex-1">
                                                            <p className="text-sm text-neutral-500">Phone</p>
                                                            <p className="font-medium">{driverDetails.phone}</p>
                                                        </div>
                                                    </div>
                                                    {driverDetails.whatsapp_phone && (
                                                        <div className="flex items-start gap-2">
                                                            <Phone className="mt-0.5 h-4 w-4 text-neutral-500" />
                                                            <div className="flex-1">
                                                                <p className="text-sm text-neutral-500">WhatsApp</p>
                                                                <p className="font-medium">{driverDetails.whatsapp_phone}</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {driverDetails.email && (
                                                        <div className="flex items-start gap-2">
                                                            <Mail className="mt-0.5 h-4 w-4 text-neutral-500" />
                                                            <div className="flex-1">
                                                                <p className="text-sm text-neutral-500">Email</p>
                                                                <p className="font-medium">{driverDetails.email}</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {driverDetails.uuid && (
                                                        <div>
                                                            <p className="text-sm text-neutral-500">UUID</p>
                                                            <p className="font-mono text-xs">{driverDetails.uuid}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </Card>

                                            <Card className="p-6">
                                                <h2 className="mb-4 text-lg font-semibold">CRM Information</h2>
                                                <div className="space-y-4">
                                                    {driverDetails.riding_company && (
                                                        <div>
                                                            <p className="text-sm text-neutral-500">Riding Company</p>
                                                            <p className="font-medium">{driverDetails.riding_company.name}</p>
                                                        </div>
                                                    )}
                                                    {driverDetails.campaign && (
                                                        <div>
                                                            <p className="text-sm text-neutral-500">Campaign</p>
                                                            <p className="font-medium">{driverDetails.campaign.name}</p>
                                                        </div>
                                                    )}
                                                    {driverDetails.lead_source && (
                                                        <div>
                                                            <p className="text-sm text-neutral-500">Lead Source</p>
                                                            <p className="font-medium">{driverDetails.lead_source.name}</p>
                                                        </div>
                                                    )}
                                                    {driverDetails.lead_status && (
                                                        <div>
                                                            <p className="text-sm text-neutral-500">Lead Status</p>
                                                            <Badge
                                                                variant="outline"
                                                                style={{
                                                                    borderColor: driverDetails.lead_status.color || 'gray',
                                                                    color: driverDetails.lead_status.color || 'gray',
                                                                }}
                                                            >
                                                                {driverDetails.lead_status.name}
                                                            </Badge>
                                                        </div>
                                                    )}
                                                    {driverDetails.assigned_to && (
                                                        <div>
                                                            <p className="text-sm text-neutral-500">Assigned To</p>
                                                            <p className="font-medium">{driverDetails.assigned_to.name}</p>
                                                        </div>
                                                    )}
                                                    {driverDetails.current_stage && (
                                                        <div>
                                                            <p className="text-sm text-neutral-500">Current Stage</p>
                                                            <p className="font-medium">{driverDetails.current_stage.name}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </Card>
                                        </div>

                                        {/* Stages Progress */}
                                        {driverDetails.stages_progress && (
                                            <Card className="p-6">
                                                <div className="mb-4 flex items-center justify-between">
                                                    <h2 className="text-lg font-semibold">Stages Progress</h2>
                                                    {driverDetails.has_completed_all_stages && (
                                                        <Badge variant="default" className="gap-2">
                                                            <CheckCircle2 className="h-4 w-4" />
                                                            All Stages Completed
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="space-y-4">
                                                    <div>
                                                        <div className="mb-2 flex items-center justify-between text-sm">
                                                            <span>Progress</span>
                                                            <span className="font-medium">
                                                                {driverDetails.stages_progress.completed} / {driverDetails.stages_progress.total} (
                                                                {driverDetails.stages_progress.percentage}%)
                                                            </span>
                                                        </div>
                                                        <Progress value={driverDetails.stages_progress.percentage} />
                                                    </div>
                                                    <div className="grid grid-cols-4 gap-4 text-center">
                                                        <div>
                                                            <p className="text-2xl font-bold text-green-600">
                                                                {driverDetails.stages_progress.completed}
                                                            </p>
                                                            <p className="text-xs text-neutral-500">Completed</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-2xl font-bold text-yellow-600">
                                                                {driverDetails.stages_progress.in_progress}
                                                            </p>
                                                            <p className="text-xs text-neutral-500">In Progress</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-2xl font-bold text-gray-600">
                                                                {driverDetails.stages_progress.pending}
                                                            </p>
                                                            <p className="text-xs text-neutral-500">Pending</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-2xl font-bold text-red-600">
                                                                {driverDetails.stages_progress.rejected}
                                                            </p>
                                                            <p className="text-xs text-neutral-500">Rejected</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </Card>
                                        )}

                                        {/* Stages Details */}
                                        {driverDetails.stages_status && driverDetails.stages_status.length > 0 && (
                                            <Card className="p-6">
                                                <div className="mb-4 flex items-center justify-between">
                                                    <h2 className="text-lg font-semibold">Stages Details</h2>
                                                    <Link href={`/drivers/driver-stages?driver_id=${driverDetails.id}`}>
                                                        <Button variant="outline" size="sm">
                                                            View All Stages
                                                        </Button>
                                                    </Link>
                                                </div>
                                                <div className="space-y-3">
                                                    {driverDetails.stages_status.map((stage: any, index: number) => (
                                                        <div
                                                            key={stage.stage_template?.id || index}
                                                            className="flex items-center justify-between rounded-lg border p-4"
                                                        >
                                                            <div className="flex items-center gap-4">
                                                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
                                                                    <span className="text-sm font-medium">
                                                                        {stage.stage_template?.order || index + 1}
                                                                    </span>
                                                                </div>
                                                                <div>
                                                                    <p className="font-medium">{stage.stage_template?.name || 'Unknown Stage'}</p>
                                                                    {stage.completed_at && (
                                                                        <p className="text-xs text-neutral-500">
                                                                            Completed: {new Date(stage.completed_at).toLocaleDateString()}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {getStatusBadge(stage.status)}
                                                                {stage.is_completed && (
                                                                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </Card>
                                        )}

                                        {/* Documents */}
                                        <Card className="p-6">
                                            <div className="mb-4 flex items-center justify-between">
                                                <h2 className="text-lg font-semibold">Documents</h2>
                                                <Link href={`/drivers/driver-documents?driver_id=${driverDetails.id}`}>
                                                    <Button variant="outline" size="sm">
                                                        View All Documents
                                                    </Button>
                                                </Link>
                                            </div>
                                            {driverDetails.documents && driverDetails.documents.length > 0 ? (
                                                <div className="space-y-3">
                                                    {driverDetails.documents.map((doc: any) => (
                                                        <div
                                                            key={doc.id}
                                                            className="flex items-center justify-between rounded-lg border p-4"
                                                        >
                                                            <div className="flex items-center gap-3 flex-1">
                                                                <FileText className="h-5 w-5 text-neutral-500" />
                                                                <div className="flex-1">
                                                                    <p className="font-medium">
                                                                        {doc.document_template?.name || 'Unknown Document'}
                                                                    </p>
                                                                    <p className="text-xs text-neutral-500">
                                                                        Type: {doc.document_template?.type || 'N/A'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {doc.uploaded_path ? (
                                                                    <>
                                                                        {getStatusBadge(doc.status)}
                                                                        <Button 
                                                                            variant="outline" 
                                                                            size="sm"
                                                                            onClick={() => handleViewFile(doc.id)}
                                                                        >
                                                                            <Eye className="h-4 w-4 mr-1" />
                                                                            View
                                                                            {doc.original_filename && (
                                                                                <span className="ml-2 text-xs font-medium text-neutral-600 dark:text-neutral-400">
                                                                                    .{doc.original_filename.split('.').pop()?.toUpperCase()}
                                                                                </span>
                                                                            )}
                                                                        </Button>
                                                                    </>
                                                                ) : (
                                                                    getStatusBadge(doc.status)
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="py-8 text-center text-neutral-500">
                                                    <FileText className="mx-auto h-12 w-12 text-neutral-400 mb-2" />
                                                    <p>No documents available</p>
                                                </div>
                                            )}
                                        </Card>

                                        {/* Notes */}
                                        {driverDetails.notes && (
                                            <Card className="p-6">
                                                <h2 className="mb-4 text-lg font-semibold">Notes</h2>
                                                <p className="whitespace-pre-wrap text-neutral-700 dark:text-neutral-300">
                                                    {driverDetails.notes}
                                                </p>
                                            </Card>
                                        )}
                                    </div>
                                )}

                                {viewDialogTab === 'updates' && (
                                    <Card className="p-6">
                                        <h2 className="mb-4 text-lg font-semibold">Activity Log</h2>
                                        <ActivityLog activities={driverActivities} />
                                    </Card>
                                )}
                            </div>
                        ) : (
                            <div className="py-8 text-center">
                                <p className="text-muted-foreground">No details available</p>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Document View Dialog */}
                <Dialog open={!!viewingDocument} onOpenChange={(open) => !open && setViewingDocument(null)}>
                    <DialogContent className="!max-w-6xl max-h-[90vh] overflow-hidden">
                        <DialogHeader>
                            <DialogTitle>View Document</DialogTitle>
                        </DialogHeader>
                        {viewingDocument && (() => {
                            const isImage = viewingDocument.extension && ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(viewingDocument.extension);
                            
                            return (
                                <div className="flex-1 overflow-auto flex items-center justify-center p-4">
                                    {isImage ? (
                                        <img
                                            src={viewingDocument.url}
                                            alt="Document"
                                            className="max-w-full max-h-[80vh] object-contain border rounded"
                                            style={{ objectFit: 'contain' }}
                                        />
                                    ) : (
                                        <iframe
                                            src={viewingDocument.url}
                                            className="w-full h-[80vh] border rounded"
                                            title="Document Viewer"
                                        />
                                    )}
                                </div>
                            );
                        })()}
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}

