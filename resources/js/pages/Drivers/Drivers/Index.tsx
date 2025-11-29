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
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router, usePage, useForm } from '@inertiajs/react';
import { Search, X, Pencil, Check, Eye, Phone, MessageCircle, ArrowUp, ArrowDown, User, Mail, CheckCircle2, FileText, Activity, Settings2, GripVertical, ChevronLeft, ChevronRight, Upload, Edit } from 'lucide-react';
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { type SharedData } from '@/types';
import axios from 'axios';

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

interface LeadStage {
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
    lead_stage?: LeadStage;
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

// Define all available columns outside component to avoid hoisting issues
const ALL_DRIVER_COLUMNS = [
    { id: 'actions', label: 'Actions', defaultVisible: true, defaultOrder: 0 },
    { id: 'name', label: 'Name', defaultVisible: true, defaultOrder: 1 },
    { id: 'phone', label: 'Phone', defaultVisible: true, defaultOrder: 2 },
    { id: 'whatsapp', label: 'WhatsApp', defaultVisible: true, defaultOrder: 3 },
    { id: 'email', label: 'Email', defaultVisible: true, defaultOrder: 4 },
    { id: 'riding_company', label: 'Riding Company', defaultVisible: true, defaultOrder: 5 },
    { id: 'campaign', label: 'Campaign', defaultVisible: true, defaultOrder: 6 },
    { id: 'lead_source', label: 'Lead Source', defaultVisible: true, defaultOrder: 7 },
    { id: 'lead_status', label: 'Lead Status', defaultVisible: true, defaultOrder: 8 },
    { id: 'lead_stage', label: 'Lead Stage', defaultVisible: true, defaultOrder: 9 },
    { id: 'assigned_to', label: 'Assigned To', defaultVisible: true, defaultOrder: 10 },
    { id: 'uuid', label: 'UUID', defaultVisible: false, defaultOrder: 11 },
    { id: 'created_at', label: 'Created At', defaultVisible: false, defaultOrder: 12 },
    { id: 'updated_at', label: 'Updated At', defaultVisible: false, defaultOrder: 13 },
];

export default function DriversIndex({ drivers = [], importAvailableFields, filterOptions = {} }: DriversIndexProps) {
    const page = usePage<SharedData>();
    
    // Ensure drivers is always an array
    const safeDrivers = Array.isArray(drivers) ? drivers : [];
    const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; driver: Driver | null }>({
        open: false,
        driver: null,
    });
    const [quickEditDialog, setQuickEditDialog] = useState<{ open: boolean; driver: Driver | null }>({
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
    const [editingLeadStages, setEditingLeadStages] = useState<LeadStage[]>([]);
    
    // View details dialog states
    const [viewDialogOpen, setViewDialogOpen] = useState(false);
    const [viewingDriver, setViewingDriver] = useState<Driver | null>(null);
    const [driverDetails, setDriverDetails] = useState<any>(null);
    const [driverActivities, setDriverActivities] = useState<any[]>([]);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [hoveredPhone, setHoveredPhone] = useState<string | null>(null);
    const [hoveredEmail, setHoveredEmail] = useState<string | null>(null);
    const [phoneMousePosition, setPhoneMousePosition] = useState<{ x: number; y: number } | null>(null);
    const [whatsappMousePosition, setWhatsappMousePosition] = useState<{ x: number; y: number } | null>(null);
    const [emailMousePosition, setEmailMousePosition] = useState<{ x: number; y: number } | null>(null);
    const [viewDialogTab, setViewDialogTab] = useState<'overview' | 'updates'>('overview');
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const emailHoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastClickTimeRef = useRef<number>(0);
    const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [viewingDocument, setViewingDocument] = useState<{ id: number; url: string; extension?: string } | null>(null);

    // Sort states
    const [sortField, setSortField] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    // Column visibility and order states
    const STORAGE_KEY_COLUMNS = 'drivers_table_columns';
    const STORAGE_KEY_PAGE_SIZE = 'drivers_table_page_size';

    // Load column preferences from localStorage
    const loadColumnPreferences = () => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_COLUMNS);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.error('Error loading column preferences:', e);
        }
        return null;
    };

    const savedColumns = loadColumnPreferences();
    const initialColumns = (savedColumns && Array.isArray(savedColumns) && savedColumns.length > 0) 
        ? savedColumns 
        : ALL_DRIVER_COLUMNS.map(col => ({
            id: col.id,
            visible: col.defaultVisible,
            order: col.defaultOrder,
        }));

    const [columns, setColumns] = useState<Array<{ id: string; visible: boolean; order: number }>>(
        Array.isArray(initialColumns) ? initialColumns : ALL_DRIVER_COLUMNS.map(col => ({
            id: col.id,
            visible: col.defaultVisible,
            order: col.defaultOrder,
        }))
    );
    const [draggedColumn, setDraggedColumn] = useState<string | null>(null);

    // Pagination states
    const loadPageSize = () => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_PAGE_SIZE);
            if (saved) {
                return parseInt(saved, 10);
            }
        } catch (e) {
            console.error('Error loading page size:', e);
        }
        return 10; // default
    };

    const [pageSize, setPageSize] = useState(loadPageSize());
    const [currentPage, setCurrentPage] = useState(1);

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
        lead_stage_id: null,
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

    const handleSelectDriver = (driverId: number, checked: boolean) => {
        const newSelected = new Set(selectedDrivers);
        if (checked) {
            newSelected.add(driverId);
        } else {
            newSelected.delete(driverId);
        }
        setSelectedDrivers(newSelected);
    };

    // Filter drivers based on active filters
    const filteredDrivers = useMemo(() => {
        if (!safeDrivers || safeDrivers.length === 0) {
            return [];
        }
        return safeDrivers.filter((driver) => {
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
            // Lead Stage filter
            if (filters.lead_stage_id) {
                if (filters.lead_stage_id === 'is_empty') {
                    if (driver.lead_stage?.id) {
                        return false;
                    }
                } else if (driver.lead_stage?.id !== filters.lead_stage_id) {
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

    // Save column preferences to localStorage
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY_COLUMNS, JSON.stringify(columns));
        } catch (e) {
            console.error('Error saving column preferences:', e);
        }
    }, [columns]);

    // Save page size to localStorage
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY_PAGE_SIZE, pageSize.toString());
        } catch (e) {
            console.error('Error saving page size:', e);
        }
    }, [pageSize]);

    // Column management functions
    const toggleColumnVisibility = (columnId: string) => {
        setColumns(prev => prev.map(col => 
            col.id === columnId ? { ...col, visible: !col.visible } : col
        ));
    };

    const handleDragStart = (columnId: string) => {
        setDraggedColumn(columnId);
    };

    const handleDragOver = (e: React.DragEvent, targetColumnId: string) => {
        e.preventDefault();
        if (!draggedColumn || draggedColumn === targetColumnId) return;

        setColumns(prev => {
            const newColumns = [...prev];
            const draggedIndex = newColumns.findIndex(c => c.id === draggedColumn);
            const targetIndex = newColumns.findIndex(c => c.id === targetColumnId);
            
            if (draggedIndex === -1 || targetIndex === -1) return prev;
            
            const [removed] = newColumns.splice(draggedIndex, 1);
            newColumns.splice(targetIndex, 0, removed);
            
            // Update order values
            return newColumns.map((col, index) => ({ ...col, order: index }));
        });
    };

    const handleDragEnd = () => {
        setDraggedColumn(null);
    };

    // Get sorted columns by order
    const sortedColumns = useMemo(() => {
        try {
            if (!columns || !Array.isArray(columns) || columns.length === 0) {
                return ALL_DRIVER_COLUMNS.map(col => ({
                    id: col.id,
                    visible: col.defaultVisible,
                    order: col.defaultOrder,
                }));
            }
            return [...columns].sort((a, b) => (a.order || 0) - (b.order || 0));
        } catch (e) {
            console.error('Error in sortedColumns:', e);
            return ALL_DRIVER_COLUMNS.map(col => ({
                id: col.id,
                visible: col.defaultVisible,
                order: col.defaultOrder,
            }));
        }
    }, [columns]);

    // Get visible columns
    const visibleColumns = useMemo(() => {
        try {
            if (!sortedColumns || !Array.isArray(sortedColumns) || sortedColumns.length === 0) {
                return ALL_DRIVER_COLUMNS.filter(col => col.defaultVisible).map(col => ({
                    id: col.id,
                    visible: col.defaultVisible,
                    order: col.defaultOrder,
                }));
            }
            return sortedColumns.filter(col => col.visible);
        } catch (e) {
            console.error('Error in visibleColumns:', e);
            return ALL_DRIVER_COLUMNS.filter(col => col.defaultVisible).map(col => ({
                id: col.id,
                visible: col.defaultVisible,
                order: col.defaultOrder,
            }));
        }
    }, [sortedColumns]);

    const sortedAndFilteredDrivers = useMemo(() => {
        if (!filteredDrivers || !Array.isArray(filteredDrivers)) {
            return [];
        }
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
                    case 'lead_stage':
                        aValue = a.lead_stage?.name || '';
                        bValue = b.lead_stage?.name || '';
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

    // Pagination functions
    const paginatedDrivers = useMemo(() => {
        if (!sortedAndFilteredDrivers || sortedAndFilteredDrivers.length === 0) {
            return [];
        }
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        return sortedAndFilteredDrivers.slice(startIndex, endIndex);
    }, [sortedAndFilteredDrivers, currentPage, pageSize]);

    const totalPages = useMemo(() => {
        if (!sortedAndFilteredDrivers || sortedAndFilteredDrivers.length === 0) {
            return 1;
        }
        return Math.ceil(sortedAndFilteredDrivers.length / pageSize);
    }, [sortedAndFilteredDrivers, pageSize]);

    const handlePageChange = (newPage: number) => {
        setCurrentPage(newPage);
        setShowAllDrivers(false);
    };

    const handlePageSizeChange = (newSize: number) => {
        setPageSize(newSize);
        setCurrentPage(1);
        setShowAllDrivers(false);
    };

    // Update handleSelectAll to use paginatedDrivers
    const handleSelectAll = useCallback((checked: boolean) => {
        setSelectedDrivers((prevSelected) => {
            const newSelected = new Set(prevSelected);
            if (paginatedDrivers && Array.isArray(paginatedDrivers)) {
                if (checked) {
                    paginatedDrivers.forEach((d) => newSelected.add(d.id));
                } else {
                    paginatedDrivers.forEach((d) => newSelected.delete(d.id));
                }
            }
            return newSelected;
        });
    }, [paginatedDrivers]);

    // Update isAllSelected and isIndeterminate to use paginatedDrivers
    const isAllSelected = useMemo(() => {
        if (!paginatedDrivers || paginatedDrivers.length === 0) {
            return false;
        }
        return paginatedDrivers.every((d) => selectedDrivers.has(d.id));
    }, [paginatedDrivers, selectedDrivers]);

    const isIndeterminate = useMemo(() => {
        if (!paginatedDrivers || paginatedDrivers.length === 0) {
            return false;
        }
        return paginatedDrivers.some((d) => selectedDrivers.has(d.id)) && !isAllSelected;
    }, [paginatedDrivers, selectedDrivers, isAllSelected]);

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
            lead_stage_id: null,
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
            lead_stage_id: driver.lead_stage?.id || null,
            assigned_to: driver.assigned_to?.id || null,
        });

        // Load lead stages for the selected riding company
        if (driver.riding_company?.id) {
            axios
                .get(`/api/drivers/riding-companies/${driver.riding_company.id}/lead-stages`)
                .then((response) => {
                    setEditingLeadStages(response.data);
                })
                .catch((error) => {
                    console.error('Error fetching lead stages:', error);
                    setEditingLeadStages([]);
                });
        } else {
            setEditingLeadStages([]);
        }
    };

    const handleQuickSave = (driverId: number) => {
        if (!editingData) return;

        // Validate required fields
        if (!editingData.full_name || !editingData.phone) {
            alert('Full Name and Phone are required fields.');
            return;
        }

        // Find the driver to get company_id
        const driver = safeDrivers.find((d) => d.id === driverId);
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
        setEditingLeadStages([]);
    };

    const updateEditingData = (field: string, value: string | number | null) => {
        setEditingData((prev) => (prev ? { ...prev, [field]: value } : null));

        // If riding_company_id changes, load lead stages
        if (field === 'riding_company_id' && value) {
            axios
                .get(`/api/drivers/riding-companies/${value}/lead-stages`)
                .then((response) => {
                    setEditingLeadStages(response.data);
                    // Reset lead_stage_id when riding company changes
                    setEditingData((prev) => (prev ? { ...prev, lead_stage_id: null } : null));
                })
                .catch((error) => {
                    console.error('Error fetching lead stages:', error);
                    setEditingLeadStages([]);
                });
        } else if (field === 'riding_company_id' && !value) {
            setEditingLeadStages([]);
            setEditingData((prev) => (prev ? { ...prev, lead_stage_id: null } : null));
        }
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

    const canUploadDocument = () => {
        return hasPermission('drivers.driverdocuments.upload');
    };

    const canViewDocument = () => {
        return hasPermission('drivers.driverdocuments.view');
    };

    const canReplaceDocument = () => {
        return hasPermission('drivers.driverdocuments.replace');
    };

    const canSetPending = () => {
        return hasPermission('drivers.driverdocuments.set-pending');
    };

    const canSetApproved = () => {
        return hasPermission('drivers.driverdocuments.set-approved');
    };

    const canSetRejected = () => {
        return hasPermission('drivers.driverdocuments.set-rejected');
    };

    const [uploadingDocId, setUploadingDocId] = useState<number | null>(null);
    const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

    const handleFileSelect = (docId: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
            alert('Please select a valid file (JPG, PNG, or PDF)');
            return;
        }

        // Validate file size (10MB)
        if (file.size > 10 * 1024 * 1024) {
            alert('File size must be less than 10MB');
            return;
        }

        setUploadingDocId(docId);
        const formData = new FormData();
        formData.append('file', file);

        axios
            .post(`/drivers/driver-documents/${docId}/upload`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            })
            .then(() => {
                // Reload driver details
                if (viewingDriver) {
                    fetch(`/drivers/drivers/${viewingDriver.id}/details`, {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json',
                            'X-Requested-With': 'XMLHttpRequest',
                        },
                        credentials: 'same-origin',
                    })
                        .then((response) => response.json())
                        .then((data) => {
                            setDriverDetails(data.driver);
                        });
                }
            })
            .catch((error) => {
                console.error('Error uploading file:', error);
                alert('Failed to upload file. Please try again.');
            })
            .finally(() => {
                setUploadingDocId(null);
                if (fileInputRefs.current[docId]) {
                    fileInputRefs.current[docId]!.value = '';
                }
            });
    };

    const handleUpdateStatus = async (docId: number, status: string) => {
        try {
            await axios.post(`/drivers/driver-documents/${docId}/update-status`, { status });
            // Reload driver details to get updated documents
            if (viewingDriver) {
                const response = await fetch(`/drivers/drivers/${viewingDriver.id}/details`, {
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
                }
            }
        } catch (error) {
            console.error('Error updating document status:', error);
            alert('Failed to update document status. Please try again.');
        }
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
                        {canDeleteAllDrivers() && safeDrivers.length > 0 && (
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={() => {
                                    if (confirm(`Are you sure you want to delete ALL ${safeDrivers.length} driver(s)? This action cannot be undone.`)) {
                                        const allIds = safeDrivers.map(d => d.id);
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
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-neutral-600 dark:text-neutral-400">
                                Total: {sortedAndFilteredDrivers?.length || 0} driver(s)
                            </span>
                            <Link href="/drivers/drivers/create">
                                <Button>Create Driver</Button>
                            </Link>
                        </div>
                    </div>
                </div>

                <Card className="p-6">
                    {safeDrivers.length > 0 ? (
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

                            {/* Table Controls Bar */}
                            <div className="mb-4 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-neutral-600 dark:text-neutral-400">
                                        Showing {paginatedDrivers?.length || 0} of {sortedAndFilteredDrivers?.length || 0} driver(s)
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-neutral-600 dark:text-neutral-400">Rows per page:</span>
                                    <Select value={pageSize.toString()} onValueChange={(value) => handlePageSizeChange(parseInt(value, 10))}>
                                        <SelectTrigger className="w-20">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="10">10</SelectItem>
                                            <SelectItem value="25">25</SelectItem>
                                            <SelectItem value="50">50</SelectItem>
                                            <SelectItem value="100">100</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" size="sm">
                                                <Settings2 className="h-4 w-4 mr-2" />
                                                Columns
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-56">
                                            <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            {(sortedColumns || []).map((col) => {
                                                const columnDef = ALL_DRIVER_COLUMNS.find(c => c.id === col.id);
                                                return (
                                                    <DropdownMenuCheckboxItem
                                                        key={col.id}
                                                        checked={col.visible}
                                                        onCheckedChange={() => toggleColumnVisibility(col.id)}
                                                    >
                                                        {columnDef?.label || col.id}
                                                    </DropdownMenuCheckboxItem>
                                                );
                                            })}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>

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
                                            {(visibleColumns || []).map((col) => {
                                                if (col.id === 'actions') {
                                                    return (
                                                        <th 
                                                            key={col.id}
                                                            className="px-4 py-3 text-center text-sm font-medium text-neutral-700 dark:text-neutral-300 cursor-move"
                                                            draggable
                                                            onDragStart={() => handleDragStart(col.id)}
                                                            onDragOver={(e) => handleDragOver(e, col.id)}
                                                            onDragEnd={handleDragEnd}
                                                        >
                                                            <div className="flex items-center justify-center gap-1">
                                                                <GripVertical className="h-3 w-3 text-neutral-400" />
                                                                Actions
                                                            </div>
                                                        </th>
                                                    );
                                                }
                                                const columnDef = ALL_DRIVER_COLUMNS.find(c => c.id === col.id);
                                                const sortKey = col.id === 'name' ? 'full_name' : 
                                                               col.id === 'whatsapp' ? 'whatsapp_phone' :
                                                               col.id === 'riding_company' ? 'riding_company' :
                                                               col.id === 'lead_source' ? 'lead_source' :
                                                               col.id === 'lead_status' ? 'lead_status' :
                                                               col.id === 'lead_stage' ? 'lead_stage' :
                                                               col.id === 'assigned_to' ? 'assigned_to' :
                                                               col.id;
                                                return (
                                                    <th 
                                                        key={col.id}
                                                        className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300 cursor-move"
                                                        draggable
                                                        onDragStart={() => handleDragStart(col.id)}
                                                        onDragOver={(e) => handleDragOver(e, col.id)}
                                                        onDragEnd={handleDragEnd}
                                                    >
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSort(sortKey)}
                                                            className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors w-full"
                                                        >
                                                            <GripVertical className="h-3 w-3 text-neutral-400" />
                                                            {sortField === sortKey && (
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
                                                            <span>{columnDef?.label || col.id}</span>
                                                            {sortField === sortKey ? (
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
                                                );
                                            })}
                                        </tr>
                                        {/* Filter Row */}
                                        <tr className="bg-neutral-100 dark:bg-neutral-800/50">
                                            <th className="px-4 py-2"></th>
                                            {(visibleColumns || []).map((col) => {
                                                if (col.id === 'actions') {
                                                    return <th key={col.id} className="px-4 py-2">
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
                                                    </th>;
                                                }
                                                const filterKey = col.id === 'name' ? 'full_name' : 
                                                                  col.id === 'whatsapp' ? 'whatsapp_phone' :
                                                                  col.id === 'riding_company' ? 'riding_company' :
                                                                  col.id === 'lead_source' ? 'lead_source_id' :
                                                                  col.id === 'lead_status' ? 'lead_status_id' :
                                                                  col.id === 'lead_stage' ? 'lead_stage_id' :
                                                                  col.id === 'assigned_to' ? 'assigned_to' :
                                                                  col.id === 'campaign' ? 'campaign_id' :
                                                                  col.id;
                                                if (['campaign', 'lead_source', 'lead_status', 'lead_stage', 'assigned_to'].includes(col.id)) {
                                                    return (
                                                        <th key={col.id} className="px-4 py-2">
                                                            <div className="relative">
                                                                <Select
                                                                    key={`${filterKey}-${filters[filterKey] === 'is_empty' ? 'is_empty' : (filters[filterKey] || 'empty')}`}
                                                                    value={filters[filterKey] === 'is_empty' ? 'is_empty' : (filters[filterKey] ? String(filters[filterKey]) : undefined)}
                                                                    onValueChange={(value) => {
                                                                        if (value === '__none__') {
                                                                            clearFilter(filterKey);
                                                                        } else if (value === 'is_empty') {
                                                                            handleFilterChange(filterKey, 'is_empty');
                                                                        } else {
                                                                            handleFilterChange(filterKey, Number(value));
                                                                        }
                                                                    }}
                                                                >
                                                                    <SelectTrigger className="w-full text-xs h-8 pr-8">
                                                                        <SelectValue placeholder="Select..." />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="__none__">-- All --</SelectItem>
                                                                        <SelectItem value="is_empty" className="text-blue-500 hover:text-blue-700">Is Empty</SelectItem>
                                                                        {(col.id === 'campaign' ? (filterOptions?.campaigns || []) :
                                                                          col.id === 'lead_source' ? (filterOptions?.leadSources || []) :
                                                                          col.id === 'lead_status' ? (filterOptions?.leadStatuses || []) :
                                                                          col.id === 'lead_stage' ? ((filterOptions as any)?.leadStages || []) :
                                                                          col.id === 'assigned_to' ? (filterOptions?.users || []) : []).map((option: any) => (
                                                                            <SelectItem key={option.id} value={String(option.id)}>
                                                                                {option.name}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                                {hasActiveFilter(filterKey) && (
                                                                    <button
                                                                        onClick={() => clearFilter(filterKey)}
                                                                        className="absolute right-8 top-1/2 -translate-y-1/2 text-red-500 hover:text-red-700 z-10"
                                                                        title="Clear filter"
                                                                    >
                                                                        <X className="h-3 w-3" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </th>
                                                    );
                                                }
                                                return (
                                                    <th key={col.id} className="px-4 py-2">
                                                        <div className="relative">
                                                            <Input
                                                                type="text"
                                                                placeholder={`Search ${col.id}...`}
                                                                value={typeof filters[filterKey] === 'string' && filters[filterKey] !== 'is_empty' ? filters[filterKey] : ''}
                                                                onChange={(e) => handleFilterChange(filterKey, e.target.value)}
                                                                className="w-full text-xs h-8 pr-20"
                                                            />
                                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                                                {!hasActiveFilter(filterKey) && (
                                                                    <button
                                                                        onClick={() => handleFilterChange(filterKey, 'is_empty')}
                                                                        className="text-xs text-blue-500 hover:text-blue-700 px-1"
                                                                        title="Filter empty"
                                                                    >
                                                                        Empty
                                                                    </button>
                                                                )}
                                                                {hasActiveFilter(filterKey) && (
                                                                    <button
                                                                        onClick={() => clearFilter(filterKey)}
                                                                        className="text-red-500 hover:text-red-700"
                                                                        title="Clear filter"
                                                                    >
                                                                        <X className="h-3 w-3" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </th>
                                                );
                                            })}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                                        {(!paginatedDrivers || paginatedDrivers.length === 0) ? (
                                            <tr>
                                                <td
                                                    colSpan={(visibleColumns?.length || 0) + 1}
                                                    className="px-4 py-8 text-center text-sm text-neutral-500"
                                                >
                                                    No drivers found
                                                </td>
                                            </tr>
                                        ) : (
                                            (paginatedDrivers || []).map((driver) => (
                                                <tr
                                                    key={driver.id}
                                                    className="hover:bg-neutral-50 dark:hover:bg-neutral-900/50 cursor-pointer"
                                                    onClick={(e) => {
                                                        // Don't navigate if clicking on interactive elements
                                                        const target = e.target as HTMLElement;
                                                        // Check if clicking on button, link, input, or checkbox
                                                        if (target.closest('button') || 
                                                            target.closest('a') || 
                                                            target.closest('input') ||
                                                            target.closest('[role="checkbox"]')) {
                                                            return;
                                                        }
                                                        
                                                        // Clear any pending click timeout
                                                        if (clickTimeoutRef.current) {
                                                            clearTimeout(clickTimeoutRef.current);
                                                        }
                                                        
                                                        const now = Date.now();
                                                        const timeSinceLastClick = now - lastClickTimeRef.current;
                                                        
                                                        // If this is a potential double click (within 300ms), wait a bit
                                                        if (timeSinceLastClick < 300) {
                                                            // This might be a double click, don't navigate yet
                                                            return;
                                                        }
                                                        
                                                        // Set a timeout to navigate after a short delay
                                                        // This allows us to cancel if a double click happens
                                                        clickTimeoutRef.current = setTimeout(() => {
                                                            router.visit(`/drivers/drivers/${driver.id}`);
                                                        }, 300);
                                                        
                                                        lastClickTimeRef.current = now;
                                                    }}
                                                    onDoubleClick={(e) => {
                                                        // Don't open quick edit if double clicking on interactive elements
                                                        const target = e.target as HTMLElement;
                                                        if (target.closest('button') || 
                                                            target.closest('a') || 
                                                            target.closest('input') ||
                                                            target.closest('[role="checkbox"]')) {
                                                            return;
                                                        }
                                                        
                                                        // Cancel any pending single click navigation
                                                        if (clickTimeoutRef.current) {
                                                            clearTimeout(clickTimeoutRef.current);
                                                            clickTimeoutRef.current = null;
                                                        }
                                                        
                                                        e.stopPropagation();
                                                        e.preventDefault();
                                                        setQuickEditDialog({ open: true, driver });
                                                    }}
                                                >
                                                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                                        <Checkbox
                                                            checked={selectedDrivers.has(driver.id)}
                                                            onCheckedChange={(checked) => {
                                                                handleSelectDriver(driver.id, checked as boolean);
                                                            }}
                                                        />
                                                    </td>
                                                    {(visibleColumns || []).map((col) => {
                                                        if (col.id === 'actions') {
                                                            return (
                                                                <td key={col.id} className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                                    <div className="flex items-center justify-center gap-2">
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleViewDetails(driver);
                                                                            }}
                                                                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                                                            title="View Details"
                                                                        >
                                                                            <Eye className="h-4 w-4" />
                                                                        </button>
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setQuickEditDialog({ open: true, driver });
                                                                            }}
                                                                            className="text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-300"
                                                                            title="Quick Edit"
                                                                        >
                                                                            <Pencil className="h-4 w-4" />
                                                                        </button>
                                                                        {canDeleteDriver() && (
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleDelete(driver);
                                                                                }}
                                                                                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                                                                title="Delete"
                                                                            >
                                                                                <X className="h-4 w-4" />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            );
                                                        }
                                                        // Render cell content based on column id
                                                        let cellContent: React.ReactNode = '';
                                                        switch (col.id) {
                                                            case 'name':
                                                                cellContent = driver.full_name || '-';
                                                                break;
                                                            case 'phone':
                                                                cellContent = driver.phone ? (
                                                                    <div className="relative group" onClick={(e) => e.stopPropagation()}>
                                                                        <span
                                                                            onMouseEnter={(e) => {
                                                                                if (hoverTimeoutRef.current) {
                                                                                    clearTimeout(hoverTimeoutRef.current);
                                                                                }
                                                                                setHoveredPhone(driver.phone || null);
                                                                                setPhoneMousePosition({ x: e.clientX, y: e.clientY });
                                                                            }}
                                                                            onMouseMove={(e) => {
                                                                                setPhoneMousePosition({ x: e.clientX, y: e.clientY });
                                                                            }}
                                                                            onMouseLeave={() => {
                                                                                hoverTimeoutRef.current = setTimeout(() => {
                                                                                    setHoveredPhone(null);
                                                                                    setPhoneMousePosition(null);
                                                                                }, 200);
                                                                            }}
                                                                        >
                                                                            {driver.phone}
                                                                        </span>
                                                                        {hoveredPhone === driver.phone && phoneMousePosition && (
                                                                            <div className="fixed z-[9999] flex gap-2 bg-white dark:bg-neutral-800 p-3 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 pointer-events-auto"
                                                                                style={{ 
                                                                                    left: `${phoneMousePosition.x}px`,
                                                                                    top: `${phoneMousePosition.y - 60}px`,
                                                                                    transform: 'translate(-50%, 0)'
                                                                                }}
                                                                                onMouseEnter={() => {
                                                                                    if (hoverTimeoutRef.current) {
                                                                                        clearTimeout(hoverTimeoutRef.current);
                                                                                    }
                                                                                }}
                                                                                onMouseLeave={() => {
                                                                                    hoverTimeoutRef.current = setTimeout(() => {
                                                                                        setHoveredPhone(null);
                                                                                        setPhoneMousePosition(null);
                                                                                    }, 200);
                                                                                }}
                                                                            >
                                                                                <a
                                                                                    href={`tel:${driver.phone}`}
                                                                                    className="flex items-center justify-center w-10 h-10 rounded-full bg-green-500 hover:bg-green-600 text-white transition-colors"
                                                                                >
                                                                                    <Phone className="h-5 w-5" />
                                                                                </a>
                                                                                <a
                                                                                    href={`https://wa.me/${formatPhoneForWhatsApp(driver.phone)}`}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    className="flex items-center justify-center w-10 h-10 rounded-full bg-green-500 hover:bg-green-600 text-white transition-colors"
                                                                                >
                                                                                    <MessageCircle className="h-5 w-5" />
                                                                                </a>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ) : '-';
                                                                break;
                                                            case 'whatsapp':
                                                                cellContent = driver.whatsapp_phone ? (
                                                                    <div className="relative group" onClick={(e) => e.stopPropagation()}>
                                                                        <span
                                                                            onMouseEnter={(e) => {
                                                                                if (hoverTimeoutRef.current) {
                                                                                    clearTimeout(hoverTimeoutRef.current);
                                                                                }
                                                                                setHoveredPhone(driver.whatsapp_phone || null);
                                                                                setWhatsappMousePosition({ x: e.clientX, y: e.clientY });
                                                                            }}
                                                                            onMouseMove={(e) => {
                                                                                setWhatsappMousePosition({ x: e.clientX, y: e.clientY });
                                                                            }}
                                                                            onMouseLeave={() => {
                                                                                hoverTimeoutRef.current = setTimeout(() => {
                                                                                    setHoveredPhone(null);
                                                                                    setWhatsappMousePosition(null);
                                                                                }, 200);
                                                                            }}
                                                                        >
                                                                            {driver.whatsapp_phone}
                                                                        </span>
                                                                        {hoveredPhone === driver.whatsapp_phone && whatsappMousePosition && (
                                                                            <div className="fixed z-[9999] flex gap-2 bg-white dark:bg-neutral-800 p-3 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 pointer-events-auto"
                                                                                style={{ 
                                                                                    left: `${whatsappMousePosition.x}px`,
                                                                                    top: `${whatsappMousePosition.y - 60}px`,
                                                                                    transform: 'translate(-50%, 0)'
                                                                                }}
                                                                                onMouseEnter={() => {
                                                                                    if (hoverTimeoutRef.current) {
                                                                                        clearTimeout(hoverTimeoutRef.current);
                                                                                    }
                                                                                }}
                                                                                onMouseLeave={() => {
                                                                                    hoverTimeoutRef.current = setTimeout(() => {
                                                                                        setHoveredPhone(null);
                                                                                        setWhatsappMousePosition(null);
                                                                                    }, 200);
                                                                                }}
                                                                            >
                                                                                <a
                                                                                    href={`tel:${driver.whatsapp_phone}`}
                                                                                    className="flex items-center justify-center w-10 h-10 rounded-full bg-green-500 hover:bg-green-600 text-white transition-colors"
                                                                                >
                                                                                    <Phone className="h-5 w-5" />
                                                                                </a>
                                                                                <a
                                                                                    href={`https://wa.me/${formatPhoneForWhatsApp(driver.whatsapp_phone)}`}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    className="flex items-center justify-center w-10 h-10 rounded-full bg-green-500 hover:bg-green-600 text-white transition-colors"
                                                                                >
                                                                                    <MessageCircle className="h-5 w-5" />
                                                                                </a>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ) : '-';
                                                                break;
                                                            case 'email':
                                                                cellContent = driver.email ? (
                                                                    <div className="relative group" onClick={(e) => e.stopPropagation()}>
                                                                        <span
                                                                            onMouseEnter={(e) => {
                                                                                if (emailHoverTimeoutRef.current) {
                                                                                    clearTimeout(emailHoverTimeoutRef.current);
                                                                                }
                                                                                setHoveredEmail(driver.email || null);
                                                                                setEmailMousePosition({ x: e.clientX, y: e.clientY });
                                                                            }}
                                                                            onMouseMove={(e) => {
                                                                                setEmailMousePosition({ x: e.clientX, y: e.clientY });
                                                                            }}
                                                                            onMouseLeave={() => {
                                                                                emailHoverTimeoutRef.current = setTimeout(() => {
                                                                                    setHoveredEmail(null);
                                                                                    setEmailMousePosition(null);
                                                                                }, 200);
                                                                            }}
                                                                        >
                                                                            {driver.email}
                                                                        </span>
                                                                        {hoveredEmail === driver.email && emailMousePosition && (
                                                                            <div className="fixed z-[9999] bg-white dark:bg-neutral-800 p-3 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 pointer-events-auto"
                                                                                style={{ 
                                                                                    left: `${emailMousePosition.x}px`,
                                                                                    top: `${emailMousePosition.y - 60}px`,
                                                                                    transform: 'translate(-50%, 0)'
                                                                                }}
                                                                                onMouseEnter={() => {
                                                                                    if (emailHoverTimeoutRef.current) {
                                                                                        clearTimeout(emailHoverTimeoutRef.current);
                                                                                    }
                                                                                }}
                                                                                onMouseLeave={() => {
                                                                                    emailHoverTimeoutRef.current = setTimeout(() => {
                                                                                        setHoveredEmail(null);
                                                                                        setEmailMousePosition(null);
                                                                                    }, 200);
                                                                                }}
                                                                            >
                                                                                <a
                                                                                    href={`mailto:${driver.email}`}
                                                                                    className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-500 hover:bg-blue-600 text-white transition-colors"
                                                                                >
                                                                                    <Mail className="h-5 w-5" />
                                                                                </a>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ) : '-';
                                                                break;
                                                            case 'riding_company':
                                                                cellContent = driver.riding_company?.name || '-';
                                                                break;
                                                            case 'campaign':
                                                                cellContent = driver.campaign?.name || '-';
                                                                break;
                                                            case 'lead_source':
                                                                cellContent = driver.lead_source?.name || '-';
                                                                break;
                                                            case 'lead_status':
                                                                cellContent = driver.lead_status?.name || '-';
                                                                break;
                                                            case 'lead_stage':
                                                                cellContent = driver.lead_stage?.name || '-';
                                                                break;
                                                            case 'assigned_to':
                                                                cellContent = driver.assigned_to?.name || '-';
                                                                break;
                                                            case 'uuid':
                                                                cellContent = driver.uuid || '-';
                                                                break;
                                                            case 'created_at':
                                                                cellContent = driver.created_at ? new Date(driver.created_at).toLocaleDateString() : '-';
                                                                break;
                                                            case 'updated_at':
                                                                cellContent = driver.updated_at ? new Date(driver.updated_at).toLocaleDateString() : '-';
                                                                break;
                                                            default:
                                                                cellContent = '-';
                                                        }
                                                        return (
                                                            <td key={col.id} className="px-4 py-3 text-sm">
                                                                {cellContent}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination Controls */}
                            <div className="mt-4 flex items-center justify-between">
                                <div className="text-sm text-neutral-600 dark:text-neutral-400">
                                    Page {currentPage} of {totalPages}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        disabled={currentPage === 1}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                        Previous
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                    >
                                        Next
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-12 text-neutral-500">
                            No drivers found
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

                {/* Quick Edit Dialog */}
                {quickEditDialog.driver && (
                    <QuickEditDialog
                        driver={quickEditDialog.driver}
                        open={quickEditDialog.open}
                        onOpenChange={(open) => setQuickEditDialog({ open, driver: null })}
                        filterOptions={filterOptions}
                    />
                )}

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
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                {doc.uploaded_path ? (
                                                                    <>
                                                                        {/* Status buttons - only show if file is uploaded */}
                                                                        {(canSetPending() || canSetApproved() || canSetRejected()) && (
                                                                            <div className="flex items-center gap-1 border rounded-md p-1">
                                                                                {canSetPending() && (
                                                                                    <Button
                                                                                        variant={doc.status === 'pending' ? 'default' : 'ghost'}
                                                                                        size="sm"
                                                                                        className={`h-7 px-3 text-xs ${
                                                                                            doc.status === 'pending'
                                                                                                ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                                                                                                : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
                                                                                        }`}
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            handleUpdateStatus(doc.id, 'pending');
                                                                                        }}
                                                                                    >
                                                                                        PENDING
                                                                                    </Button>
                                                                                )}
                                                                                {canSetApproved() && (
                                                                                    <Button
                                                                                        variant={doc.status === 'approved' ? 'default' : 'ghost'}
                                                                                        size="sm"
                                                                                        className={`h-7 px-3 text-xs ${
                                                                                            doc.status === 'approved'
                                                                                                ? 'bg-green-500 hover:bg-green-600 text-white'
                                                                                                : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
                                                                                        }`}
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            handleUpdateStatus(doc.id, 'approved');
                                                                                        }}
                                                                                    >
                                                                                        APPROVED
                                                                                    </Button>
                                                                                )}
                                                                                {canSetRejected() && (
                                                                                    <Button
                                                                                        variant={doc.status === 'rejected' ? 'default' : 'ghost'}
                                                                                        size="sm"
                                                                                        className={`h-7 px-3 text-xs ${
                                                                                            doc.status === 'rejected'
                                                                                                ? 'bg-red-500 hover:bg-red-600 text-white'
                                                                                                : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
                                                                                        }`}
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            handleUpdateStatus(doc.id, 'rejected');
                                                                                        }}
                                                                                    >
                                                                                        REJECT
                                                                                    </Button>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                        {canViewDocument() && (
                                                                            <Button
                                                                                variant="outline"
                                                                                size="sm"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleViewFile(doc.id);
                                                                                }}
                                                                            >
                                                                                <Eye className="h-4 w-4 mr-1" />
                                                                                View
                                                                                {getFileExtension(doc.original_filename, doc.uploaded_path) && (
                                                                                    <span className="ml-2 text-xs font-medium text-neutral-600 dark:text-neutral-400">
                                                                                        .{getFileExtension(doc.original_filename, doc.uploaded_path)}
                                                                                    </span>
                                                                                )}
                                                                            </Button>
                                                                        )}
                                                                        {canReplaceDocument() && (
                                                                            <>
                                                                                <input
                                                                                    ref={(el) => (fileInputRefs.current[doc.id] = el)}
                                                                                    type="file"
                                                                                    accept="image/jpeg,image/jpg,image/png,application/pdf"
                                                                                    className="hidden"
                                                                                    onChange={(e) => {
                                                                                        e.stopPropagation();
                                                                                        handleFileSelect(doc.id, e);
                                                                                    }}
                                                                                />
                                                                                <Button
                                                                                    variant="outline"
                                                                                    size="sm"
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        fileInputRefs.current[doc.id]?.click();
                                                                                    }}
                                                                                    disabled={uploadingDocId === doc.id}
                                                                                >
                                                                                    <Edit className="h-4 w-4 mr-1" />
                                                                                    {uploadingDocId === doc.id ? 'Uploading...' : 'Replace'}
                                                                                </Button>
                                                                            </>
                                                                        )}
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        {getStatusBadge(doc.status)}
                                                                        {canUploadDocument() && (
                                                                            <>
                                                                                <input
                                                                                    ref={(el) => (fileInputRefs.current[doc.id] = el)}
                                                                                    type="file"
                                                                                    accept="image/jpeg,image/jpg,image/png,application/pdf"
                                                                                    className="hidden"
                                                                                    onChange={(e) => {
                                                                                        e.stopPropagation();
                                                                                        handleFileSelect(doc.id, e);
                                                                                    }}
                                                                                />
                                                                                <Button
                                                                                    variant="outline"
                                                                                    size="sm"
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        fileInputRefs.current[doc.id]?.click();
                                                                                    }}
                                                                                    disabled={uploadingDocId === doc.id}
                                                                                >
                                                                                    <Upload className="h-4 w-4 mr-1" />
                                                                                    {uploadingDocId === doc.id ? 'Uploading...' : 'Upload'}
                                                                                </Button>
                                                                            </>
                                                                        )}
                                                                    </>
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

// Quick Edit Dialog Component
interface QuickEditDialogProps {
    driver: Driver;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    filterOptions: {
        companies?: FilterOption[];
        ridingCompanies?: FilterOption[];
        campaigns?: FilterOption[];
        leadSources?: FilterOption[];
        leadStatuses?: FilterOption[];
        users?: FilterOption[];
    };
}

function QuickEditDialog({ driver, open, onOpenChange, filterOptions }: QuickEditDialogProps) {
    const page = usePage<SharedData>();
    const isSuperAdmin = page.props.auth?.user?.is_super_admin;
    const [leadStages, setLeadStages] = useState<FilterOption[]>([]);
    const [loadingLeadStages, setLoadingLeadStages] = useState(false);
    
    const { data, setData, put, processing, errors, transform } = useForm({
        company_id: driver.company_id ? String(driver.company_id) : '',
        full_name: driver.full_name || '',
        phone: driver.phone || '',
        whatsapp_phone: driver.whatsapp_phone || '',
        email: driver.email || '',
        riding_company_id: driver.riding_company?.id ? String(driver.riding_company.id) : '',
        campaign_id: driver.campaign?.id ? String(driver.campaign.id) : '',
        lead_source_id: driver.lead_source?.id ? String(driver.lead_source.id) : '',
        assigned_to: driver.assigned_to?.id ? String(driver.assigned_to.id) : '',
        lead_status_id: driver.lead_status?.id ? String(driver.lead_status.id) : '',
        lead_stage_id: driver.lead_stage?.id ? String(driver.lead_stage.id) : '',
        current_stage_id: '',
        notes: '',
    });

    // Transform data before submitting - convert empty strings to null
    transform((data) => {
        const transformed: any = {
            full_name: data.full_name,
            phone: data.phone,
            whatsapp_phone: data.whatsapp_phone || null,
            email: data.email || null,
            riding_company_id: data.riding_company_id || null,
            campaign_id: data.campaign_id || null,
            lead_source_id: data.lead_source_id || null,
            assigned_to: data.assigned_to || null,
            lead_status_id: data.lead_status_id || null,
            lead_stage_id: data.lead_stage_id || null,
            current_stage_id: data.current_stage_id || null,
            notes: data.notes || null,
        };
        
        // Add company_id only for super admin
        if (isSuperAdmin && data.company_id) {
            transformed.company_id = data.company_id;
        }
        
        return transformed;
    });

    // Load lead stages when riding company changes
    useEffect(() => {
        if (data.riding_company_id) {
            setLoadingLeadStages(true);
            axios
                .get(`/api/drivers/riding-companies/${data.riding_company_id}/lead-stages`)
                .then((response) => {
                    setLeadStages(response.data || []);
                    // Reset lead_stage_id if current selection is not in the new list
                    if (data.lead_stage_id) {
                        const exists = response.data?.some((stage: FilterOption) => String(stage.id) === data.lead_stage_id);
                        if (!exists) {
                            setData('lead_stage_id', '');
                        }
                    }
                })
                .catch((error) => {
                    console.error('Error fetching lead stages:', error);
                    setLeadStages([]);
                })
                .finally(() => {
                    setLoadingLeadStages(false);
                });
        } else {
            setLeadStages([]);
            setData('lead_stage_id', '');
        }
    }, [data.riding_company_id]);

    // Load lead stages when dialog opens
    useEffect(() => {
        if (open && driver.riding_company?.id) {
            setLoadingLeadStages(true);
            axios
                .get(`/api/drivers/riding-companies/${driver.riding_company.id}/lead-stages`)
                .then((response) => {
                    setLeadStages(response.data || []);
                })
                .catch((error) => {
                    console.error('Error fetching lead stages:', error);
                    setLeadStages([]);
                })
                .finally(() => {
                    setLoadingLeadStages(false);
                });
        }
    }, [open, driver.riding_company?.id]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(`/drivers/drivers/${driver.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                onOpenChange(false);
                router.reload({ only: ['drivers'] });
            },
            onError: (errors) => {
                console.error('Error updating driver:', errors);
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="!max-w-6xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Quick Edit Driver</DialogTitle>
                    <DialogDescription>
                        Edit driver details: {driver.full_name}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Full Name</label>
                            <Input
                                value={data.full_name}
                                onChange={(e) => setData('full_name', e.target.value)}
                                className={errors.full_name ? 'border-red-500' : ''}
                            />
                            {errors.full_name && (
                                <p className="text-sm text-red-500 mt-1">{errors.full_name}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Phone</label>
                            <Input
                                value={data.phone}
                                onChange={(e) => setData('phone', e.target.value)}
                                className={errors.phone ? 'border-red-500' : ''}
                            />
                            {errors.phone && (
                                <p className="text-sm text-red-500 mt-1">{errors.phone}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">WhatsApp</label>
                            <Input
                                value={data.whatsapp_phone}
                                onChange={(e) => setData('whatsapp_phone', e.target.value)}
                                className={errors.whatsapp_phone ? 'border-red-500' : ''}
                            />
                            {errors.whatsapp_phone && (
                                <p className="text-sm text-red-500 mt-1">{errors.whatsapp_phone}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Email</label>
                            <Input
                                type="email"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                className={errors.email ? 'border-red-500' : ''}
                            />
                            {errors.email && (
                                <p className="text-sm text-red-500 mt-1">{errors.email}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Riding Company</label>
                            <Select
                                value={data.riding_company_id}
                                onValueChange={(value) => setData('riding_company_id', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Riding Company" />
                                </SelectTrigger>
                                <SelectContent>
                                    {filterOptions.ridingCompanies?.map((company) => (
                                        <SelectItem key={company.id} value={String(company.id)}>
                                            {company.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Campaign</label>
                            <Select
                                value={data.campaign_id}
                                onValueChange={(value) => setData('campaign_id', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Campaign" />
                                </SelectTrigger>
                                <SelectContent>
                                    {filterOptions.campaigns?.map((campaign) => (
                                        <SelectItem key={campaign.id} value={String(campaign.id)}>
                                            {campaign.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Lead Source</label>
                            <Select
                                value={data.lead_source_id}
                                onValueChange={(value) => setData('lead_source_id', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Lead Source" />
                                </SelectTrigger>
                                <SelectContent>
                                    {filterOptions.leadSources?.map((source) => (
                                        <SelectItem key={source.id} value={String(source.id)}>
                                            {source.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Lead Status</label>
                            <Select
                                value={data.lead_status_id}
                                onValueChange={(value) => setData('lead_status_id', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Lead Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    {filterOptions.leadStatuses?.map((status) => (
                                        <SelectItem key={status.id} value={String(status.id)}>
                                            {status.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Lead Stage</label>
                            <Select
                                value={data.lead_stage_id}
                                onValueChange={(value) => setData('lead_stage_id', value)}
                                disabled={loadingLeadStages || !data.riding_company_id}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={
                                        loadingLeadStages
                                            ? 'Loading...'
                                            : !data.riding_company_id
                                              ? 'Select a riding company first'
                                              : 'Select Lead Stage'
                                    } />
                                </SelectTrigger>
                                <SelectContent>
                                    {leadStages.map((stage) => (
                                        <SelectItem key={stage.id} value={String(stage.id)}>
                                            {stage.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.lead_stage_id && (
                                <p className="text-sm text-red-500 mt-1">{errors.lead_stage_id}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Assigned To</label>
                            <Select
                                value={data.assigned_to}
                                onValueChange={(value) => setData('assigned_to', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select User" />
                                </SelectTrigger>
                                <SelectContent>
                                    {filterOptions.users?.map((user) => (
                                        <SelectItem key={user.id} value={String(user.id)}>
                                            {user.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={processing}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

