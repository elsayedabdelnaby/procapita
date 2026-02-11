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
import { MultiSelect } from '@/components/ui/multi-select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router, usePage, useForm } from '@inertiajs/react';
import { Search, X, Pencil, Check, Eye, Phone, MessageCircle, ArrowUp, ArrowDown, User, Mail, CheckCircle2, FileText, Activity, Settings2, GripVertical, ChevronLeft, ChevronRight, Upload, Edit, Users, UserPlus, Calendar, AlertCircle, RotateCcw, Trash2, MapPin, Car } from 'lucide-react';
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { type SharedData } from '@/types';
import axios from 'axios';
import { formatDate } from '@/utils/date-format';
import { WhatsAppWindow } from '@/components/whatsapp/whatsapp-window';

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
    driver_num?: string;
    company_id?: number;
    full_name: string;
    phone: string;
    whatsapp_phone?: string;
    email?: string;
    riding_company?: RidingCompany;
    campaign?: Campaign;
    lead_source?: LeadSource;
    assigned_to?: User;
    assigned_users?: User[];
    lead_status?: LeadStatus;
    lead_status_comment?: string;
    cancel_reason?: string;
    next_follow_up?: string;
    last_follow_up?: string;
    assigned_time?: string;
    lead_stage?: LeadStage;
    created_at: string;
    updated_at: string;
    deleted_at?: string;
    duplicate?: number;
}

interface FilterOption {
    id: number;
    name: string;
}

interface DriversRecycleBinProps {
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
    { id: 'driver_num', label: 'Lead Num', defaultVisible: false, defaultOrder: 0.5 },
    { id: 'duplicate', label: 'Duplicate Count', defaultVisible: false, defaultOrder: 0.6 },
    { id: 'name', label: 'Name', defaultVisible: true, defaultOrder: 1 },
    { id: 'phone', label: 'Phone', defaultVisible: true, defaultOrder: 2 },
    { id: 'whatsapp', label: 'WhatsApp', defaultVisible: true, defaultOrder: 3 },
    { id: 'email', label: 'Email', defaultVisible: true, defaultOrder: 4 },
    { id: 'campaign', label: 'Campaign', defaultVisible: true, defaultOrder: 6 },
    { id: 'lead_source', label: 'Lead Source', defaultVisible: true, defaultOrder: 7 },
    { id: 'lead_status', label: 'Lead Status', defaultVisible: true, defaultOrder: 8 },
    { id: 'lead_status_comment', label: 'Feedback Comment', defaultVisible: false, defaultOrder: 8.5 },
    { id: 'next_follow_up', label: 'Next Follow-up', defaultVisible: false, defaultOrder: 8.6 },
    { id: 'last_follow_up', label: 'Last Follow-up', defaultVisible: false, defaultOrder: 8.7 },
    { id: 'assigned_time', label: 'Assigned Time', defaultVisible: false, defaultOrder: 8.8 },
    { id: 'lead_stage', label: 'Lead Stage', defaultVisible: true, defaultOrder: 9 },
    { id: 'assigned_users', label: 'Assigned Users', defaultVisible: true, defaultOrder: 10 },
    { id: 'last_assigned_time', label: 'Last Assigned Time', defaultVisible: false, defaultOrder: 10.5 },
    { id: 'last_assigned_by', label: 'Last Assigned By', defaultVisible: false, defaultOrder: 10.6 },
    { id: 'notes', label: 'Notes', defaultVisible: false, defaultOrder: 10.7 },
    { id: 'cancel_reason', label: 'Cancel Reasons', defaultVisible: false, defaultOrder: 10.8 },
    { id: 'deleted_at', label: 'Deleted At', defaultVisible: true, defaultOrder: 11 },
    { id: 'uuid', label: 'UUID', defaultVisible: false, defaultOrder: 12 },
    { id: 'created_at', label: 'Created At', defaultVisible: false, defaultOrder: 13 },
    { id: 'updated_at', label: 'Updated At', defaultVisible: false, defaultOrder: 14 },
];

// Generate time options from 08:00 AM to 11:30 PM in 30-minute intervals
const generateTimeOptions = (): string[] => {
    const times: string[] = [];
    for (let hour = 8; hour <= 23; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
            if (hour === 23 && minute > 30) break; // Stop at 11:30 PM
            const hour12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const timeStr = `${hour12.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} ${ampm}`;
            times.push(timeStr);
        }
    }
    return times;
};

const TIME_OPTIONS = generateTimeOptions();

export default function DriversRecycleBin({ drivers = [], importAvailableFields, filterOptions = {} }: DriversRecycleBinProps) {
    const page = usePage<SharedData>();
    
    // Local state for optimistic updates
    const [localDrivers, setLocalDrivers] = useState<Driver[]>(drivers);
    
    // Sync local drivers with props when they change
    useEffect(() => {
        setLocalDrivers(drivers);
    }, [drivers]);
    
    // Ensure drivers is always an array
    const safeDrivers = Array.isArray(localDrivers) ? localDrivers : [];
    
    // Get selected company from page props (the company selected from under the logo)
    const selectedCompany = page.props.selectedCompany;
    const companyId = selectedCompany?.id || null;
    
    // Get user info for WhatsApp access
    const currentUser = page.props.auth?.user;
    const userRidingCompanyId = (currentUser as any)?.riding_company_id || null;
    const isCompanyAdmin = currentUser?.is_company_admin || false;
    const isSuperAdmin = currentUser?.is_super_admin || false;
    
    // Get selected riding company from sidebar (for admins)
    const sidebarSelectedRidingCompany = (page.props as any).selectedRidingCompany;
    const sidebarSelectedRidingCompanyId = sidebarSelectedRidingCompany?.id || null;
    const demoReseller = (page.props as { demo_reseller?: boolean }).demo_reseller ?? false;
    
    // Get available riding companies for WhatsApp selector (for admins)
    const availableRidingCompanies = useMemo(() => {
        if (!isSuperAdmin && !isCompanyAdmin) return [];
        
        // Get unique riding companies from drivers
        const ridingCompaniesMap = new Map<number, RidingCompany>();
        safeDrivers.forEach(d => {
            if (d.riding_company) {
                ridingCompaniesMap.set(d.riding_company.id, d.riding_company);
            }
        });
        return Array.from(ridingCompaniesMap.values());
    }, [safeDrivers, isSuperAdmin, isCompanyAdmin]);
    
    // Selected riding company for WhatsApp (for admins)
    const [selectedWhatsAppRidingCompanyId, setSelectedWhatsAppRidingCompanyId] = useState<number | null>(
        sidebarSelectedRidingCompanyId || (availableRidingCompanies.length > 0 ? availableRidingCompanies[0]?.id : null)
    );
    
    // Update selected riding company when sidebar selection or available companies change
    useEffect(() => {
        if (sidebarSelectedRidingCompanyId) {
            setSelectedWhatsAppRidingCompanyId(sidebarSelectedRidingCompanyId);
        } else if (availableRidingCompanies.length > 0 && !selectedWhatsAppRidingCompanyId) {
            setSelectedWhatsAppRidingCompanyId(availableRidingCompanies[0].id);
        }
    }, [availableRidingCompanies, sidebarSelectedRidingCompanyId]);
    
    // Determine which riding company ID to use for WhatsApp
    // If user has a specific riding company, use that; else sidebar selection; else in demo_reseller mode use local selector
    const whatsAppRidingCompanyId = userRidingCompanyId || sidebarSelectedRidingCompanyId || (demoReseller && availableRidingCompanies.length > 0 ? selectedWhatsAppRidingCompanyId : null);
    
    // Show WhatsApp when: user has riding company, or sidebar has selection, or (demo_reseller and at least one reseller company)
    const showWhatsAppButton = !!userRidingCompanyId || !!sidebarSelectedRidingCompanyId || (!!demoReseller && availableRidingCompanies.length > 0);
    
    // Debug: Log to help troubleshoot
    if (!companyId) {
        console.log('No company selected. Selected company:', selectedCompany);
    }
    
    // Get driver phone numbers assigned to current user (both phone and whatsapp_phone)
    // Filter by selected riding company for WhatsApp
    const userDriverPhoneNumbers = useMemo(() => {
        const user = page.props.auth?.user;
        if (!user) return [];
        
        const phoneNumbers: string[] = [];
        
        // Helper function to check if phone number is valid
        const isValidPhone = (phone: string | null | undefined): boolean => {
            if (!phone) return false;
            const trimmed = phone.trim();
            // Must have at least 5 digits and not be just "0" or empty
            return trimmed.length >= 5 && trimmed !== '0' && /\d{5,}/.test(trimmed);
        };
        
        // Filter drivers by the selected riding company for WhatsApp
        const driversForWhatsApp = whatsAppRidingCompanyId
            ? safeDrivers.filter(d => d.riding_company?.id === whatsAppRidingCompanyId)
            : safeDrivers;
        
        // If super admin or company admin, show all drivers in the selected riding company
        if (user.is_super_admin || user.is_company_admin) {
            driversForWhatsApp.forEach(d => {
                if (isValidPhone(d.phone)) phoneNumbers.push(d.phone!);
                if (isValidPhone(d.whatsapp_phone)) phoneNumbers.push(d.whatsapp_phone!);
            });
        } else {
            // Otherwise, show only drivers assigned to this user
            driversForWhatsApp
                .filter(driver => {
                    // Check if driver is assigned to this user
                    const assignedUsers = driver.assigned_users || [];
                    return assignedUsers.some((u: any) => u.id === user.id);
                })
                .forEach(d => {
                    if (isValidPhone(d.phone)) phoneNumbers.push(d.phone!);
                    if (isValidPhone(d.whatsapp_phone)) phoneNumbers.push(d.whatsapp_phone!);
                });
        }
        
        // Remove duplicates
        return [...new Set(phoneNumbers)];
    }, [safeDrivers, page.props.auth?.user, whatsAppRidingCompanyId]);
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
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [selectedDrivers, setSelectedDrivers] = useState<Set<number>>(new Set());
    const [massDeleteDialog, setMassDeleteDialog] = useState(false);
    const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
    const [mergeDrivers, setMergeDrivers] = useState<Driver[]>([]);
    
    // Quick edit states
    const [editingRowId, setEditingRowId] = useState<number | null>(null);
    const [editingData, setEditingData] = useState<Partial<Driver> | null>(null);
    const [editingLeadStages, setEditingLeadStages] = useState<LeadStage[]>([]);
    
    // View details dialog states
    const [viewDialogOpen, setViewDialogOpen] = useState(false);
    const [viewingDriver, setViewingDriver] = useState<Driver | null>(null);
    const [driverDetails, setDriverDetails] = useState<any>(null);
    const [driverActivities, setDriverActivities] = useState<any[]>([]);
    const [driverDuplicateDrivers, setDriverDuplicateDrivers] = useState<any[]>([]);
    
    // WhatsApp Window states
    const [whatsappWindowOpen, setWhatsappWindowOpen] = useState(false);
    const [selectedDriverForWhatsApp, setSelectedDriverForWhatsApp] = useState<string | null>(null);
    const [whatsappFloating, setWhatsappFloating] = useState(false);
    const [whatsappWindowWidth, setWhatsappWindowWidth] = useState(384); // Default: 96 * 4 = 384px (w-96)
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [hoveredPhone, setHoveredPhone] = useState<string | null>(null);
    const [hoveredEmail, setHoveredEmail] = useState<string | null>(null);
    const [phoneMousePosition, setPhoneMousePosition] = useState<{ x: number; y: number } | null>(null);
    const [whatsappMousePosition, setWhatsappMousePosition] = useState<{ x: number; y: number } | null>(null);
    const [emailMousePosition, setEmailMousePosition] = useState<{ x: number; y: number } | null>(null);
    const [viewDialogTab, setViewDialogTab] = useState<'overview' | 'updates' | 'followups' | 'duplicates'>('overview');
    const [driverFollowUps, setDriverFollowUps] = useState<any[]>([]);
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
    
    // Merge saved columns with new columns to ensure all columns are present
    const mergeColumns = (saved: Array<{ id: string; visible: boolean; order: number }> | null) => {
        if (!saved || !Array.isArray(saved)) {
            return ALL_DRIVER_COLUMNS.map(col => ({
                id: col.id,
                visible: col.defaultVisible,
                order: col.defaultOrder,
            }));
        }
        
        // Create a map of saved columns
        const savedMap = new Map(saved.map(col => [col.id, col]));
        
        // Merge: use saved settings if exists, otherwise use defaults
        return ALL_DRIVER_COLUMNS.map(col => {
            const savedCol = savedMap.get(col.id);
            if (savedCol) {
                return {
                    id: col.id,
                    visible: savedCol.visible !== undefined ? savedCol.visible : col.defaultVisible,
                    order: savedCol.order !== undefined ? savedCol.order : col.defaultOrder,
                };
            }
            return {
                id: col.id,
                visible: col.defaultVisible,
                order: col.defaultOrder,
            };
        });
    };
    
    const initialColumns = mergeColumns(savedColumns);

    const [columns, setColumns] = useState<Array<{ id: string; visible: boolean; order: number }>>(
        initialColumns
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

    // Active tab state for notification buttons
    const [activeTab, setActiveTab] = useState<'all' | 'new' | 'today' | 'overdue'>('all');

    // Filter states
    const [filters, setFilters] = useState<Record<string, string | number | null | 'is_empty'>>({
        full_name: '',
        phone: '',
        whatsapp_phone: '',
        email: '',
        campaign_id: null,
        lead_source_id: null,
        lead_status_id: null,
        lead_status_comment: '',
        cancel_reason: '',
        lead_stage_id: null,
        assigned_to: null,
        last_assigned_time_from: '',
        last_assigned_time_to: '',
        last_assigned_time_from_time: '',
        last_assigned_time_to_time: '',
        next_follow_up_from: '',
        next_follow_up_to: '',
        next_follow_up_from_time: '',
        next_follow_up_to_time: '',
        last_follow_up_from: '',
        last_follow_up_to: '',
        last_follow_up_from_time: '',
        last_follow_up_to_time: '',
        assigned_time_from: '',
        assigned_time_to: '',
        assigned_time_from_time: '',
        assigned_time_to_time: '',
        created_at_from: '',
        created_at_to: '',
        created_at_from_time: '',
        created_at_to_time: '',
        updated_at_from: '',
        updated_at_to: '',
        updated_at_from_time: '',
        updated_at_to_time: '',
    });
    const [dateRangeDropdownOpen, setDateRangeDropdownOpen] = useState<Record<string, boolean>>({
        last_assigned_time: false,
        next_follow_up: false,
        last_follow_up: false,
        assigned_time: false,
        created_at: false,
        updated_at: false,
    });

    const defaultAvailableFields = [
        { value: 'full_name', label: 'Full Name' },
        { value: 'phone', label: 'Phone' },
        { value: 'whatsapp_phone', label: 'WhatsApp Phone' },
        { value: 'email', label: 'Email' },
        { value: 'company_id', label: 'Company' },
        { value: 'campaign_id', label: 'Campaign' },
        { value: 'lead_source_id', label: 'Lead Source' },
        { value: 'lead_status_id', label: 'Lead Status' },
        { value: 'assigned_to', label: 'Assigned To' },
        { value: 'notes', label: 'Notes' },
        { value: 'cancel_reason', label: 'Cancel Reasons' },
        { value: 'city', label: 'City' },
    ];

    const availableFields = importAvailableFields || defaultAvailableFields;

    const handleRestore = (driver: Driver) => {
        router.post(`/recyclebin/drivers/${driver.id}/restore`, {}, {
            preserveScroll: true,
            onSuccess: () => {
                router.reload({ only: ['drivers'] });
            },
        });
    };

    const handleRestoreMultiple = () => {
        if (selectedDrivers.size === 0) return;
        const ids = Array.from(selectedDrivers);
        router.post('/recyclebin/drivers/restore-multiple', { ids }, {
            preserveScroll: true,
            onSuccess: () => {
                setSelectedDrivers(new Set());
                router.reload({ only: ['drivers'] });
            },
        });
    };

    const handleDelete = (driver: Driver) => {
        setDeleteDialog({ open: true, driver });
    };

    const confirmDelete = () => {
        if (deleteDialog.driver) {
            router.delete(`/recyclebin/drivers/${deleteDialog.driver.id}`, {
                preserveScroll: true,
                onSuccess: () => {
                    setDeleteDialog({ open: false, driver: null });
                    router.reload({ only: ['drivers'] });
                },
            });
        }
    };

    const handleForceDelete = (driver: Driver) => {
        if (confirm(`Are you sure you want to permanently delete lead "${driver.full_name}"? This action cannot be undone.`)) {
            router.delete(`/recyclebin/drivers/${driver.id}`, {
                preserveScroll: true,
                onSuccess: () => {
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

    // Calculate counts for notification buttons
    const notificationCounts = useMemo(() => {
        if (!safeDrivers || safeDrivers.length === 0) {
            return { all: 0, new: 0, today: 0, overdue: 0 };
        }
        
        const today = new Date().toISOString().split('T')[0];
        
        return {
            all: safeDrivers.length,
            new: safeDrivers.filter(d => {
                // Include drivers with no lead_status or lead_status name is "New"
                return !d.lead_status?.id || d.lead_status?.name?.toLowerCase() === 'new';
            }).length,
            today: safeDrivers.filter(d => {
                if (!d.next_follow_up) return false;
                const followUpDate = new Date(d.next_follow_up).toISOString().split('T')[0];
                return followUpDate === today;
            }).length,
            overdue: safeDrivers.filter(d => {
                if (!d.next_follow_up) return false;
                const followUpDate = new Date(d.next_follow_up).toISOString().split('T')[0];
                return followUpDate < today;
            }).length,
        };
    }, [safeDrivers]);

    // Filter drivers based on active filters and active tab
    const filteredDrivers = useMemo(() => {
        if (!safeDrivers || safeDrivers.length === 0) {
            return [];
        }
        
        // First apply tab filter
        let tabFiltered = safeDrivers;
        const today = new Date().toISOString().split('T')[0];
        
        if (activeTab === 'new') {
            tabFiltered = safeDrivers.filter(d => {
                // Include drivers with no lead_status or lead_status name is "New"
                return !d.lead_status?.id || d.lead_status?.name?.toLowerCase() === 'new';
            });
        } else if (activeTab === 'today') {
            tabFiltered = safeDrivers.filter(d => {
                if (!d.next_follow_up) return false;
                const followUpDate = new Date(d.next_follow_up).toISOString().split('T')[0];
                return followUpDate === today;
            });
        } else if (activeTab === 'overdue') {
            tabFiltered = safeDrivers.filter(d => {
                if (!d.next_follow_up) return false;
                const followUpDate = new Date(d.next_follow_up).toISOString().split('T')[0];
                return followUpDate < today;
            });
        }
        // 'all' doesn't need filtering
        
        // Then apply other filters
        return tabFiltered.filter((driver) => {
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
            // Lead Status Comment filter
            if (filters.lead_status_comment) {
                if (filters.lead_status_comment === 'is_empty') {
                    if (driver.lead_status_comment && driver.lead_status_comment.trim() !== '') {
                        return false;
                    }
                } else if (!driver.lead_status_comment || !driver.lead_status_comment.toLowerCase().includes(String(filters.lead_status_comment).toLowerCase())) {
                    return false;
                }
            }
            // Cancel Reason filter
            if (filters.cancel_reason) {
                if (filters.cancel_reason === 'is_empty') {
                    if (driver.cancel_reason && driver.cancel_reason.trim() !== '') {
                        return false;
                    }
                } else if (!driver.cancel_reason || !driver.cancel_reason.toLowerCase().includes(String(filters.cancel_reason).toLowerCase())) {
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
            // Last Assigned Time filter (date range: from - to with time)
            if (filters.last_assigned_time_from || filters.last_assigned_time_to) {
                const lastAssignedTime = (driver as any).last_assigned_time;
                if (!lastAssignedTime) {
                    return false; // Skip if no last_assigned_time
                }
                
                // Parse the date/time string (format: dd-mm-yyyy hh:mm AM/PM)
                // Convert to Date object for comparison
                try {
                    // Parse format: "22-01-2025 02:30 PM"
                    const parts = lastAssignedTime.split(' ');
                    if (parts.length >= 2) {
                        const datePart = parts[0]; // "22-01-2025"
                        const timePart = parts.slice(1).join(' '); // "02:30 PM"
                        
                        const [day, month, year] = datePart.split('-').map(Number);
                        const timeMatch = timePart.match(/(\d+):(\d+)\s*(AM|PM)/i);
                        
                        if (timeMatch) {
                            let hours = parseInt(timeMatch[1]);
                            const minutes = parseInt(timeMatch[2]);
                            const ampm = timeMatch[3].toUpperCase();
                            
                            if (ampm === 'PM' && hours !== 12) hours += 12;
                            if (ampm === 'AM' && hours === 12) hours = 0;
                            
                            const driverDate = new Date(year, month - 1, day, hours, minutes);
                            
                            // Check from date/time
                            if (filters.last_assigned_time_from) {
                                const fromDate = new Date(String(filters.last_assigned_time_from));
                                if (filters.last_assigned_time_from_time) {
                                    const [fromHours, fromMinutes] = String(filters.last_assigned_time_from_time).split(':').map(Number);
                                    fromDate.setHours(fromHours || 0, fromMinutes || 0, 0, 0);
                                } else {
                                    fromDate.setHours(0, 0, 0, 0);
                                }
                                if (driverDate < fromDate) {
                                    return false;
                                }
                            }
                            
                            // Check to date/time
                            if (filters.last_assigned_time_to) {
                                const toDate = new Date(String(filters.last_assigned_time_to));
                                if (filters.last_assigned_time_to_time) {
                                    const [toHours, toMinutes] = String(filters.last_assigned_time_to_time).split(':').map(Number);
                                    toDate.setHours(toHours || 23, toMinutes || 59, 59, 999);
                                } else {
                                    toDate.setHours(23, 59, 59, 999);
                                }
                                if (driverDate > toDate) {
                                    return false;
                                }
                            }
                        }
                    }
                } catch (e) {
                    // If parsing fails, skip this filter
                    console.error('Error parsing last_assigned_time:', e);
                }
            }
            // Next Follow-up filter (date range: from - to with time)
            if (filters.next_follow_up_from || filters.next_follow_up_to) {
                const nextFollowUp = (driver as any).next_follow_up;
                if (!nextFollowUp) {
                    return false;
                }
                try {
                    const driverDate = new Date(nextFollowUp);
                    if (filters.next_follow_up_from) {
                        const fromDate = new Date(String(filters.next_follow_up_from));
                        if (filters.next_follow_up_from_time) {
                            const [fromHours, fromMinutes] = String(filters.next_follow_up_from_time).split(':').map(Number);
                            fromDate.setHours(fromHours || 0, fromMinutes || 0, 0, 0);
                        } else {
                            fromDate.setHours(0, 0, 0, 0);
                        }
                        if (driverDate < fromDate) {
                            return false;
                        }
                    }
                    if (filters.next_follow_up_to) {
                        const toDate = new Date(String(filters.next_follow_up_to));
                        if (filters.next_follow_up_to_time) {
                            const [toHours, toMinutes] = String(filters.next_follow_up_to_time).split(':').map(Number);
                            toDate.setHours(toHours || 23, toMinutes || 59, 59, 999);
                        } else {
                            toDate.setHours(23, 59, 59, 999);
                        }
                        if (driverDate > toDate) {
                            return false;
                        }
                    }
                } catch (e) {
                    console.error('Error parsing next_follow_up:', e);
                }
            }
            // Last Follow-up filter (date range: from - to with time)
            if (filters.last_follow_up_from || filters.last_follow_up_to) {
                const lastFollowUp = (driver as any).last_follow_up;
                if (!lastFollowUp) {
                    return false;
                }
                try {
                    const driverDate = new Date(lastFollowUp);
                    if (filters.last_follow_up_from) {
                        const fromDate = new Date(String(filters.last_follow_up_from));
                        if (filters.last_follow_up_from_time) {
                            const [fromHours, fromMinutes] = String(filters.last_follow_up_from_time).split(':').map(Number);
                            fromDate.setHours(fromHours || 0, fromMinutes || 0, 0, 0);
                        } else {
                            fromDate.setHours(0, 0, 0, 0);
                        }
                        if (driverDate < fromDate) {
                            return false;
                        }
                    }
                    if (filters.last_follow_up_to) {
                        const toDate = new Date(String(filters.last_follow_up_to));
                        if (filters.last_follow_up_to_time) {
                            const [toHours, toMinutes] = String(filters.last_follow_up_to_time).split(':').map(Number);
                            toDate.setHours(toHours || 23, toMinutes || 59, 59, 999);
                        } else {
                            toDate.setHours(23, 59, 59, 999);
                        }
                        if (driverDate > toDate) {
                            return false;
                        }
                    }
                } catch (e) {
                    console.error('Error parsing last_follow_up:', e);
                }
            }
            // Assigned Time filter (date range: from - to with time)
            if (filters.assigned_time_from || filters.assigned_time_to) {
                const assignedTime = (driver as any).assigned_time;
                if (!assignedTime) {
                    return false;
                }
                try {
                    const driverDate = new Date(assignedTime);
                    if (filters.assigned_time_from) {
                        const fromDate = new Date(String(filters.assigned_time_from));
                        if (filters.assigned_time_from_time) {
                            const [fromHours, fromMinutes] = String(filters.assigned_time_from_time).split(':').map(Number);
                            fromDate.setHours(fromHours || 0, fromMinutes || 0, 0, 0);
                        } else {
                            fromDate.setHours(0, 0, 0, 0);
                        }
                        if (driverDate < fromDate) {
                            return false;
                        }
                    }
                    if (filters.assigned_time_to) {
                        const toDate = new Date(String(filters.assigned_time_to));
                        if (filters.assigned_time_to_time) {
                            const [toHours, toMinutes] = String(filters.assigned_time_to_time).split(':').map(Number);
                            toDate.setHours(toHours || 23, toMinutes || 59, 59, 999);
                        } else {
                            toDate.setHours(23, 59, 59, 999);
                        }
                        if (driverDate > toDate) {
                            return false;
                        }
                    }
                } catch (e) {
                    console.error('Error parsing assigned_time:', e);
                }
            }
            // Created At filter (date range: from - to with time)
            if (filters.created_at_from || filters.created_at_to) {
                const createdAt = driver.created_at;
                if (!createdAt) {
                    return false;
                }
                try {
                    const driverDate = new Date(createdAt);
                    if (filters.created_at_from) {
                        const fromDate = new Date(String(filters.created_at_from));
                        if (filters.created_at_from_time) {
                            const [fromHours, fromMinutes] = String(filters.created_at_from_time).split(':').map(Number);
                            fromDate.setHours(fromHours || 0, fromMinutes || 0, 0, 0);
                        } else {
                            fromDate.setHours(0, 0, 0, 0);
                        }
                        if (driverDate < fromDate) {
                            return false;
                        }
                    }
                    if (filters.created_at_to) {
                        const toDate = new Date(String(filters.created_at_to));
                        if (filters.created_at_to_time) {
                            const [toHours, toMinutes] = String(filters.created_at_to_time).split(':').map(Number);
                            toDate.setHours(toHours || 23, toMinutes || 59, 59, 999);
                        } else {
                            toDate.setHours(23, 59, 59, 999);
                        }
                        if (driverDate > toDate) {
                            return false;
                        }
                    }
                } catch (e) {
                    console.error('Error parsing created_at:', e);
                }
            }
            // Updated At filter (date range: from - to with time)
            if (filters.updated_at_from || filters.updated_at_to) {
                const updatedAt = driver.updated_at;
                if (!updatedAt) {
                    return false;
                }
                try {
                    const driverDate = new Date(updatedAt);
                    if (filters.updated_at_from) {
                        const fromDate = new Date(String(filters.updated_at_from));
                        if (filters.updated_at_from_time) {
                            const [fromHours, fromMinutes] = String(filters.updated_at_from_time).split(':').map(Number);
                            fromDate.setHours(fromHours || 0, fromMinutes || 0, 0, 0);
                        } else {
                            fromDate.setHours(0, 0, 0, 0);
                        }
                        if (driverDate < fromDate) {
                            return false;
                        }
                    }
                    if (filters.updated_at_to) {
                        const toDate = new Date(String(filters.updated_at_to));
                        if (filters.updated_at_to_time) {
                            const [toHours, toMinutes] = String(filters.updated_at_to_time).split(':').map(Number);
                            toDate.setHours(toHours || 23, toMinutes || 59, 59, 999);
                        } else {
                            toDate.setHours(23, 59, 59, 999);
                        }
                        if (driverDate > toDate) {
                            return false;
                        }
                    }
                } catch (e) {
                    console.error('Error parsing updated_at:', e);
                }
            }
            return true;
        });
    }, [safeDrivers, filters, activeTab]);

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
                    case 'lead_status_comment':
                        aValue = a.lead_status_comment || '';
                        bValue = b.lead_status_comment || '';
                        break;
                    case 'cancel_reason':
                        aValue = (a as any).cancel_reason || '';
                        bValue = (b as any).cancel_reason || '';
                        break;
                    case 'next_follow_up':
                        aValue = a.next_follow_up || '';
                        bValue = b.next_follow_up || '';
                        break;
                    case 'last_follow_up':
                        aValue = a.last_follow_up || '';
                        bValue = b.last_follow_up || '';
                        break;
                    case 'lead_stage':
                        aValue = a.lead_stage?.name || '';
                        bValue = b.lead_stage?.name || '';
                        break;
                    case 'assigned_to':
                        aValue = a.assigned_to?.name || '';
                        bValue = b.assigned_to?.name || '';
                        break;
                    case 'assigned_users':
                        aValue = a.assigned_users && a.assigned_users.length > 0 ? a.assigned_users.map((u: any) => u.name).join(', ') : '';
                        bValue = b.assigned_users && b.assigned_users.length > 0 ? b.assigned_users.map((u: any) => u.name).join(', ') : '';
                        break;
                    case 'last_assigned_time':
                        aValue = (a as any).last_assigned_time || '';
                        bValue = (b as any).last_assigned_time || '';
                        break;
                    case 'last_assigned_by':
                        aValue = (a as any).last_assigned_by?.name || '';
                        bValue = (b as any).last_assigned_by?.name || '';
                        break;
                    case 'notes':
                        aValue = (a as any).notes || '';
                        bValue = (b as any).notes || '';
                        break;
                    case 'assigned_time':
                        aValue = (a as any).assigned_time || '';
                        bValue = (b as any).assigned_time || '';
                        break;
                    case 'duplicate':
                        aValue = (a as any).duplicate ?? 0;
                        bValue = (b as any).duplicate ?? 0;
                        break;
                    default:
                        return 0;
                }
                
                // For numeric fields, compare directly
                if (sortField === 'duplicate') {
                    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
                    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
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

    // Handle select all in current page only
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

    // Handle select all visible records (all filtered/sorted records)
    const handleSelectAllVisible = useCallback(() => {
        if (sortedAndFilteredDrivers && Array.isArray(sortedAndFilteredDrivers)) {
            setSelectedDrivers((prevSelected) => {
                const newSelected = new Set(prevSelected);
                sortedAndFilteredDrivers.forEach((d) => newSelected.add(d.id));
                return newSelected;
            });
        }
    }, [sortedAndFilteredDrivers]);

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
            campaign_id: null,
            lead_source_id: null,
            lead_status_id: null,
            lead_stage_id: null,
            assigned_to: null,
            last_assigned_time_from: '',
            last_assigned_time_to: '',
            last_assigned_time_from_time: '',
            last_assigned_time_to_time: '',
            next_follow_up_from: '',
            next_follow_up_to: '',
            next_follow_up_from_time: '',
            next_follow_up_to_time: '',
            last_follow_up_from: '',
            last_follow_up_to: '',
            last_follow_up_from_time: '',
            last_follow_up_to_time: '',
            assigned_time_from: '',
            assigned_time_to: '',
            assigned_time_from_time: '',
            assigned_time_to_time: '',
            created_at_from: '',
            created_at_to: '',
            created_at_from_time: '',
            created_at_to_time: '',
            updated_at_from: '',
            updated_at_to: '',
            updated_at_from_time: '',
            updated_at_to_time: '',
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
        if (selectedDrivers.size === 0) return;
        
        const ids = Array.from(selectedDrivers);
        let completed = 0;
        const total = ids.length;
        
        // Delete each driver permanently sequentially
        const deleteNext = () => {
            if (completed >= total) {
                setSelectedDrivers(new Set());
                setMassDeleteDialog(false);
                router.reload({ only: ['drivers'] });
                return;
            }
            
            const id = ids[completed];
            router.delete(`/recyclebin/drivers/${id}`, {
                preserveScroll: true,
                onSuccess: () => {
                    completed++;
                    deleteNext();
                },
                onError: () => {
                    completed++;
                    deleteNext();
                },
            });
        };
        
        deleteNext();
    };

    const handleMassEdit = () => {
        if (selectedDrivers.size > 0) {
            const ids = Array.from(selectedDrivers);
            router.visit(`/leads/leads/mass-edit?ids=${ids.join(',')}`);
        }
    };

    const handleMerge = () => {
        if (selectedDrivers.size >= 2 && selectedDrivers.size <= 3) {
            const selectedIds = Array.from(selectedDrivers);
            const driversToMerge = localDrivers.filter(d => selectedIds.includes(d.id));
            setMergeDrivers(driversToMerge);
            setMergeDialogOpen(true);
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
            campaign_id: driver.campaign?.id || null,
            lead_source_id: driver.lead_source?.id || null,
            lead_status_id: driver.lead_status?.id || null,
            lead_stage_id: driver.lead_stage?.id || null,
            assigned_to: driver.assigned_to?.id || null,
        });
        setEditingLeadStages([]);
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
            alert('Lead not found.');
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

        // Optimistic update - update local state immediately
        const driverIndex = safeDrivers.findIndex((d) => d.id === driverId);
        if (driverIndex !== -1) {
            const updatedDriver = { ...safeDrivers[driverIndex] };
            
            // Update driver fields optimistically
            if (savedData.full_name) updatedDriver.full_name = savedData.full_name;
            if (savedData.phone) updatedDriver.phone = savedData.phone;
            if (savedData.whatsapp_phone !== undefined) updatedDriver.whatsapp_phone = savedData.whatsapp_phone || null;
            if (savedData.email !== undefined) updatedDriver.email = savedData.email || null;
            if (savedData.campaign_id !== undefined) {
                const campaign = filterOptions?.campaigns?.find(c => c.value === savedData.campaign_id);
                updatedDriver.campaign = campaign ? { id: campaign.value, name: campaign.label } : null;
            }
            if (savedData.lead_source_id !== undefined) {
                const leadSource = filterOptions?.leadSources?.find(ls => ls.value === savedData.lead_source_id);
                updatedDriver.lead_source = leadSource ? { id: leadSource.value, name: leadSource.label } : null;
            }
            if (savedData.lead_status_id !== undefined) {
                const leadStatus = filterOptions?.leadStatuses?.find(ls => ls.value === savedData.lead_status_id);
                updatedDriver.lead_status = leadStatus ? { id: leadStatus.value, name: leadStatus.label, color: leadStatus.color } : null;
            }
            if (savedData.assigned_to !== undefined) {
                const assignedUser = filterOptions?.users?.find(u => u.value === savedData.assigned_to);
                updatedDriver.assigned_to = assignedUser ? { id: assignedUser.value, name: assignedUser.label } : null;
            }
            
            // Update local drivers array
            const updatedDrivers = [...safeDrivers];
            updatedDrivers[driverIndex] = updatedDriver;
            setLocalDrivers(updatedDrivers);
        }

        router.put(
            `/leads/leads/${driverId}`,
            submitData,
            {
                preserveScroll: true,
                onSuccess: () => {
                    // Silently reload to sync with server (in background)
                    router.reload({ only: ['drivers', 'filterOptions', 'importAvailableFields'], preserveScroll: true });
                },
                onError: (errors) => {
                    console.error('Error saving driver:', errors);
                    // Revert optimistic update on error
                    router.reload({ only: ['drivers', 'filterOptions', 'importAvailableFields'], preserveScroll: true });
                    // Reopen editing mode on error
                    setEditingRowId(driverId);
                    setEditingData(savedData);
                    
                    // Extract error messages
                    let errorMessage = 'Error saving lead. Please try again.';
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
            const response = await fetch(`/leads/leads/${driver.id}/details`, {
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
                setDriverFollowUps(data.follow_ups || []);
                setDriverDuplicateDrivers(data.duplicate_drivers || []);
            } else {
                const errorText = await response.text();
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch {
                    errorData = { error: errorText || 'Unknown error' };
                }
                console.error('Failed to load driver details:', errorData);
                alert(errorData.error || 'Failed to load lead details. Please try again.');
                setViewDialogOpen(false);
            }
        } catch (error) {
            console.error('Error loading driver details:', error);
            alert('Error loading lead details. Please try again.');
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

    // Document permissions - using drivers.drivers.* permissions
    const canUploadDocument = () => {
        return hasPermission('drivers.drivers.upload-document') || hasPermission('drivers.driverdocuments.upload');
    };

    const canViewDocument = () => {
        return hasPermission('drivers.drivers.view-document') || hasPermission('drivers.driverdocuments.view');
    };

    const canDeleteDocument = () => {
        return hasPermission('drivers.drivers.delete-document') || hasPermission('drivers.driverdocuments.delete-file');
    };

    const canRejectDocument = () => {
        return hasPermission('drivers.drivers.reject-document') || hasPermission('drivers.driverdocuments.set-rejected');
    };

    const canApproveDocument = () => {
        return hasPermission('drivers.drivers.approve-document') || hasPermission('drivers.driverdocuments.set-approved');
    };

    const canPendingDocument = () => {
        return hasPermission('drivers.drivers.pending-document') || hasPermission('drivers.driverdocuments.set-pending');
    };

    const canReplaceDocument = () => {
        return hasPermission('drivers.driverdocuments.replace');
    };

    const canSetPending = () => {
        return hasPermission('drivers.drivers.pending-document') || hasPermission('drivers.driverdocuments.set-pending');
    };

    const canSetApproved = () => {
        return hasPermission('drivers.drivers.approve-document') || hasPermission('drivers.driverdocuments.set-approved');
    };

    const canSetRejected = () => {
        return hasPermission('drivers.drivers.reject-document') || hasPermission('drivers.driverdocuments.set-rejected');
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
            .post(`/leads/lead-documents/${docId}/upload`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            })
            .then(() => {
                // Reload driver details
                if (viewingDriver) {
                    fetch(`/leads/leads/${viewingDriver.id}/details`, {
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
            await axios.post(`/leads/lead-documents/${docId}/update-status`, { status });
            // Reload driver details to get updated documents
            if (viewingDriver) {
                const response = await fetch(`/leads/leads/${viewingDriver.id}/details`, {
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
        const url = `/leads/lead-documents/${docId}/view`;
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
        <>
            <AppLayout>
            <Head title="Deleted Leads - Recycle Bin" />

            <div className={`p-6 ${whatsappWindowOpen && !whatsappFloating ? 'pr-0' : ''}`}>
                <div className={`flex gap-0 ${whatsappWindowOpen && !whatsappFloating ? 'flex-row' : ''}`}>
                    <div className={`${whatsappWindowOpen && !whatsappFloating ? 'flex-1 min-w-0' : 'w-full'}`}>
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Deleted Leads</h1>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            Deleted records that can be restored
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Link href="/leads/leads">
                            <Button variant="outline">Back to Leads</Button>
                        </Link>
                    </div>
                </div>

                <Card className="p-6">
                    {safeDrivers.length > 0 ? (
                        <>
                            {/* Mass Actions Bar */}
                            {selectedDrivers.size > 0 && (
                                <div className="mb-4 p-3 bg-muted rounded-md flex items-center justify-between">
                                    <span className="text-sm font-medium">
                                        {selectedDrivers.size} lead(s) selected
                                    </span>
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            variant="default"
                                            size="sm"
                                            onClick={handleRestoreMultiple}
                                        >
                                            <RotateCcw className="h-4 w-4 mr-2" />
                                            Restore Selected
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            size="sm"
                                            onClick={handleMassDelete}
                                        >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Delete Selected
                                        </Button>
                                    </div>
                                </div>
                            )}
                            {/* Notification Buttons - Removed for Recycle Bin */}
                            {/* <div className="mb-6 flex items-center gap-4 flex-wrap">
                                <button
                                    onClick={() => {
                                        setActiveTab('all');
                                        setCurrentPage(1);
                                    }}
                                    className={`relative flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                                        activeTab === 'all'
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                                            : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                                    }`}
                                >
                                    <Users className={`h-5 w-5 ${activeTab === 'all' ? 'text-blue-600 dark:text-blue-400' : 'text-neutral-600 dark:text-neutral-400'}`} />
                                    <span className={`font-medium ${activeTab === 'all' ? 'text-blue-700 dark:text-blue-300' : 'text-neutral-700 dark:text-neutral-300'}`}>
                                        All Leads
                                    </span>
                                    {notificationCounts.all > 0 && (
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                            activeTab === 'all'
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-blue-500 text-white animate-pulse'
                                        }`}>
                                            {notificationCounts.all}
                                        </span>
                                    )}
                                </button>

                                <button
                                    onClick={() => {
                                        setActiveTab('new');
                                        setCurrentPage(1);
                                    }}
                                    className={`relative flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                                        activeTab === 'new'
                                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20 shadow-md'
                                            : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                                    }`}
                                >
                                    <UserPlus className={`h-5 w-5 ${activeTab === 'new' ? 'text-green-600 dark:text-green-400' : 'text-neutral-600 dark:text-neutral-400'}`} />
                                    <span className={`font-medium ${activeTab === 'new' ? 'text-green-700 dark:text-green-300' : 'text-neutral-700 dark:text-neutral-300'}`}>
                                        New Leads
                                    </span>
                                    {notificationCounts.new > 0 && (
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                            activeTab === 'new'
                                                ? 'bg-green-600 text-white'
                                                : 'bg-green-500 text-white animate-pulse'
                                        }`}>
                                            {notificationCounts.new}
                                        </span>
                                    )}
                                </button>

                                <button
                                    onClick={() => {
                                        setActiveTab('today');
                                        setCurrentPage(1);
                                    }}
                                    className={`relative flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                                        activeTab === 'today'
                                            ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 shadow-md'
                                            : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                                    }`}
                                >
                                    <Calendar className={`h-5 w-5 ${activeTab === 'today' ? 'text-yellow-600 dark:text-yellow-400' : 'text-neutral-600 dark:text-neutral-400'}`} />
                                    <span className={`font-medium ${activeTab === 'today' ? 'text-yellow-700 dark:text-yellow-300' : 'text-neutral-700 dark:text-neutral-300'}`}>
                                        Today Follow-up
                                    </span>
                                    {notificationCounts.today > 0 && (
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                            activeTab === 'today'
                                                ? 'bg-yellow-600 text-white'
                                                : 'bg-yellow-500 text-white animate-pulse'
                                        }`}>
                                            {notificationCounts.today}
                                        </span>
                                    )}
                                </button>

                                <button
                                    onClick={() => {
                                        setActiveTab('overdue');
                                        setCurrentPage(1);
                                    }}
                                    className={`relative flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                                        activeTab === 'overdue'
                                            ? 'border-red-500 bg-red-50 dark:bg-red-900/20 shadow-md'
                                            : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                                    }`}
                                >
                                    <AlertCircle className={`h-5 w-5 ${activeTab === 'overdue' ? 'text-red-600 dark:text-red-400' : 'text-neutral-600 dark:text-neutral-400'}`} />
                                    <span className={`font-medium ${activeTab === 'overdue' ? 'text-red-700 dark:text-red-300' : 'text-neutral-700 dark:text-neutral-300'}`}>
                                        Overdue
                                    </span>
                                    {notificationCounts.overdue > 0 && (
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                            activeTab === 'overdue'
                                                ? 'bg-red-600 text-white'
                                                : 'bg-red-500 text-white animate-pulse'
                                        }`}>
                                            {notificationCounts.overdue}
                                        </span>
                                    )}
                                </button>
                            </div>
                            {/* Mass Actions Bar - Already added above with Restore */}

                            {/* Table Controls Bar */}
                            <div className="mb-4 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                    {isAllSelected && sortedAndFilteredDrivers && sortedAndFilteredDrivers.length > 0 && (
                                        <button
                                            onClick={handleSelectAllVisible}
                                            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
                                        >
                                            Select all {sortedAndFilteredDrivers.length} lead(s)
                                        </button>
                                    )}
                                </div>
                                <div className="flex items-center gap-4">
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
                                    </div>
                                    <div className="text-sm text-neutral-600 dark:text-neutral-400">
                                        Page {currentPage} of {totalPages}
                                    </div>
                                    <div className="text-sm text-neutral-600 dark:text-neutral-400">
                                        Total: {sortedAndFilteredDrivers?.length || 0} lead(s)
                                    </div>
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

                            <div className="relative">
                                <div className="overflow-x-auto overflow-y-visible rounded-lg border" style={{ 
                                    scrollbarWidth: 'thin', 
                                    scrollbarColor: '#cbd5e1 transparent',
                                    maxHeight: 'calc(100vh - 400px)',
                                    overflowY: 'auto',
                                    position: 'relative'
                                }}>
                                    <style>{`
                                        div[class*="overflow-x-auto"]::-webkit-scrollbar {
                                            height: 12px;
                                            width: 12px;
                                        }
                                        div[class*="overflow-x-auto"]::-webkit-scrollbar:horizontal {
                                            position: sticky;
                                            bottom: 0;
                                            z-index: 10;
                                        }
                                        div[class*="overflow-x-auto"]::-webkit-scrollbar-track {
                                            background: transparent;
                                        }
                                        div[class*="overflow-x-auto"]::-webkit-scrollbar-thumb {
                                            background-color: #cbd5e1;
                                            border-radius: 6px;
                                        }
                                        div[class*="overflow-x-auto"]::-webkit-scrollbar-thumb:hover {
                                            background-color: #94a3b8;
                                        }
                                        div[class*="overflow-x-auto"]::-webkit-scrollbar-corner {
                                            background: transparent;
                                        }
                                    `}</style>
                                    <table className="w-full">
                                    <thead className="bg-neutral-100/60 dark:bg-neutral-800/60 backdrop-blur-sm sticky top-0 z-20">
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
                                                                  col.id === 'lead_source' ? 'lead_source_id' :
                                                                  col.id === 'lead_status' ? 'lead_status_id' :
                                                                  col.id === 'lead_status_comment' ? 'lead_status_comment' :
                                                                  col.id === 'cancel_reason' ? 'cancel_reason' :
                                                                  col.id === 'lead_stage' ? 'lead_stage_id' :
                                                                  col.id === 'assigned_to' ? 'assigned_to' :
                                                                  col.id === 'campaign' ? 'campaign_id' :
                                                                  col.id === 'last_assigned_time' ? 'last_assigned_time' :
                                                                  col.id;
                                                if (col.id === 'last_assigned_time') {
                                                    const hasFromDate = filters.last_assigned_time_from && String(filters.last_assigned_time_from).trim() !== '';
                                                    const hasFromTime = filters.last_assigned_time_from_time && String(filters.last_assigned_time_from_time).trim() !== '';
                                                    const hasToDate = filters.last_assigned_time_to && String(filters.last_assigned_time_to).trim() !== '';
                                                    const hasToTime = filters.last_assigned_time_to_time && String(filters.last_assigned_time_to_time).trim() !== '';
                                                    const hasActiveDateFilter = hasFromDate || hasToDate;
                                                    
                                                    const formatDisplayValue = () => {
                                                        if (!hasActiveDateFilter) return 'Select date range...';
                                                        const fromStr = hasFromDate 
                                                            ? `${String(filters.last_assigned_time_from)}${hasFromTime ? ' ' + String(filters.last_assigned_time_from_time) : ''}`
                                                            : '...';
                                                        const toStr = hasToDate 
                                                            ? `${String(filters.last_assigned_time_to)}${hasToTime ? ' ' + String(filters.last_assigned_time_to_time) : ''}`
                                                            : '...';
                                                        return `${fromStr} - ${toStr}`;
                                                    };
                                                    
                                                    return (
                                                        <th key={col.id} className="px-4 py-2">
                                                            <div className="relative">
                                                                <DropdownMenu open={dateRangeDropdownOpen.last_assigned_time || false} onOpenChange={(open) => {
                                                                    setDateRangeDropdownOpen({...dateRangeDropdownOpen, last_assigned_time: open});
                                                                    if (open) {
                                                                        // Auto-fill with today's date and current time when opening
                                                                        const now = new Date();
                                                                        const today = now.toISOString().split('T')[0];
                                                                        const currentTime = now.toTimeString().slice(0, 5);
                                                                        if (!filters.last_assigned_time_from) {
                                                                            handleFilterChange('last_assigned_time_from', today);
                                                                        }
                                                                        if (!filters.last_assigned_time_from_time) {
                                                                            handleFilterChange('last_assigned_time_from_time', currentTime);
                                                                        }
                                                                        if (!filters.last_assigned_time_to) {
                                                                            handleFilterChange('last_assigned_time_to', today);
                                                                        }
                                                                        if (!filters.last_assigned_time_to_time) {
                                                                            handleFilterChange('last_assigned_time_to_time', currentTime);
                                                                        }
                                                                    }
                                                                }}>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            className="w-full text-xs h-8 justify-start text-left font-normal"
                                                                        >
                                                                            {formatDisplayValue()}
                                                                        </Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent className="w-96 p-4" align="start">
                                                                        <div className="space-y-4">
                                                                            <div>
                                                                                <label className="text-xs font-medium mb-1 block">From Date</label>
                                                                                <div className="flex gap-2">
                                                                                    <Input
                                                                                        type="date"
                                                                                        value={filters.last_assigned_time_from ? String(filters.last_assigned_time_from) : ''}
                                                                                        onChange={(e) => handleFilterChange('last_assigned_time_from', e.target.value)}
                                                                                        onClick={(e) => {
                                                                                            const input = e.target as HTMLInputElement;
                                                                                            input.showPicker?.();
                                                                                        }}
                                                                                        onFocus={(e) => {
                                                                                            e.target.showPicker?.();
                                                                                        }}
                                                                                        className="flex-1 text-xs h-8 cursor-pointer"
                                                                                    />
                                                                                    <Input
                                                                                        type="time"
                                                                                        value={filters.last_assigned_time_from_time ? String(filters.last_assigned_time_from_time) : ''}
                                                                                        onChange={(e) => handleFilterChange('last_assigned_time_from_time', e.target.value)}
                                                                                        className="w-32 text-xs h-8"
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                            <div>
                                                                                <label className="text-xs font-medium mb-1 block">To Date</label>
                                                                                <div className="flex gap-2">
                                                                                    <Input
                                                                                        type="date"
                                                                                        value={filters.last_assigned_time_to ? String(filters.last_assigned_time_to) : ''}
                                                                                        onChange={(e) => handleFilterChange('last_assigned_time_to', e.target.value)}
                                                                                        onClick={(e) => {
                                                                                            const input = e.target as HTMLInputElement;
                                                                                            input.showPicker?.();
                                                                                        }}
                                                                                        onFocus={(e) => {
                                                                                            e.target.showPicker?.();
                                                                                        }}
                                                                                        className="flex-1 text-xs h-8 cursor-pointer"
                                                                                    />
                                                                                    <Input
                                                                                        type="time"
                                                                                        value={filters.last_assigned_time_to_time ? String(filters.last_assigned_time_to_time) : ''}
                                                                                        onChange={(e) => handleFilterChange('last_assigned_time_to_time', e.target.value)}
                                                                                        className="w-32 text-xs h-8"
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex gap-2">
                                                                                <Button
                                                                                    variant="outline"
                                                                                    size="sm"
                                                                                    className="flex-1 text-xs h-7"
                                                                                    onClick={() => {
                                                                                        handleFilterChange('last_assigned_time_from', '');
                                                                                        handleFilterChange('last_assigned_time_to', '');
                                                                                        handleFilterChange('last_assigned_time_from_time', '');
                                                                                        handleFilterChange('last_assigned_time_to_time', '');
                                                                                    }}
                                                                                >
                                                                                    Clear
                                                                                </Button>
                                                                                <Button
                                                                                    variant="default"
                                                                                    size="sm"
                                                                                    className="flex-1 text-xs h-7"
                                                                                    onClick={() => {
                                                                                        setDateRangeDropdownOpen({...dateRangeDropdownOpen, last_assigned_time: false});
                                                                                    }}
                                                                                >
                                                                                    Apply
                                                                                </Button>
                                                                            </div>
                                                                        </div>
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                                {hasActiveDateFilter && (
                                                                    <button
                                                                        onClick={() => {
                                                                            clearFilter('last_assigned_time_from');
                                                                            clearFilter('last_assigned_time_to');
                                                                            clearFilter('last_assigned_time_from_time');
                                                                            clearFilter('last_assigned_time_to_time');
                                                                        }}
                                                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-red-500 hover:text-red-700 z-10"
                                                                        title="Clear filter"
                                                                    >
                                                                        <X className="h-3 w-3" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </th>
                                                    );
                                                }
                                                // Date range filters for next_follow_up, last_follow_up, assigned_time
                                                const dateTimeFields = ['next_follow_up', 'last_follow_up', 'assigned_time', 'created_at', 'updated_at'];
                                                if (dateTimeFields.includes(col.id)) {
                                                    const fieldName = col.id;
                                                    const hasFromDate = filters[`${fieldName}_from` as keyof typeof filters] && String(filters[`${fieldName}_from` as keyof typeof filters]).trim() !== '';
                                                    const hasFromTime = filters[`${fieldName}_from_time` as keyof typeof filters] && String(filters[`${fieldName}_from_time` as keyof typeof filters]).trim() !== '';
                                                    const hasToDate = filters[`${fieldName}_to` as keyof typeof filters] && String(filters[`${fieldName}_to` as keyof typeof filters]).trim() !== '';
                                                    const hasToTime = filters[`${fieldName}_to_time` as keyof typeof filters] && String(filters[`${fieldName}_to_time` as keyof typeof filters]).trim() !== '';
                                                    const hasActiveDateFilter = hasFromDate || hasToDate;
                                                    
                                                    const formatDisplayValue = () => {
                                                        if (!hasActiveDateFilter) return 'Select date range...';
                                                        const fromStr = hasFromDate 
                                                            ? `${String(filters[`${fieldName}_from` as keyof typeof filters])}${hasFromTime ? ' ' + String(filters[`${fieldName}_from_time` as keyof typeof filters]) : ''}`
                                                            : '...';
                                                        const toStr = hasToDate 
                                                            ? `${String(filters[`${fieldName}_to` as keyof typeof filters])}${hasToTime ? ' ' + String(filters[`${fieldName}_to_time` as keyof typeof filters]) : ''}`
                                                            : '...';
                                                        return `${fromStr} - ${toStr}`;
                                                    };
                                                    
                                                    return (
                                                        <th key={col.id} className="px-4 py-2">
                                                            <div className="relative">
                                                                <DropdownMenu open={dateRangeDropdownOpen[fieldName as keyof typeof dateRangeDropdownOpen] || false} onOpenChange={(open) => {
                                                                    setDateRangeDropdownOpen({...dateRangeDropdownOpen, [fieldName]: open});
                                                                    if (open) {
                                                                        // Auto-fill with today's date and current time when opening
                                                                        const now = new Date();
                                                                        const today = now.toISOString().split('T')[0];
                                                                        const currentTime = now.toTimeString().slice(0, 5);
                                                                        if (!filters[`${fieldName}_from` as keyof typeof filters]) {
                                                                            handleFilterChange(`${fieldName}_from`, today);
                                                                        }
                                                                        if (!filters[`${fieldName}_from_time` as keyof typeof filters]) {
                                                                            handleFilterChange(`${fieldName}_from_time`, currentTime);
                                                                        }
                                                                        if (!filters[`${fieldName}_to` as keyof typeof filters]) {
                                                                            handleFilterChange(`${fieldName}_to`, today);
                                                                        }
                                                                        if (!filters[`${fieldName}_to_time` as keyof typeof filters]) {
                                                                            handleFilterChange(`${fieldName}_to_time`, currentTime);
                                                                        }
                                                                    }
                                                                }}>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            className="w-full text-xs h-8 justify-start text-left font-normal"
                                                                        >
                                                                            {formatDisplayValue()}
                                                                        </Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent className="w-96 p-4" align="start">
                                                                        <div className="space-y-4">
                                                                            <div>
                                                                                <label className="text-xs font-medium mb-1 block">From Date</label>
                                                                                <div className="flex gap-2">
                                                                                    <Input
                                                                                        type="date"
                                                                                        value={filters[`${fieldName}_from` as keyof typeof filters] ? String(filters[`${fieldName}_from` as keyof typeof filters]) : ''}
                                                                                        onChange={(e) => handleFilterChange(`${fieldName}_from`, e.target.value)}
                                                                                        onClick={(e) => {
                                                                                            const input = e.target as HTMLInputElement;
                                                                                            input.showPicker?.();
                                                                                        }}
                                                                                        onFocus={(e) => {
                                                                                            e.target.showPicker?.();
                                                                                        }}
                                                                                        className="flex-1 text-xs h-8 cursor-pointer"
                                                                                    />
                                                                                    <Input
                                                                                        type="time"
                                                                                        value={filters[`${fieldName}_from_time` as keyof typeof filters] ? String(filters[`${fieldName}_from_time` as keyof typeof filters]) : ''}
                                                                                        onChange={(e) => handleFilterChange(`${fieldName}_from_time`, e.target.value)}
                                                                                        className="w-32 text-xs h-8"
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                            <div>
                                                                                <label className="text-xs font-medium mb-1 block">To Date</label>
                                                                                <div className="flex gap-2">
                                                                                    <Input
                                                                                        type="date"
                                                                                        value={filters[`${fieldName}_to` as keyof typeof filters] ? String(filters[`${fieldName}_to` as keyof typeof filters]) : ''}
                                                                                        onChange={(e) => handleFilterChange(`${fieldName}_to`, e.target.value)}
                                                                                        onClick={(e) => {
                                                                                            const input = e.target as HTMLInputElement;
                                                                                            input.showPicker?.();
                                                                                        }}
                                                                                        onFocus={(e) => {
                                                                                            e.target.showPicker?.();
                                                                                        }}
                                                                                        className="flex-1 text-xs h-8 cursor-pointer"
                                                                                    />
                                                                                    <Input
                                                                                        type="time"
                                                                                        value={filters[`${fieldName}_to_time` as keyof typeof filters] ? String(filters[`${fieldName}_to_time` as keyof typeof filters]) : ''}
                                                                                        onChange={(e) => handleFilterChange(`${fieldName}_to_time`, e.target.value)}
                                                                                        className="w-32 text-xs h-8"
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex gap-2">
                                                                                <Button
                                                                                    variant="outline"
                                                                                    size="sm"
                                                                                    className="flex-1 text-xs h-7"
                                                                                    onClick={() => {
                                                                                        handleFilterChange(`${fieldName}_from`, '');
                                                                                        handleFilterChange(`${fieldName}_to`, '');
                                                                                        handleFilterChange(`${fieldName}_from_time`, '');
                                                                                        handleFilterChange(`${fieldName}_to_time`, '');
                                                                                    }}
                                                                                >
                                                                                    Clear
                                                                                </Button>
                                                                                <Button
                                                                                    variant="default"
                                                                                    size="sm"
                                                                                    className="flex-1 text-xs h-7"
                                                                                    onClick={() => {
                                                                                        setDateRangeDropdownOpen({...dateRangeDropdownOpen, [fieldName]: false});
                                                                                    }}
                                                                                >
                                                                                    Apply
                                                                                </Button>
                                                                            </div>
                                                                        </div>
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                                {hasActiveDateFilter && (
                                                                    <button
                                                                        onClick={() => {
                                                                            clearFilter(`${fieldName}_from`);
                                                                            clearFilter(`${fieldName}_to`);
                                                                            clearFilter(`${fieldName}_from_time`);
                                                                            clearFilter(`${fieldName}_to_time`);
                                                                        }}
                                                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-red-500 hover:text-red-700 z-10"
                                                                        title="Clear filter"
                                                                    >
                                                                        <X className="h-3 w-3" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </th>
                                                    );
                                                }
                                                if (['campaign', 'lead_source', 'lead_status', 'lead_stage', 'assigned_to', 'last_assigned_by'].includes(col.id)) {
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
                                                                          col.id === 'assigned_to' ? (filterOptions?.users || []) :
                                                                          col.id === 'last_assigned_by' ? (filterOptions?.users || []) : []).map((option: any) => (
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
                                                    No leads found
                                                </td>
                                            </tr>
                                        ) : (
                                            (paginatedDrivers || []).map((driver, index) => (
                                                <tr
                                                    key={driver.id}
                                                    className={`
                                                        transition-colors duration-150 cursor-pointer
                                                        ${
                                                            index === 0
                                                                ? 'bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100/70 dark:hover:bg-blue-950/40'
                                                                : index % 2 === 0
                                                                  ? 'bg-white dark:bg-neutral-950 hover:bg-neutral-50 dark:hover:bg-neutral-900/50'
                                                                  : 'bg-neutral-50/80 dark:bg-neutral-900/30 hover:bg-neutral-100 dark:hover:bg-neutral-900/60'
                                                        }
                                                    `}
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
                                                            // Save filtered driver IDs to localStorage for navigation
                                                            const filteredIds = filteredDrivers.map(d => d.id);
                                                            try {
                                                                localStorage.setItem('drivers_filtered_ids', JSON.stringify(filteredIds));
                                                            } catch (e) {
                                                                console.error('Error saving filtered IDs:', e);
                                                            }
                                                            router.visit(`/leads/leads/${driver.id}`);
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
                                                                                handleRestore(driver);
                                                                            }}
                                                                            className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                                                                            title="Restore"
                                                                        >
                                                                            <RotateCcw className="h-4 w-4" />
                                                                        </button>
                                                                        {canDeleteDriver() && (
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleForceDelete(driver);
                                                                                }}
                                                                                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                                                                title="Permanently Delete"
                                                                            >
                                                                                <Trash2 className="h-4 w-4" />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            );
                                                        }
                                                        // Render cell content based on column id
                                                        let cellContent: React.ReactNode = '';
                                                        switch (col.id) {
                                                            case 'driver_num':
                                                                cellContent = driver.driver_num || driver.id;
                                                                break;
                                                            case 'duplicate':
                                                                cellContent = (driver as any).duplicate ?? 0;
                                                                break;
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
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.preventDefault();
                                                                                        e.stopPropagation();
                                                                                        // Use phone directly (not whatsapp_phone)
                                                                                        setSelectedDriverForWhatsApp(driver.phone);
                                                                                        setWhatsappWindowOpen(true);
                                                                                        setWhatsappFloating(false); // Ensure it opens in side panel, not floating
                                                                                    }}
                                                                                    className="flex items-center justify-center w-10 h-10 rounded-full bg-green-500 hover:bg-green-600 text-white transition-colors"
                                                                                >
                                                                                    <MessageCircle className="h-5 w-5" />
                                                                                </button>
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
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.preventDefault();
                                                                                        e.stopPropagation();
                                                                                        // Use whatsapp_phone directly
                                                                                        if (driver.whatsapp_phone) {
                                                                                            setSelectedDriverForWhatsApp(driver.whatsapp_phone);
                                                                                            setWhatsappWindowOpen(true);
                                                                                            setWhatsappFloating(false); // Ensure it opens in side panel, not floating
                                                                                        }
                                                                                    }}
                                                                                    className="flex items-center justify-center w-10 h-10 rounded-full bg-green-500 hover:bg-green-600 text-white transition-colors"
                                                                                >
                                                                                    <MessageCircle className="h-5 w-5" />
                                                                                </button>
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
                                                            case 'campaign':
                                                                cellContent = driver.campaign?.name || '-';
                                                                break;
                                                            case 'lead_source':
                                                                cellContent = driver.lead_source?.name || '-';
                                                                break;
                                                            case 'lead_status':
                                                                cellContent = driver.lead_status?.name || '-';
                                                                break;
                                                            case 'lead_status_comment':
                                                                cellContent = driver.lead_status_comment ? (
                                                                    <div className="max-w-xs truncate" title={driver.lead_status_comment}>
                                                                        {driver.lead_status_comment}
                                                                    </div>
                                                                ) : '-';
                                                                break;
                                                            case 'cancel_reason':
                                                                cellContent = (driver as any).cancel_reason || '-';
                                                                break;
                                                            case 'next_follow_up':
                                                                cellContent = driver.next_follow_up ? (
                                                                    <span>{formatDate(driver.next_follow_up)}</span>
                                                                ) : '-';
                                                                break;
                                                            case 'last_follow_up':
                                                                cellContent = driver.last_follow_up ? (
                                                                    <span>{formatDate(driver.last_follow_up)}</span>
                                                                ) : '-';
                                                                break;
                                                            case 'lead_stage':
                                                                cellContent = driver.lead_stage?.name || '-';
                                                                break;
                                                            case 'assigned_to':
                                                                if (driver.assigned_to) {
                                                                    cellContent = driver.assigned_to.name;
                                                                } else if (driver.assigned_users && driver.assigned_users.length > 0) {
                                                                    cellContent = (
                                                                        <div className="flex flex-wrap gap-1">
                                                                            {driver.assigned_users.map((user: any) => (
                                                                                <Badge key={user.id} variant="secondary" className="text-xs">
                                                                                    {user.name}
                                                                                </Badge>
                                                                            ))}
                                                                        </div>
                                                                    );
                                                                } else {
                                                                    cellContent = '-';
                                                                }
                                                                break;
                                                            case 'assigned_users':
                                                                cellContent = driver.assigned_users && driver.assigned_users.length > 0 ? (
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {driver.assigned_users.map((user: any) => (
                                                                            <Badge key={user.id} variant="secondary" className="text-xs">
                                                                                {user.name}
                                                                            </Badge>
                                                                        ))}
                                                                    </div>
                                                                ) : '-';
                                                                break;
                                                            case 'last_assigned_time':
                                                                cellContent = (driver as any).last_assigned_time ? formatDate((driver as any).last_assigned_time) : '-';
                                                                break;
                                                            case 'last_assigned_by':
                                                                cellContent = (driver as any).last_assigned_by?.name || '-';
                                                                break;
                                                            case 'notes':
                                                                cellContent = (driver as any).notes ? (
                                                                    <div className="max-w-xs truncate" title={(driver as any).notes}>
                                                                        {(driver as any).notes}
                                                                    </div>
                                                                ) : '-';
                                                                break;
                                                            case 'assigned_time':
                                                                cellContent = (driver as any).assigned_time ? formatDate((driver as any).assigned_time) : '-';
                                                                break;
                                                            case 'uuid':
                                                                cellContent = driver.uuid || '-';
                                                                break;
                                                            case 'created_at':
                                                                cellContent = driver.created_at ? formatDate(driver.created_at) : '-';
                                                                break;
                                                            case 'updated_at':
                                                                cellContent = driver.updated_at ? formatDate(driver.updated_at) : '-';
                                                                break;
                                                            case 'deleted_at':
                                                                cellContent = (driver as any).deleted_at ? formatDate((driver as any).deleted_at) : '-';
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
                            </div>

                        </>
                    ) : (
                        <div className="text-center py-12 text-neutral-500">
                            No leads found
                        </div>
                    )}
                </Card>

                <DeleteDialog
                    open={deleteDialog.open}
                    onOpenChange={(open) => setDeleteDialog({ open, driver: null })}
                    onConfirm={confirmDelete}
                    title="Delete Lead"
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
                    title="Delete Selected Leads"
                    description={`Are you sure you want to delete ${selectedDrivers.size} lead(s)? This action cannot be undone.`}
                />

                {/* Merge Leads Dialog */}
                <Dialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen}>
                    <DialogContent className="!max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
                        <DialogHeader>
                            <DialogTitle>Merge Records In &gt; Leads</DialogTitle>
                            <DialogDescription>
                                The primary record will be retained after the merge. You can select the column to retain the values. The other record(s) will be deleted but the related information will be merged.
                            </DialogDescription>
                        </DialogHeader>
                        
                        {mergeDrivers.length > 0 && (
                            <div className="flex-1 overflow-y-auto">
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse">
                                        <thead className="bg-neutral-100/60 dark:bg-neutral-800/60 backdrop-blur-sm sticky top-0 z-10">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300 border-b">Fields</th>
                                                {mergeDrivers.map((driver, index) => (
                                                    <th key={driver.id} className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300 border-b">
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="radio"
                                                                name="primary_record"
                                                                value={driver.id}
                                                                defaultChecked={index === 0}
                                                                className="w-4 h-4"
                                                            />
                                                            <Link href={`/leads/leads/${driver.id}`} className="text-blue-600 hover:underline" target="_blank">
                                                                Record #{driver.id}
                                                            </Link>
                                                        </div>
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {/* Full Name */}
                                            <tr className="border-b hover:bg-muted/50">
                                                <td className="px-4 py-3 text-sm font-medium">Name</td>
                                                {mergeDrivers.map((driver) => (
                                                    <td key={driver.id} className="px-4 py-3 text-sm">
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="radio"
                                                                name="full_name"
                                                                value={driver.id}
                                                                defaultChecked={mergeDrivers[0].id === driver.id}
                                                                className="w-4 h-4"
                                                            />
                                                            <span>{driver.full_name || '-'}</span>
                                                        </div>
                                                    </td>
                                                ))}
                                            </tr>
                                            
                                            {/* Phone */}
                                            <tr className="border-b hover:bg-muted/50">
                                                <td className="px-4 py-3 text-sm font-medium">Phone</td>
                                                {mergeDrivers.map((driver) => (
                                                    <td key={driver.id} className="px-4 py-3 text-sm">
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="radio"
                                                                name="phone"
                                                                value={driver.id}
                                                                defaultChecked={mergeDrivers[0].id === driver.id}
                                                                className="w-4 h-4"
                                                            />
                                                            <span>{driver.phone || '-'}</span>
                                                        </div>
                                                    </td>
                                                ))}
                                            </tr>
                                            
                                            {/* WhatsApp Phone */}
                                            <tr className="border-b hover:bg-muted/50">
                                                <td className="px-4 py-3 text-sm font-medium">WhatsApp</td>
                                                {mergeDrivers.map((driver) => (
                                                    <td key={driver.id} className="px-4 py-3 text-sm">
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="radio"
                                                                name="whatsapp_phone"
                                                                value={driver.id}
                                                                defaultChecked={mergeDrivers[0].id === driver.id}
                                                                className="w-4 h-4"
                                                            />
                                                            <span>{driver.whatsapp_phone || '-'}</span>
                                                        </div>
                                                    </td>
                                                ))}
                                            </tr>
                                            
                                            {/* Email */}
                                            <tr className="border-b hover:bg-muted/50">
                                                <td className="px-4 py-3 text-sm font-medium">Email</td>
                                                {mergeDrivers.map((driver) => (
                                                    <td key={driver.id} className="px-4 py-3 text-sm">
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="radio"
                                                                name="email"
                                                                value={driver.id}
                                                                defaultChecked={mergeDrivers[0].id === driver.id}
                                                                className="w-4 h-4"
                                                            />
                                                            <span>{driver.email || '-'}</span>
                                                        </div>
                                                    </td>
                                                ))}
                                            </tr>
                                            
                                            {/* Campaign */}
                                            <tr className="border-b hover:bg-muted/50">
                                                <td className="px-4 py-3 text-sm font-medium">Campaign</td>
                                                {mergeDrivers.map((driver) => (
                                                    <td key={driver.id} className="px-4 py-3 text-sm">
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="radio"
                                                                name="campaign_id"
                                                                value={driver.id}
                                                                defaultChecked={mergeDrivers[0].id === driver.id}
                                                                className="w-4 h-4"
                                                            />
                                                            <span>{driver.campaign?.name || '-'}</span>
                                                        </div>
                                                    </td>
                                                ))}
                                            </tr>
                                            
                                            {/* Lead Source */}
                                            <tr className="border-b hover:bg-muted/50">
                                                <td className="px-4 py-3 text-sm font-medium">Lead Source</td>
                                                {mergeDrivers.map((driver) => (
                                                    <td key={driver.id} className="px-4 py-3 text-sm">
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="radio"
                                                                name="lead_source_id"
                                                                value={driver.id}
                                                                defaultChecked={mergeDrivers[0].id === driver.id}
                                                                className="w-4 h-4"
                                                            />
                                                            <span>{driver.lead_source?.name || '-'}</span>
                                                        </div>
                                                    </td>
                                                ))}
                                            </tr>
                                            
                                            {/* Lead Status */}
                                            <tr className="border-b hover:bg-muted/50">
                                                <td className="px-4 py-3 text-sm font-medium">Lead Status</td>
                                                {mergeDrivers.map((driver) => (
                                                    <td key={driver.id} className="px-4 py-3 text-sm">
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="radio"
                                                                name="lead_status_id"
                                                                value={driver.id}
                                                                defaultChecked={mergeDrivers[0].id === driver.id}
                                                                className="w-4 h-4"
                                                            />
                                                            {driver.lead_status ? (
                                                                <Badge style={{ backgroundColor: driver.lead_status.color || '#6b7280' }}>
                                                                    {driver.lead_status.name}
                                                                </Badge>
                                                            ) : (
                                                                <span>-</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                ))}
                                            </tr>
                                            
                                            {/* Lead Stage */}
                                            <tr className="border-b hover:bg-muted/50">
                                                <td className="px-4 py-3 text-sm font-medium">Lead Stage</td>
                                                {mergeDrivers.map((driver) => (
                                                    <td key={driver.id} className="px-4 py-3 text-sm">
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="radio"
                                                                name="lead_stage_id"
                                                                value={driver.id}
                                                                defaultChecked={mergeDrivers[0].id === driver.id}
                                                                className="w-4 h-4"
                                                            />
                                                            <span>{driver.lead_stage?.name || '-'}</span>
                                                        </div>
                                                    </td>
                                                ))}
                                            </tr>
                                            
                                            {/* Assigned To */}
                                            <tr className="border-b hover:bg-muted/50">
                                                <td className="px-4 py-3 text-sm font-medium">Assigned To</td>
                                                {mergeDrivers.map((driver) => (
                                                    <td key={driver.id} className="px-4 py-3 text-sm">
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="radio"
                                                                name="assigned_to"
                                                                value={driver.id}
                                                                defaultChecked={mergeDrivers[0].id === driver.id}
                                                                className="w-4 h-4"
                                                            />
                                                            <span>{driver.assigned_to?.name || '-'}</span>
                                                        </div>
                                                    </td>
                                                ))}
                                            </tr>
                                            
                                            {/* Assigned Users */}
                                            <tr className="border-b hover:bg-muted/50">
                                                <td className="px-4 py-3 text-sm font-medium">Assigned Users</td>
                                                {mergeDrivers.map((driver) => (
                                                    <td key={driver.id} className="px-4 py-3 text-sm">
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="radio"
                                                                name="assigned_users"
                                                                value={driver.id}
                                                                defaultChecked={mergeDrivers[0].id === driver.id}
                                                                className="w-4 h-4"
                                                            />
                                                            <span>
                                                                {driver.assigned_users && driver.assigned_users.length > 0
                                                                    ? driver.assigned_users.map((u: any) => u.name).join(', ')
                                                                    : '-'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                ))}
                                            </tr>
                                            
                                            {/* Lead Status Comment */}
                                            <tr className="border-b hover:bg-muted/50">
                                                <td className="px-4 py-3 text-sm font-medium">Sales Comment</td>
                                                {mergeDrivers.map((driver) => (
                                                    <td key={driver.id} className="px-4 py-3 text-sm">
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="radio"
                                                                name="lead_status_comment"
                                                                value={driver.id}
                                                                defaultChecked={mergeDrivers[0].id === driver.id}
                                                                className="w-4 h-4"
                                                            />
                                                            <span className="max-w-xs truncate" title={driver.lead_status_comment || ''}>
                                                                {driver.lead_status_comment || '-'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                ))}
                                            </tr>
                                            
                                            {/* Next Follow Up */}
                                            <tr className="border-b hover:bg-muted/50">
                                                <td className="px-4 py-3 text-sm font-medium">Next Follow Up</td>
                                                {mergeDrivers.map((driver) => (
                                                    <td key={driver.id} className="px-4 py-3 text-sm">
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="radio"
                                                                name="next_follow_up"
                                                                value={driver.id}
                                                                defaultChecked={mergeDrivers[0].id === driver.id}
                                                                className="w-4 h-4"
                                                            />
                                                            <span>{driver.next_follow_up ? formatDate(driver.next_follow_up) : '-'}</span>
                                                        </div>
                                                    </td>
                                                ))}
                                            </tr>
                                            
                                            {/* Last Follow Up */}
                                            <tr className="border-b hover:bg-muted/50">
                                                <td className="px-4 py-3 text-sm font-medium">Last Follow Up</td>
                                                {mergeDrivers.map((driver) => (
                                                    <td key={driver.id} className="px-4 py-3 text-sm">
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="radio"
                                                                name="last_follow_up"
                                                                value={driver.id}
                                                                defaultChecked={mergeDrivers[0].id === driver.id}
                                                                className="w-4 h-4"
                                                            />
                                                            <span>{driver.last_follow_up ? formatDate(driver.last_follow_up) : '-'}</span>
                                                        </div>
                                                    </td>
                                                ))}
                                            </tr>
                                            
                                            {/* Notes */}
                                            <tr className="border-b hover:bg-muted/50">
                                                <td className="px-4 py-3 text-sm font-medium">Notes</td>
                                                {mergeDrivers.map((driver) => (
                                                    <td key={driver.id} className="px-4 py-3 text-sm">
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="radio"
                                                                name="notes"
                                                                value={driver.id}
                                                                defaultChecked={mergeDrivers[0].id === driver.id}
                                                                className="w-4 h-4"
                                                            />
                                                            <span className="max-w-xs truncate" title={driver.notes || ''}>
                                                                {driver.notes || '-'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                ))}
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                
                                <div className="mt-6 flex justify-end gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setMergeDialogOpen(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={async () => {
                                            // Get selected values
                                            const primaryRecordInput = document.querySelector('input[name="primary_record"]:checked') as HTMLInputElement;
                                            const primaryRecordId = primaryRecordInput ? parseInt(primaryRecordInput.value) : mergeDrivers[0].id;
                                            
                                            const fieldMappings: { [key: string]: string } = {};
                                            const fieldNames = [
                                                'full_name', 'phone', 'whatsapp_phone', 'email', 
                                                'campaign_id', 'lead_source_id', 'lead_status_id', 'lead_stage_id',
                                                'assigned_to', 'assigned_users', 'lead_status_comment', 
                                                'next_follow_up', 'last_follow_up', 'notes'
                                            ];
                                            
                                            fieldNames.forEach(fieldName => {
                                                const selectedInput = document.querySelector(`input[name="${fieldName}"]:checked`) as HTMLInputElement;
                                                if (selectedInput) {
                                                    const selectedDriverId = parseInt(selectedInput.value);
                                                    const selectedDriver = mergeDrivers.find(d => d.id === selectedDriverId);
                                                    if (selectedDriver) {
                                                        if (fieldName === 'campaign_id') {
                                                            fieldMappings[fieldName] = selectedDriver.campaign?.id?.toString() || '';
                                                        } else if (fieldName === 'lead_source_id') {
                                                            fieldMappings[fieldName] = selectedDriver.lead_source?.id?.toString() || '';
                                                        } else if (fieldName === 'lead_status_id') {
                                                            fieldMappings[fieldName] = selectedDriver.lead_status?.id?.toString() || '';
                                                        } else if (fieldName === 'lead_stage_id') {
                                                            fieldMappings[fieldName] = selectedDriver.lead_stage?.id?.toString() || '';
                                                        } else if (fieldName === 'assigned_to') {
                                                            fieldMappings[fieldName] = selectedDriver.assigned_to?.id?.toString() || '';
                                                        } else if (fieldName === 'assigned_users') {
                                                            // Store the selected driver ID, we'll handle it in backend
                                                            fieldMappings[fieldName] = selectedDriverId.toString();
                                                        } else {
                                                            fieldMappings[fieldName] = (selectedDriver as any)[fieldName] || '';
                                                        }
                                                    }
                                                }
                                            });
                                            
                                            const driverIds = mergeDrivers.map(d => d.id);
                                            
                                            try {
                                                await router.post('/leads/leads/merge', {
                                                    primary_driver_id: primaryRecordId,
                                                    driver_ids: driverIds,
                                                    field_mappings: fieldMappings,
                                                }, {
                                                    onSuccess: () => {
                                                        setMergeDialogOpen(false);
                                                        setSelectedDrivers(new Set());
                                                        setMergeDrivers([]);
                                                    },
                                                    onError: (errors) => {
                                                        console.error('Merge error:', errors);
                                                        alert('Failed to merge leads. Please try again.');
                                                    },
                                                });
                                            } catch (error) {
                                                console.error('Merge error:', error);
                                                alert('Failed to merge leads. Please try again.');
                                            }
                                        }}
                                    >
                                        Merge
                                    </Button>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                <ImportModal
                    open={importModalOpen}
                    onOpenChange={setImportModalOpen}
                    importStoreUrl="/leads/leads/import"
                    availableFields={availableFields}
                    entityName="Leads"
                />

                {/* View Details Dialog */}
                <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
                    <DialogContent 
                        className="!max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
                        overlayClassName="bg-black/40"
                    >
                        <DialogHeader>
                            <DialogTitle>{viewingDriver?.full_name || 'Lead Details'}</DialogTitle>
                            <DialogDescription>
                                Lead Details & Onboarding Progress
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
                                        <button
                                            onClick={() => setViewDialogTab('followups')}
                                            className={`border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                                                viewDialogTab === 'followups'
                                                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                                                    : 'border-transparent text-neutral-600 hover:border-neutral-300 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
                                            }`}
                                        >
                                            Follow-ups ({driverFollowUps.length})
                                        </button>
                                        {driverDetails?.duplicate > 0 && (
                                            <button
                                                onClick={() => setViewDialogTab('duplicates')}
                                                className={`border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                                                    viewDialogTab === 'duplicates'
                                                        ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                                                        : 'border-transparent text-neutral-600 hover:border-neutral-300 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
                                                }`}
                                            >
                                                Duplicates ({driverDetails.duplicate})
                                            </button>
                                        )}
                                    </nav>
                                </div>

                                {/* Tab Content */}
                                <>
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
                                                    {driverDetails.city && (
                                                        <div className="flex items-start gap-2">
                                                            <MapPin className="mt-0.5 h-4 w-4 text-neutral-500" />
                                                            <div className="flex-1">
                                                                <p className="text-sm text-neutral-500">City</p>
                                                                <p className="font-medium">{driverDetails.city}</p>
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
                                                    {driverDetails.campaign && (
                                                        <div>
                                                            <p className="text-sm text-neutral-500">Campaign</p>
                                                            <p className="font-medium">{driverDetails.campaign.name}</p>
                                                        </div>
                                                    )}
                                                        <div>
                                                            <p className="text-sm text-neutral-500">Lead Source</p>
                                                        <p className="font-medium">
                                                            {driverDetails.lead_source?.name || <span className="text-neutral-400 italic">Not Set</span>}
                                                        </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm text-neutral-500">Lead Status</p>
                                                        {driverDetails.lead_status ? (
                                                            <Badge
                                                                variant="outline"
                                                                style={{
                                                                    borderColor: driverDetails.lead_status.color || 'gray',
                                                                    color: driverDetails.lead_status.color || 'gray',
                                                                }}
                                                            >
                                                                {driverDetails.lead_status.name}
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-neutral-400 italic">Not Set</span>
                                                    )}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-neutral-500">Feedback Comment</p>
                                                        {driverDetails.lead_status_comment ? (
                                                            <p className="font-medium whitespace-pre-wrap">{driverDetails.lead_status_comment}</p>
                                                        ) : (
                                                            <span className="text-neutral-400 italic">Not Set</span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-neutral-500">Next Follow-up</p>
                                                        {driverDetails.next_follow_up ? (
                                                            <p className="font-medium">{formatDate(driverDetails.next_follow_up)}</p>
                                                        ) : (
                                                            <span className="text-neutral-400 italic">Not Set</span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-neutral-500">Last Follow-up</p>
                                                        {driverDetails.last_follow_up ? (
                                                            <p className="font-medium">{formatDate(driverDetails.last_follow_up)}</p>
                                                        ) : (
                                                            <span className="text-neutral-400 italic">Not Set</span>
                                                        )}
                                                    </div>
                                                    {driverDetails.city && (
                                                        <div>
                                                            <p className="text-sm text-neutral-500">City</p>
                                                            <p className="font-medium">{driverDetails.city}</p>
                                                        </div>
                                                    )}
                                                    {driverDetails.assigned_to && (
                                                        <div>
                                                            <p className="text-sm text-neutral-500">Assigned To</p>
                                                            <p className="font-medium">{driverDetails.assigned_to.name}</p>
                                                        </div>
                                                    )}
                                                    {driverDetails.assigned_users && driverDetails.assigned_users.length > 0 && (
                                                        <div>
                                                            <p className="text-sm text-neutral-500">Assigned Users</p>
                                                            <div className="flex flex-wrap gap-2 mt-1">
                                                                {driverDetails.assigned_users.map((user: any) => (
                                                                    <Badge key={user.id} variant="secondary">
                                                                        {user.name}
                                                                    </Badge>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </Card>
                                        </div>

                                        {/* Documents */}
                                        <Card className="p-6">
                                            <div className="mb-4 flex items-center justify-between">
                                                <h2 className="text-lg font-semibold">Documents</h2>
                                                <Link href={`/leads/lead-documents?driver_id=${driverDetails.id}`}>
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
                                                                                    ref={(el) => {
                                                                                        if (el) {
                                                                                            fileInputRefs.current[doc.id] = el;
                                                                                        }
                                                                                    }}
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
                                                                        {canUploadDocument() && (
                                                                            <>
                                                                                <input
                                                                                    ref={(el) => {
                                                                                        if (el) {
                                                                                            fileInputRefs.current[doc.id] = el;
                                                                                        }
                                                                                    }}
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
                                                                        {getStatusBadge(doc.status)}
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

                                    {viewDialogTab === 'followups' && (
                                        <Card className="p-6">
                                            <h2 className="mb-4 text-lg font-semibold">Follow-ups</h2>
                                            {driverFollowUps.length > 0 ? (
                                                <div className="overflow-x-auto">
                                                    <table className="w-full">
                                                        <thead className="bg-neutral-100/60 dark:bg-neutral-800/60 backdrop-blur-sm">
                                                            <tr>
                                                                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">Created Time</th>
                                                                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">User Name</th>
                                                                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">Reseller</th>
                                                                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">Lead Stage</th>
                                                                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">Lead Status</th>
                                                                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">Feedback Comment</th>
                                                                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">Notes</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {driverFollowUps.map((followUp, index) => (
                                                                <tr 
                                                                    key={followUp.id} 
                                                                    className={`
                                                                        border-t transition-colors duration-150
                                                                        ${
                                                                            index === 0
                                                                                ? 'bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100/70 dark:hover:bg-blue-950/40'
                                                                                : index % 2 === 0
                                                                                  ? 'bg-white dark:bg-neutral-950 hover:bg-neutral-50 dark:hover:bg-neutral-900/50'
                                                                                  : 'bg-neutral-50/80 dark:bg-neutral-900/30 hover:bg-neutral-100 dark:hover:bg-neutral-900/60'
                                                                        }
                                                                    `}
                                                                >
                                                                    <td className="px-4 py-3 text-sm">
                                                                        {followUp.created_time ? formatDate(followUp.created_time) : 'N/A'}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-sm">
                                                                        {followUp.user_name || 'N/A'}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-sm">
                                                                        {followUp.lead_stage || 'N/A'}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-sm">
                                                                        {followUp.lead_status || 'N/A'}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-sm">
                                                                        {followUp.lead_status_comment ? (
                                                                            <div className="max-w-xs truncate" title={followUp.lead_status_comment}>
                                                                                {followUp.lead_status_comment}
                                                                            </div>
                                                                        ) : 'N/A'}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-sm">
                                                                        {followUp.notes ? (
                                                                            <div className="max-w-xs truncate" title={followUp.notes}>
                                                                                {followUp.notes}
                                                                            </div>
                                                                        ) : 'N/A'}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <div className="py-8 text-center text-neutral-500">
                                                    No follow-ups found for this lead.
                                                </div>
                                            )}
                                        </Card>
                                    )}

                                        {viewDialogTab === 'duplicates' && driverDetails?.duplicate > 0 && (
                                        <Card className="p-6">
                                            <h2 className="mb-4 text-lg font-semibold">Duplicate Leads ({driverDetails.duplicate})</h2>
                                            <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">
                                                Leads with the same phone number or WhatsApp number as this lead.
                                            </p>
                                            {driverDuplicateDrivers.length > 0 ? (
                                                <div className="overflow-x-auto">
                                                    <table className="w-full">
                                                        <thead className="bg-neutral-100/60 dark:bg-neutral-800/60 backdrop-blur-sm">
                                                            <tr>
                                                                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">Full Name</th>
                                                                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">Phone</th>
                                                                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">WhatsApp</th>
                                                                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">Email</th>
                                                                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">Campaign</th>
                                                                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">Lead Source</th>
                                                                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">Lead Status</th>
                                                                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">Lead Stage</th>
                                                                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">Assigned To</th>
                                                                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">Actions</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {driverDuplicateDrivers.map((dup, index) => (
                                                                <tr 
                                                                    key={dup.id} 
                                                                    className={`
                                                                        border-t transition-colors duration-150 cursor-pointer
                                                                        ${
                                                                            index === 0
                                                                                ? 'bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100/70 dark:hover:bg-blue-950/40'
                                                                                : index % 2 === 0
                                                                                  ? 'bg-white dark:bg-neutral-950 hover:bg-neutral-50 dark:hover:bg-neutral-900/50'
                                                                                  : 'bg-neutral-50/80 dark:bg-neutral-900/30 hover:bg-neutral-100 dark:hover:bg-neutral-900/60'
                                                                        }
                                                                    `} 
                                                                    onClick={() => {
                                                                    setViewDialogOpen(false);
                                                                    router.visit(`/leads/leads/${dup.id}`);
                                                                }}>
                                                                    <td className="px-4 py-3 text-sm">{dup.full_name || '-'}</td>
                                                                    <td className="px-4 py-3 text-sm">{dup.phone || '-'}</td>
                                                                    <td className="px-4 py-3 text-sm">{dup.whatsapp_phone || '-'}</td>
                                                                    <td className="px-4 py-3 text-sm">{dup.email || '-'}</td>
                                                                    <td className="px-4 py-3 text-sm">{dup.campaign?.name || '-'}</td>
                                                                    <td className="px-4 py-3 text-sm">{dup.lead_source?.name || '-'}</td>
                                                                    <td className="px-4 py-3 text-sm">
                                                                        {dup.lead_status ? (
                                                                            <Badge style={{ backgroundColor: dup.lead_status.color || '#6b7280' }}>
                                                                                {dup.lead_status.name}
                                                                            </Badge>
                                                                        ) : '-'}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-sm">{dup.lead_stage?.name || '-'}</td>
                                                                    <td className="px-4 py-3 text-sm">
                                                                        {dup.assigned_to?.name || (dup.assigned_users && dup.assigned_users.length > 0 ? dup.assigned_users.map((u: any) => u.name).join(', ') : '-')}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-sm" onClick={(e) => e.stopPropagation()}>
                                                                        <button
                                                                            onClick={() => {
                                                                                setViewDialogOpen(false);
                                                                                router.visit(`/leads/leads/${dup.id}`);
                                                                            }}
                                                                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                                                            title="View Details"
                                                                        >
                                                                            <Eye className="h-4 w-4" />
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <p className="text-neutral-500 dark:text-neutral-400">No duplicate leads found.</p>
                                            )}
                                        </Card>
                                    )}
                                </>
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
                    
                    {/* WhatsApp Window - Side Panel */}
                    {whatsAppRidingCompanyId && whatsappWindowOpen && !whatsappFloating && (
                        <div 
                            className="flex-shrink-0 h-[calc(100vh-8rem)] border-l border-neutral-200 dark:border-neutral-700 relative group"
                            style={{ width: `${whatsappWindowWidth}px`, minWidth: '300px', maxWidth: '80vw' }}
                        >
                            {/* Resize Handle - Left Side */}
                            <div
                                className="absolute left-0 top-0 bottom-0 w-1 bg-transparent hover:bg-blue-500 cursor-col-resize z-10 transition-colors"
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const startX = e.clientX;
                                    const startWidth = whatsappWindowWidth;
                                    
                                    const handleMouseMove = (moveEvent: MouseEvent) => {
                                        const diff = startX - moveEvent.clientX; // Inverted because we're resizing from left
                                        const newWidth = Math.max(300, Math.min(window.innerWidth * 0.8, startWidth + diff));
                                        setWhatsappWindowWidth(newWidth);
                                    };
                                    
                                    const handleMouseUp = () => {
                                        document.removeEventListener('mousemove', handleMouseMove);
                                        document.removeEventListener('mouseup', handleMouseUp);
                                        document.body.style.cursor = '';
                                        document.body.style.userSelect = '';
                                    };
                                    
                                    document.addEventListener('mousemove', handleMouseMove);
                                    document.addEventListener('mouseup', handleMouseUp);
                                    document.body.style.cursor = 'col-resize';
                                    document.body.style.userSelect = 'none';
                                }}
                                title="Drag to resize"
                            />
                            <WhatsAppWindow
                                ridingCompanyId={whatsAppRidingCompanyId}
                                driverPhoneNumbers={userDriverPhoneNumbers}
                                drivers={drivers
                                    .filter(d => {
                                        // Only include drivers that have phone or whatsapp_phone
                                        const hasPhone = d.phone && d.phone.trim().length >= 5 && d.phone.trim() !== '0' && /\d{5,}/.test(d.phone.trim());
                                        const hasWhatsapp = d.whatsapp_phone && d.whatsapp_phone.trim().length >= 5 && d.whatsapp_phone.trim() !== '0' && /\d{5,}/.test(d.whatsapp_phone.trim());
                                        return hasPhone || hasWhatsapp;
                                    })
                                    .map(d => ({ id: d.id, name: d.full_name, phone: d.phone, whatsapp_phone: d.whatsapp_phone }))}
                                isOpen={whatsappWindowOpen}
                                onClose={() => {
                                    setWhatsappWindowOpen(false);
                                    setSelectedDriverForWhatsApp(null);
                                }}
                                initialChatPhone={selectedDriverForWhatsApp || undefined}
                                isFloating={whatsappFloating}
                                onToggleFloating={() => setWhatsappFloating(!whatsappFloating)}
                            />
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
        
        {/* WhatsApp Window - Floating */}
        {whatsAppRidingCompanyId && whatsappWindowOpen && whatsappFloating && (
            <WhatsAppWindow
                ridingCompanyId={whatsAppRidingCompanyId}
                driverPhoneNumbers={userDriverPhoneNumbers}
                drivers={drivers
                    .filter(d => {
                        // Only include drivers that have phone or whatsapp_phone
                        const hasPhone = d.phone && d.phone.trim().length >= 5 && d.phone.trim() !== '0' && /\d{5,}/.test(d.phone.trim());
                        const hasWhatsapp = d.whatsapp_phone && d.whatsapp_phone.trim().length >= 5 && d.whatsapp_phone.trim() !== '0' && /\d{5,}/.test(d.whatsapp_phone.trim());
                        return hasPhone || hasWhatsapp;
                    })
                    .map(d => ({ id: d.id, name: d.full_name, phone: d.phone, whatsapp_phone: d.whatsapp_phone }))}
                isOpen={whatsappWindowOpen}
                onClose={() => {
                    setWhatsappWindowOpen(false);
                    setSelectedDriverForWhatsApp(null);
                    setWhatsappFloating(false);
                }}
                initialChatPhone={selectedDriverForWhatsApp || undefined}
                isFloating={whatsappFloating}
                onToggleFloating={() => setWhatsappFloating(!whatsappFloating)}
            />
        )}
        </>
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
        campaign_id: driver.campaign?.id ? String(driver.campaign.id) : '',
        lead_source_id: driver.lead_source?.id ? String(driver.lead_source.id) : '',
        assigned_to: driver.assigned_to?.id ? String(driver.assigned_to.id) : '',
        assigned_users: (driver.assigned_users && Array.isArray(driver.assigned_users) && driver.assigned_users.length > 0) 
            ? driver.assigned_users.map((u) => typeof u === 'object' ? u.id : u) 
            : [],
        lead_status_id: driver.lead_status?.id ? String(driver.lead_status.id) : '',
        lead_status_comment: driver.lead_status_comment || '',
        next_follow_up: driver.next_follow_up || '',
        last_follow_up: driver.last_follow_up || '',
        lead_stage_id: driver.lead_stage?.id ? String(driver.lead_stage.id) : '',
        notes: driver.notes || '',
    });

    // Transform data before submitting - convert empty strings to null
    transform((data) => {
        const transformed: any = {
            full_name: data.full_name || '',
            phone: data.phone || '',
            whatsapp_phone: data.whatsapp_phone || null,
            email: data.email || null,
            campaign_id: data.campaign_id ? Number(data.campaign_id) : null,
            lead_source_id: data.lead_source_id ? Number(data.lead_source_id) : null,
            assigned_to: data.assigned_to ? Number(data.assigned_to) : null,
            assigned_users: data.assigned_users && Array.isArray(data.assigned_users) && data.assigned_users.length > 0 
                ? data.assigned_users.map((id: any) => Number(id)) 
                : null,
            lead_status_id: data.lead_status_id ? Number(data.lead_status_id) : null,
            lead_status_comment: data.lead_status_comment || null,
            next_follow_up: data.next_follow_up || null,
            lead_stage_id: data.lead_stage_id ? Number(data.lead_stage_id) : null,
            notes: data.notes || null,
        };
        
        // Add company_id only for super admin
        if (isSuperAdmin && data.company_id) {
            transformed.company_id = Number(data.company_id);
        }
        
        return transformed;
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(`/leads/leads/${driver.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                onOpenChange(false);
                router.reload({ only: ['drivers', 'filterOptions', 'importAvailableFields'] });
            },
            onError: (errors) => {
                console.error('Error updating driver:', errors);
                // Show error message to user
                if (errors && typeof errors === 'object') {
                    const errorMessages = Object.values(errors).flat();
                    alert('Error saving lead: ' + errorMessages.join(', '));
                } else {
                    alert('Error saving lead. Please try again.');
                }
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="!max-w-6xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Quick Edit Lead</DialogTitle>
                    <DialogDescription>
                        Edit lead details: {driver.full_name}
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
                        {/* Lead Status Group with Green Border */}
                        <div className="col-span-2 rounded-lg border-2 border-green-500 dark:border-green-600 bg-green-100/50 dark:bg-green-900/30 p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-bold mb-1 text-green-700 dark:text-green-300">Lead Status</label>
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
                                <label className="block text-sm font-bold mb-1 text-green-700 dark:text-green-300">Feedback Comment</label>
                                <textarea
                                    value={data.lead_status_comment}
                                    onChange={(e) => setData('lead_status_comment', e.target.value)}
                                    rows={3}
                                    className={`w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y ${errors.lead_status_comment ? 'border-red-500' : ''}`}
                                    placeholder="Enter lead status comment..."
                                />
                                {errors.lead_status_comment && (
                                    <p className="text-sm text-red-500 mt-1">{errors.lead_status_comment}</p>
                                )}
                            </div>
                            <div 
                                className="cursor-pointer relative"
                                onClick={(e) => {
                                    const dateInput = document.getElementById('quick-edit-next-follow-up') as HTMLInputElement;
                                    if (dateInput && e.target !== dateInput && !(e.target as HTMLElement).closest('.date-display-overlay')) {
                                        dateInput.showPicker?.() || dateInput.focus();
                                    }
                                }}
                            >
                                <label 
                                    className="block text-sm font-bold mb-1 text-green-700 dark:text-green-300 cursor-pointer"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const dateInput = document.getElementById('quick-edit-next-follow-up') as HTMLInputElement;
                                        if (dateInput) {
                                            dateInput.showPicker?.() || dateInput.focus();
                                        }
                                    }}
                                >
                                    Next Follow-up
                                </label>
                                <div className="flex gap-2">
                                    <div className="flex-1 relative">
                                        <Input
                                            type="date"
                                            id="quick-edit-next-follow-up"
                                            value={data.next_follow_up ? new Date(data.next_follow_up).toISOString().split('T')[0] : ''}
                                            onChange={(e) => {
                                                const selectedDate = e.target.value;
                                                const today = new Date().toISOString().split('T')[0];
                                                if (selectedDate && selectedDate < today) {
                                                    alert('Next Follow-up date must be today or a future date.');
                                                    return;
                                                }
                                                const existingTime = data.next_follow_up ? new Date(data.next_follow_up).toTimeString().slice(0, 5) : '00:00';
                                                const datetime = `${selectedDate}T${existingTime}`;
                                                setData('next_follow_up', datetime);
                                            }}
                                            min={new Date().toISOString().split('T')[0]}
                                            className={`${errors.next_follow_up ? 'border-red-500' : ''} cursor-pointer`}
                                        />
                                    </div>
                                    <div className="w-32">
                                        <Input
                                            type="time"
                                            value={data.next_follow_up ? new Date(data.next_follow_up).toTimeString().slice(0, 5) : ''}
                                            onChange={(e) => {
                                                const time = e.target.value;
                                                const date = data.next_follow_up ? new Date(data.next_follow_up).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
                                                const datetime = `${date}T${time}`;
                                                setData('next_follow_up', datetime);
                                            }}
                                            className={errors.next_follow_up ? 'border-red-500' : ''}
                                        />
                                    </div>
                                </div>
                                {errors.next_follow_up && (
                                    <p className="text-sm text-red-500 mt-1">{errors.next_follow_up}</p>
                                )}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Last Follow-up</label>
                            <Input
                                type="date"
                                value={data.last_follow_up}
                                disabled
                                className="bg-neutral-100 dark:bg-neutral-800 cursor-not-allowed"
                            />
                            <p className="text-xs text-neutral-500 mt-1">Read-only: Automatically updated</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Lead Stage</label>
                            <Select
                                value={data.lead_stage_id}
                                onValueChange={(value) => setData('lead_stage_id', value)}
                                disabled={loadingLeadStages}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={
                                        loadingLeadStages
                                            ? 'Loading...'
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
                        <div className="col-span-2">
                            <label className="block text-sm font-medium mb-1">Assigned To</label>
                            <Select
                                value={data.assigned_to ? String(data.assigned_to) : ''}
                                onValueChange={(value) => {
                                    setData('assigned_to', value ? Number(value) : null);
                                    setData('assigned_users', value ? [Number(value)] : []);
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select user..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__none__">-- None --</SelectItem>
                                    {filterOptions.users?.filter(user => user && user.id != null && user.id !== undefined && String(user.id).trim() !== '').map((user) => {
                                        const userId = String(user.id);
                                        if (!userId || userId.trim() === '') return null;
                                        return (
                                            <SelectItem key={user.id} value={userId}>
                                                {user.name}
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                            {errors.assigned_to && (
                                <p className="text-sm text-red-500 mt-1">{errors.assigned_to}</p>
                            )}
                            {errors.assigned_users && (
                                <p className="text-sm text-red-500 mt-1">{errors.assigned_users}</p>
                            )}
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium mb-1">Notes</label>
                            <textarea
                                value={data.notes}
                                onChange={(e) => setData('notes', e.target.value)}
                                rows={4}
                                className={`w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y ${errors.notes ? 'border-red-500' : ''}`}
                                placeholder="Enter notes..."
                            />
                            {errors.notes && (
                                <p className="text-sm text-red-500 mt-1">{errors.notes}</p>
                            )}
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

