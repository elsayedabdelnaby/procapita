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
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router, usePage, useForm } from '@inertiajs/react';
import { Search, X, Pencil, Check, Eye, Phone, MessageCircle, ArrowUp, ArrowDown, User, Mail, CheckCircle2, FileText, Activity, Settings2, GripVertical, ChevronLeft, ChevronRight, ChevronDown, Upload, Edit, Users, UserPlus, Calendar, AlertCircle, Plus, MapPin, Car } from 'lucide-react';
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { type SharedData } from '@/types';
import axios from 'axios';
import { formatDate } from '@/utils/date-format';
import { EGYPT_GOVERNORATES } from '@/constants/egypt-governorates';
import { WhatsAppWindow } from '@/components/whatsapp/whatsapp-window';
import { useFieldPermissions } from '@/hooks/use-field-permissions';

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
    team_leader?: User;
    account_manager?: User;
    assigned_users?: User[];
    resigned_leads?: string;
    lead_status?: LeadStatus;
    lead_status_comment?: string;
    cancel_reason?: string;
    next_follow_up?: string;
    last_follow_up?: string;
    lead_stage?: LeadStage;
    driver_stage?: {
        id: number;
        name: string;
    };
    created_at: string;
    updated_at: string;
    duplicate?: number;
    documents?: Record<string, {
        id: number;
        name: string;
        status: string;
        uploaded_path?: string;
        original_filename?: string;
    }>;
}

interface FilterOption {
    id: number;
    name: string;
}

interface DriverList {
    id: number;
    name: string;
    is_default?: boolean;
    is_shared?: boolean;
    created_by?: number;
    creator_name?: string;
    all_conditions?: Array<{
        field: string;
        operator: string;
        value: any;
    }>;
    any_conditions?: Array<{
        field: string;
        operator: string;
        value: any;
    }>;
}

interface DriversIndexProps {
    drivers: Driver[];
    lists?: DriverList[];
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
    allDocumentNames?: string[];
    documentsByRidingCompany?: Record<number, string[]>;
    allDocumentRequirements?: Array<{
        id: number;
        name: string;
        riding_company_id: number;
        active: boolean;
    }>;
}

// Define all available columns outside component to avoid hoisting issues
const ALL_DRIVER_COLUMNS = [
    { id: 'actions', label: 'Actions', defaultVisible: true, defaultOrder: 0 },
    { id: 'driver_num', label: 'Driver Num', defaultVisible: false, defaultOrder: 0.5 },
    { id: 'duplicate', label: 'Duplicate Count', defaultVisible: false, defaultOrder: 0.6 },
    { id: 'name', label: 'Name', defaultVisible: true, defaultOrder: 1 },
    { id: 'phone', label: 'Phone', defaultVisible: true, defaultOrder: 2 },
    { id: 'whatsapp', label: 'WhatsApp', defaultVisible: true, defaultOrder: 3 },
    { id: 'email', label: 'Email', defaultVisible: true, defaultOrder: 4 },
    { id: 'riding_company', label: 'Riding Company', defaultVisible: true, defaultOrder: 5 },
    { id: 'campaign', label: 'Campaign', defaultVisible: true, defaultOrder: 6 },
    { id: 'lead_source', label: 'Lead Source', defaultVisible: true, defaultOrder: 7 },
    { id: 'lead_status', label: 'Lead Status', defaultVisible: true, defaultOrder: 8 },
    { id: 'lead_status_comment', label: 'Feedback Comment', defaultVisible: false, defaultOrder: 8.5 },
    { id: 'next_follow_up', label: 'Next Follow-up', defaultVisible: false, defaultOrder: 8.6 },
    { id: 'last_follow_up', label: 'Last Follow-up', defaultVisible: false, defaultOrder: 8.7 },
    { id: 'assigned_to', label: 'Assigned To', defaultVisible: true, defaultOrder: 8.75 },
    { id: 'team_leader', label: 'Team Leader', defaultVisible: true, defaultOrder: 8.8 },
    { id: 'account_manager', label: 'Account Manager', defaultVisible: true, defaultOrder: 8.85 },
    { id: 'resigned_leads', label: 'Resigned Leads', defaultVisible: true, defaultOrder: 8.9 },
    { id: 'lead_stage', label: 'Lead Stage', defaultVisible: true, defaultOrder: 9 },
    { id: 'driver_stage', label: 'Driver Stage', defaultVisible: true, defaultOrder: 9.2 },
    { id: 'current_stage', label: 'Current Stage', defaultVisible: false, defaultOrder: 9.5 },
    { id: 'last_assigned_date', label: 'Last Assigned Date', defaultVisible: false, defaultOrder: 10.55 },
    { id: 'last_assigned_by', label: 'Last Assigned By', defaultVisible: false, defaultOrder: 10.6 },
    { id: 'notes', label: 'Notes', defaultVisible: false, defaultOrder: 10.7 },
    { id: 'cancel_reason', label: 'Cancel Reasons', defaultVisible: false, defaultOrder: 10.8 },
    { id: 'vehicle_type', label: 'Vehicle Type', defaultVisible: false, defaultOrder: 10.9 },
    { id: 'car_or_scooter', label: 'Car or Scooter', defaultVisible: false, defaultOrder: 10.92 },
    { id: 'vehicle_type_and_year', label: 'Vehicle Type and Year', defaultVisible: false, defaultOrder: 10.91 },
    { id: 'has_worked_before', label: 'Has the driver worked before?', defaultVisible: false, defaultOrder: 11.0 },
    { id: 'worked_with_us_before', label: 'Worked With Us Before', defaultVisible: false, defaultOrder: 11.01 },
    { id: 'city', label: 'City', defaultVisible: false, defaultOrder: 11.1 },
    { id: 'feedback_count', label: 'Feedback Count', defaultVisible: false, defaultOrder: 11.3 },
    { id: 'uuid', label: 'UUID', defaultVisible: false, defaultOrder: 12 },
    { id: 'created_at', label: 'Created At', defaultVisible: true, defaultOrder: 13 },
    { id: 'updated_at', label: 'Updated At', defaultVisible: true, defaultOrder: 14 },
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

// Custom Dropdown Component for Filters
function FilterDropdown({ 
    options, 
    value, 
    displayValue, 
    onSelect, 
    onClear,
    hasActiveFilter 
}: { 
    options: any[]; 
    value: string | number | null | 'is_empty'; 
    displayValue: string; 
    onSelect: (value: number | string | 'is_empty') => void; 
    onClear: () => void;
    hasActiveFilter: boolean;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
                triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);
    
    return (
        <div className="relative w-full">
            <button
                ref={triggerRef}
                onClick={() => setIsOpen(!isOpen)}
                className="w-full text-[10px] h-6 px-1.5 pr-6 bg-neutral-100 dark:bg-neutral-800/50 rounded-md flex items-center justify-between text-left"
            >
                <span className="truncate">{displayValue || 'Select...'}</span>
                <ChevronDown className={`h-3 w-3 opacity-50 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div
                    ref={dropdownRef}
                    className="absolute top-full left-0 right-0 z-50 max-h-[200px] overflow-y-auto bg-popover text-popover-foreground border border-t-0 rounded-b-md rounded-t-none shadow-md"
                    style={{ marginTop: 0 }}
                >
                    <div 
                        onClick={() => {
                            onClear();
                            setIsOpen(false);
                        }}
                        className="text-[10px] px-2 py-1.5 cursor-pointer hover:bg-accent"
                    >
                        -- All --
                    </div>
                    {options.map((option: any) => (
                        <div 
                            key={option.id} 
                            onClick={() => {
                                // Support both number and string IDs
                                const optionId = typeof option.id === 'string' ? option.id : Number(option.id);
                                onSelect(optionId);
                                setIsOpen(false);
                            }}
                            className="text-[10px] px-2 py-1.5 cursor-pointer hover:bg-accent"
                        >
                            {option.name}
                        </div>
                    ))}
                </div>
            )}
            {hasActiveFilter && (
                <button
                    onClick={onClear}
                    className="absolute right-6 top-1/2 -translate-y-1/2 text-red-500 hover:text-red-700 z-10"
                    title="Clear filter"
                >
                    <X className="h-2.5 w-2.5" />
                </button>
            )}
        </div>
    );
}

export default function DriversIndex({ drivers = [], lists = [], importAvailableFields, filterOptions = {}, allDocumentNames = [], documentsByRidingCompany = {}, allDocumentRequirements = [] }: DriversIndexProps) {
    // Field permissions hook
    const { canViewDriverField } = useFieldPermissions();
    const page = usePage<SharedData>();
    
    // Removed debug logs to prevent console spam
    
    // Local state for optimistic updates
    const [localDrivers, setLocalDrivers] = useState<Driver[]>(drivers);
    const [selectedListId, setSelectedListId] = useState<number | null>(null);
    const [showMoreLists, setShowMoreLists] = useState<boolean>(false);
    const moreListsRef = useRef<HTMLDivElement>(null);
    const tableScrollRef = useRef<HTMLDivElement>(null);
    
    // Sync local drivers with props when they change
    useEffect(() => {
        setLocalDrivers(drivers);
    }, [drivers]);

    // Keep scrollbar always visible
    useEffect(() => {
        if (tableScrollRef.current) {
            const element = tableScrollRef.current;
            // Force scrollbar to be visible by ensuring overflow
            const ensureScrollbarVisible = () => {
                if (element.scrollWidth > element.clientWidth || element.scrollHeight > element.clientHeight) {
                    element.style.overflowX = 'scroll';
                    element.style.overflowY = 'scroll';
                }
            };
            ensureScrollbarVisible();
            // Recheck on resize
            const resizeObserver = new ResizeObserver(ensureScrollbarVisible);
            resizeObserver.observe(element);
            return () => resizeObserver.disconnect();
        }
    }, [localDrivers]);
    
    // Auto-refresh data periodically and on window focus
    useEffect(() => {
        let intervalId: NodeJS.Timeout | null = null;
        
        const refreshData = () => {
            // Reload drivers and related data
            router.reload({ 
                only: ['drivers', 'filterOptions', 'allDocumentNames', 'documentsByRidingCompany', 'allDocumentRequirements'], 
                preserveState: true, 
                preserveScroll: true 
            });
        };
        
        const handleFocus = () => {
            // Reload data when window gains focus
            refreshData();
        };
        
        const handleVisibilityChange = () => {
            // Reload data when tab becomes visible
            if (!document.hidden) {
                refreshData();
            }
        };
        
        // Set up polling: refresh every 30 seconds
        intervalId = setInterval(refreshData, 30000);
        
        // Listen to window focus events
        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    // Track if we've already loaded data to avoid reloading on initial mount
    const hasLoadedRef = useRef(false);
    
    // Reload data when page becomes visible (after navigation from other modules)
    useEffect(() => {
        // Only reload if we've already loaded once (i.e., returning to this page)
        if (hasLoadedRef.current) {
            const reloadOnReturn = () => {
                router.reload({ 
                    only: ['drivers', 'filterOptions'],
                    preserveState: true,
                    preserveScroll: true
                });
            };

            // Small delay to ensure navigation is complete
            const timeoutId = setTimeout(reloadOnReturn, 300);
            
            return () => {
                clearTimeout(timeoutId);
            };
        } else {
            // Mark as loaded on first mount
            hasLoadedRef.current = true;
        }
    }, []);
    
    // Close more lists when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (moreListsRef.current && !moreListsRef.current.contains(event.target as Node)) {
                setShowMoreLists(false);
            }
        };
        
        if (showMoreLists) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showMoreLists]);
    
    // Clear selected drivers when list changes
    useEffect(() => {
        setSelectedDrivers(new Set());
    }, [selectedListId]);

    // Debug: Log available lists when they change
    useEffect(() => {
        console.log('Available lists for user:', lists);
        console.log('Lists count:', lists?.length || 0);
        if (lists && lists.length > 0) {
            console.log('List details:', lists.map((l: any) => ({
                id: l.id,
                name: l.name,
                is_shared: l.is_shared,
                created_by: l.created_by,
                creator_name: l.creator_name,
            })));
        }
    }, [lists]);
    
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
    
    // Get document columns to display based on selected riding company
    // IMPORTANT: Only show columns for Driver Documents that exist in document_names table
    // Do NOT include document requirements - only actual Driver Documents
    const documentColumnsToShow = useMemo(() => {
        // Use ONLY document names from document_names table (allDocumentNames)
        // Do NOT merge with requirements - columns should only show actual Driver Documents
        const allNames = [...(allDocumentNames || [])].sort();
        
        if (sidebarSelectedRidingCompanyId && documentsByRidingCompany[sidebarSelectedRidingCompanyId]) {
            // Show only documents for selected riding company
            const selectedCompanyDocs = documentsByRidingCompany[sidebarSelectedRidingCompanyId];
            return [...new Set(selectedCompanyDocs)].sort();
        }
        // Show all documents if no riding company is selected
        return allNames;
    }, [sidebarSelectedRidingCompanyId, documentsByRidingCompany, allDocumentNames]);
    
    // Create dynamic document columns
    const dynamicDocumentColumns = useMemo(() => {
        return documentColumnsToShow.map((docName, index) => ({
            id: `document_${docName.replace(/[^a-zA-Z0-9]/g, '_')}`,
            label: docName,
            defaultVisible: true,
            defaultOrder: 15 + index * 0.1, // After updated_at
            documentName: docName,
        }));
    }, [documentColumnsToShow]);
    
    // Merge static and dynamic columns
    const allColumnsWithDocuments = useMemo(() => {
        return [...ALL_DRIVER_COLUMNS, ...dynamicDocumentColumns];
    }, [dynamicDocumentColumns]);
    
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
    // If user has a specific riding company, use that
    // Otherwise, use sidebar selection
    const whatsAppRidingCompanyId = userRidingCompanyId || sidebarSelectedRidingCompanyId;
    
    // Hide WhatsApp button when "All Riding Companies" is selected (no specific riding company)
    // Show only when user has a specific riding company OR admin selected a specific riding company from sidebar
    const showWhatsAppButton = !!userRidingCompanyId || !!sidebarSelectedRidingCompanyId;
    
    // Removed debug log
    
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

    const canQuickEdit = () => {
        return hasPermission('drivers.drivers.quick-edit');
    };

    const canEdit = () => {
        return hasPermission('drivers.drivers.edit');
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
    const [columnsDialogOpen, setColumnsDialogOpen] = useState(false);
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

    // Memoize savedColumns to prevent infinite loops
    const savedColumns = useMemo(() => loadColumnPreferences(), []);
    
    // Merge saved columns with new columns to ensure all columns are present
    const mergeColumns = useCallback((saved: Array<{ id: string; visible: boolean; order: number }> | null, allColumns: typeof allColumnsWithDocuments) => {
        // Always start with all columns to ensure all columns are present
        const defaultColumns = allColumns.map(col => ({
            id: col.id,
            visible: col.defaultVisible,
            order: col.defaultOrder,
        }));
        
        if (!saved || !Array.isArray(saved)) {
            return defaultColumns;
        }
        
        // Check if saved columns contain all required columns
        const savedColumnIds = new Set(saved.map(col => col.id));
        const allColumnIds = new Set(allColumns.map(col => col.id));
        const hasAllColumns = Array.from(allColumnIds).every(id => savedColumnIds.has(id));
        
        // Merge saved settings with defaults
        const savedMap = new Map(saved.map(col => [col.id, col]));
        return allColumns.map(colDef => {
            const savedCol = savedMap.get(colDef.id);
            if (savedCol) {
                return {
                    id: colDef.id,
                    visible: savedCol.visible !== undefined ? savedCol.visible : colDef.defaultVisible,
                    order: savedCol.order !== undefined ? savedCol.order : colDef.defaultOrder,
                };
            }
            return {
                id: colDef.id,
                visible: colDef.defaultVisible,
                order: colDef.defaultOrder,
            };
        });
    }, []);
    
    const initialColumns = useMemo(() => {
        return mergeColumns(savedColumns, allColumnsWithDocuments);
    }, [savedColumns, allColumnsWithDocuments, mergeColumns]);
    
    const [columns, setColumns] = useState<Array<{ id: string; visible: boolean; order: number }>>(
        initialColumns
    );
    
    // Track column IDs to detect changes
    const allColumnIds = useMemo(() => {
        return allColumnsWithDocuments.map(col => col.id).sort().join(',');
    }, [allColumnsWithDocuments]);
    
    // Track document names to detect changes
    const documentNamesKey = useMemo(() => {
        return allDocumentNames.sort().join(',');
    }, [allDocumentNames]);
    
    // Update columns when allColumnsWithDocuments changes
    useEffect(() => {
        if (allColumnsWithDocuments.length > 0) {
            const updatedColumns = mergeColumns(savedColumns, allColumnsWithDocuments);
            setColumns(prevColumns => {
                // Only update if the column structure actually changed
                const prevIds = new Set(prevColumns.map(c => c.id));
                const newIds = new Set(updatedColumns.map(c => c.id));
                const idsChanged = prevIds.size !== newIds.size || 
                    Array.from(prevIds).some(id => !newIds.has(id)) ||
                    Array.from(newIds).some(id => !prevIds.has(id));
                
                if (idsChanged) {
                    return updatedColumns;
                }
                return prevColumns;
            });
        }
    }, [allColumnIds, documentNamesKey, mergeColumns, savedColumns]);
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
        riding_company_id: null,
        campaign_id: null,
        lead_source_id: null,
        lead_status_id: null,
        lead_status_comment: '',
        cancel_reason: null,
        car_or_scooter: null,
        lead_stage_id: null,
        assigned_to: null,
        team_leader_id: null,
        account_manager_id: null,
        city: null,
        last_assigned_date_from: '',
        last_assigned_date_to: '',
        last_assigned_date_from_time: '',
        last_assigned_date_to_time: '',
        updated_at_from: '',
        updated_at_to: '',
        updated_at_from_time: '',
        updated_at_to_time: '',
        created_at_from: '',
        created_at_to: '',
        created_at_from_time: '',
        created_at_to_time: '',
        last_follow_up_from: '',
        last_follow_up_to: '',
        last_follow_up_from_time: '',
        last_follow_up_to_time: '',
        next_follow_up_from: '',
        next_follow_up_to: '',
        next_follow_up_from_time: '',
        next_follow_up_to_time: '',
        duplicate: '',
        driver_num: '',
    });
    // Temporary state for date filters before applying
    const [tempDateFilters, setTempDateFilters] = useState<Record<string, string>>({});
    const [dateRangeDropdownOpen, setDateRangeDropdownOpen] = useState<Record<string, boolean>>({
        last_assigned_date: false,
        updated_at: false,
        created_at: false,
        last_follow_up: false,
        next_follow_up: false,
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
        { value: 'cancel_reason', label: 'Cancel Reason' },
        { value: 'worked_with_us_before', label: 'Worked With Us Before' },
        { value: 'vehicle_type_and_year', label: 'Vehicle Type and Year' },
        { value: 'car_or_scooter', label: 'Car or Scooter' },
        { value: 'city', label: 'City' },
    ];

    const availableFields = importAvailableFields || defaultAvailableFields;

    const handleDelete = (driver: Driver) => {
        setDeleteDialog({ open: true, driver });
    };

    const confirmDelete = () => {
        if (deleteDialog.driver) {
            router.delete(`/drivers/drivers/${deleteDialog.driver.id}`, {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    // Reload current page and related pages
                    router.reload({ 
                        only: ['drivers', 'filterOptions'],
                        preserveState: true,
                        preserveScroll: true
                    });
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

    // Helper function to check if a condition is met
    const checkCondition = useCallback((driver: Driver, condition: { field: string; operator: string; value: any }): boolean => {
        const { field, operator, value } = condition;
        if (!field || !operator) return true;
        
        let driverValue: any;
        
        
        // Get driver value based on field
        switch (field) {
            case 'full_name':
                driverValue = driver.full_name;
                break;
            case 'phone':
                driverValue = driver.phone;
                break;
            case 'whatsapp_phone':
                driverValue = (driver as any).whatsapp_phone;
                break;
            case 'email':
                driverValue = driver.email;
                break;
            case 'company_id':
                driverValue = driver.company_id;
                break;
            case 'riding_company_id':
                driverValue = driver.riding_company?.id;
                break;
            case 'campaign_id':
                driverValue = driver.campaign?.id;
                break;
            case 'lead_source_id':
                driverValue = driver.lead_source?.id;
                break;
            case 'lead_status_id':
                driverValue = driver.lead_status?.id;
                break;
            case 'lead_stage_id':
                driverValue = driver.lead_stage?.id;
                break;
            case 'assigned_to':
                driverValue = driver.assigned_to?.id;
                break;
            case 'team_leader_id':
                driverValue = (driver as any).team_leader?.id;
                break;
            case 'account_manager_id':
                driverValue = (driver as any).account_manager?.id;
                break;
            case 'resigned_leads':
                driverValue = (driver as any).resigned_leads;
                break;
            case 'next_follow_up':
                driverValue = driver.next_follow_up;
                break;
            case 'last_follow_up':
                driverValue = driver.last_follow_up;
                break;
            case 'created_at':
                driverValue = driver.created_at;
                break;
            case 'updated_at':
                driverValue = driver.updated_at;
                break;
            case 'city':
                driverValue = (driver as any).city;
                break;
            case 'last_assigned_date':
                driverValue = (driver as any).last_assigned_time;
                break;
            case 'vehicle_type':
                driverValue = (driver as any).vehicle_type;
                break;
            case 'car_or_scooter':
                driverValue = (driver as any).car_or_scooter;
                break;
            case 'vehicle_type_and_year':
                driverValue = (driver as any).vehicle_type_and_year;
                break;
            case 'has_worked_before':
                driverValue = (driver as any).has_worked_before;
                break;
            case 'worked_with_us_before':
                driverValue = (driver as any).worked_with_us_before;
                break;
            case 'feedback_count':
                driverValue = (driver as any).feedback_count ?? 0;
                break;
            case 'last_assigned_by':
                driverValue = (driver as any).last_assigned_by?.id;
                break;
            case 'lead_status_comment':
                driverValue = (driver as any).lead_status_comment;
                break;
            case 'notes':
                driverValue = (driver as any).notes;
                break;
            case 'cancel_reason':
                driverValue = (driver as any).cancel_reason;
                break;
            case 'driver_num':
                driverValue = driver.driver_num || driver.id;
                break;
            case 'duplicate':
                driverValue = (driver as any).duplicate ?? 0;
                break;
            case 'confirm_duplicate':
                driverValue = (driver as any).confirm_duplicate ?? false;
                break;
            case 'uuid':
                driverValue = driver.uuid;
                break;
            case 'current_stage_id':
                driverValue = (driver as any).current_stage_id;
                break;
            default:
                driverValue = (driver as any)[field];
        }
        
        // Apply operator
        switch (operator) {
            case 'equals':
                // Normalize both values for comparison (trim and handle null/undefined)
                const normalizedDriverValue = driverValue !== null && driverValue !== undefined ? String(driverValue).trim() : '';
                const normalizedConditionValue = value !== null && value !== undefined ? String(value).trim() : '';
                return normalizedDriverValue === normalizedConditionValue;
            case 'not_equal_to':
                return String(driverValue) !== String(value);
            case 'starts_with':
                return String(driverValue || '').toLowerCase().startsWith(String(value || '').toLowerCase());
            case 'ends_with':
                return String(driverValue || '').toLowerCase().endsWith(String(value || '').toLowerCase());
            case 'contains':
                return String(driverValue || '').toLowerCase().includes(String(value || '').toLowerCase());
            case 'does_not_contain':
                return !String(driverValue || '').toLowerCase().includes(String(value || '').toLowerCase());
            case 'is_empty':
                return !driverValue || String(driverValue).trim() === '';
            case 'is_not_empty':
                return driverValue && String(driverValue).trim() !== '';
            case 'before':
                if (!driverValue || !value) return false;
                return new Date(driverValue) < new Date(value);
            case 'after':
                if (!driverValue || !value) return false;
                return new Date(driverValue) > new Date(value);
            case 'between':
                if (!driverValue || !Array.isArray(value) || value.length !== 2) return false;
                const driverDate = new Date(driverValue);
                return driverDate >= new Date(value[0]) && driverDate <= new Date(value[1]);
            case 'less_than':
                return Number(driverValue || 0) < Number(value || 0);
            case 'greater_than':
                return Number(driverValue || 0) > Number(value || 0);
            case 'less_or_equal':
                return Number(driverValue || 0) <= Number(value || 0);
            case 'greater_or_equal':
                return Number(driverValue || 0) >= Number(value || 0);
            // Checkbox operators
            case 'is_enabled':
                // For checkbox fields, check if value is true
                return Boolean(driverValue) === true;
            case 'is_disabled':
                // For checkbox fields, check if value is false
                return Boolean(driverValue) === false;
            // Date relative operators
            case 'less_than_days_ago':
                if (!driverValue || !value) return false;
                const daysAgo = Number(value) || 0;
                const targetDate = new Date();
                targetDate.setDate(targetDate.getDate() - daysAgo);
                return new Date(driverValue) < targetDate;
            case 'more_than_days_ago':
                if (!driverValue || !value) return false;
                const daysAgoMore = Number(value) || 0;
                const targetDateMore = new Date();
                targetDateMore.setDate(targetDateMore.getDate() - daysAgoMore);
                return new Date(driverValue) < targetDateMore;
            case 'in_less_than':
                if (!driverValue || !value) return false;
                const daysInLess = Number(value) || 0;
                const now = new Date();
                const futureDate = new Date();
                futureDate.setDate(futureDate.getDate() + daysInLess);
                const driverDateInLess = new Date(driverValue);
                return driverDateInLess >= now && driverDateInLess <= futureDate;
            case 'in_more_than':
                if (!driverValue || !value) return false;
                const daysInMore = Number(value) || 0;
                const futureDateMore = new Date();
                futureDateMore.setDate(futureDateMore.getDate() + daysInMore);
                return new Date(driverValue) > futureDateMore;
            case 'days_ago':
                if (!driverValue || !value) return false;
                const daysAgoExact = Number(value) || 0;
                const targetDateExact = new Date();
                targetDateExact.setDate(targetDateExact.getDate() - daysAgoExact);
                targetDateExact.setHours(0, 0, 0, 0);
                const driverDateExact = new Date(driverValue);
                driverDateExact.setHours(0, 0, 0, 0);
                return driverDateExact.getTime() === targetDateExact.getTime();
            case 'days_later':
                if (!driverValue || !value) return false;
                const daysLater = Number(value) || 0;
                const targetDateLater = new Date();
                targetDateLater.setDate(targetDateLater.getDate() + daysLater);
                targetDateLater.setHours(0, 0, 0, 0);
                const driverDateLater = new Date(driverValue);
                driverDateLater.setHours(0, 0, 0, 0);
                return driverDateLater.getTime() === targetDateLater.getTime();
            // Date period operators
            case 'previous_week':
                if (!driverValue) return false;
                const prevWeekStart = new Date();
                prevWeekStart.setDate(prevWeekStart.getDate() - prevWeekStart.getDay() - 7);
                prevWeekStart.setHours(0, 0, 0, 0);
                const prevWeekEnd = new Date(prevWeekStart);
                prevWeekEnd.setDate(prevWeekEnd.getDate() + 6);
                prevWeekEnd.setHours(23, 59, 59, 999);
                const driverDatePrevWeek = new Date(driverValue);
                return driverDatePrevWeek >= prevWeekStart && driverDatePrevWeek <= prevWeekEnd;
            case 'current_week':
                if (!driverValue) return false;
                const currentWeekStart = new Date();
                currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay());
                currentWeekStart.setHours(0, 0, 0, 0);
                const currentWeekEnd = new Date(currentWeekStart);
                currentWeekEnd.setDate(currentWeekEnd.getDate() + 6);
                currentWeekEnd.setHours(23, 59, 59, 999);
                const driverDateCurrentWeek = new Date(driverValue);
                return driverDateCurrentWeek >= currentWeekStart && driverDateCurrentWeek <= currentWeekEnd;
            case 'next_week':
                if (!driverValue) return false;
                const nextWeekStart = new Date();
                nextWeekStart.setDate(nextWeekStart.getDate() - nextWeekStart.getDay() + 7);
                nextWeekStart.setHours(0, 0, 0, 0);
                const nextWeekEnd = new Date(nextWeekStart);
                nextWeekEnd.setDate(nextWeekEnd.getDate() + 6);
                nextWeekEnd.setHours(23, 59, 59, 999);
                const driverDateNextWeek = new Date(driverValue);
                return driverDateNextWeek >= nextWeekStart && driverDateNextWeek <= nextWeekEnd;
            case 'previous_month':
                if (!driverValue) return false;
                const prevMonth = new Date();
                prevMonth.setMonth(prevMonth.getMonth() - 1);
                const prevMonthStart = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 1);
                const prevMonthEnd = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0, 23, 59, 59, 999);
                const driverDatePrevMonth = new Date(driverValue);
                return driverDatePrevMonth >= prevMonthStart && driverDatePrevMonth <= prevMonthEnd;
            case 'current_month':
                if (!driverValue) return false;
                const currentMonthStart = new Date();
                currentMonthStart.setDate(1);
                currentMonthStart.setHours(0, 0, 0, 0);
                const currentMonthEnd = new Date(currentMonthStart.getFullYear(), currentMonthStart.getMonth() + 1, 0, 23, 59, 59, 999);
                const driverDateCurrentMonth = new Date(driverValue);
                return driverDateCurrentMonth >= currentMonthStart && driverDateCurrentMonth <= currentMonthEnd;
            case 'next_month':
                if (!driverValue) return false;
                const nextMonth = new Date();
                nextMonth.setMonth(nextMonth.getMonth() + 1);
                const nextMonthStart = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1);
                const nextMonthEnd = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0, 23, 59, 59, 999);
                const driverDateNextMonth = new Date(driverValue);
                return driverDateNextMonth >= nextMonthStart && driverDateNextMonth <= nextMonthEnd;
            case 'last_7_days':
                if (!driverValue) return false;
                const last7Days = new Date();
                last7Days.setDate(last7Days.getDate() - 7);
                return new Date(driverValue) >= last7Days;
            case 'last_14_days':
                if (!driverValue) return false;
                const last14Days = new Date();
                last14Days.setDate(last14Days.getDate() - 14);
                return new Date(driverValue) >= last14Days;
            case 'last_30_days':
                if (!driverValue) return false;
                const last30Days = new Date();
                last30Days.setDate(last30Days.getDate() - 30);
                return new Date(driverValue) >= last30Days;
            case 'last_60_days':
                if (!driverValue) return false;
                const last60Days = new Date();
                last60Days.setDate(last60Days.getDate() - 60);
                return new Date(driverValue) >= last60Days;
            case 'last_90_days':
                if (!driverValue) return false;
                const last90Days = new Date();
                last90Days.setDate(last90Days.getDate() - 90);
                return new Date(driverValue) >= last90Days;
            case 'last_120_days':
                if (!driverValue) return false;
                const last120Days = new Date();
                last120Days.setDate(last120Days.getDate() - 120);
                return new Date(driverValue) >= last120Days;
            case 'next_30_days':
                if (!driverValue) return false;
                const nowNext30 = new Date();
                nowNext30.setHours(0, 0, 0, 0);
                const next30Days = new Date();
                next30Days.setDate(next30Days.getDate() + 30);
                next30Days.setHours(23, 59, 59, 999);
                const driverDateNext30 = new Date(driverValue);
                return driverDateNext30 >= nowNext30 && driverDateNext30 <= next30Days;
            case 'next_60_days':
                if (!driverValue) return false;
                const nowNext60 = new Date();
                nowNext60.setHours(0, 0, 0, 0);
                const next60Days = new Date();
                next60Days.setDate(next60Days.getDate() + 60);
                next60Days.setHours(23, 59, 59, 999);
                const driverDateNext60 = new Date(driverValue);
                return driverDateNext60 >= nowNext60 && driverDateNext60 <= next60Days;
            case 'yesterday':
                if (!driverValue) return false;
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                yesterday.setHours(0, 0, 0, 0);
                const yesterdayEnd = new Date(yesterday);
                yesterdayEnd.setHours(23, 59, 59, 999);
                const driverDateYesterday = new Date(driverValue);
                return driverDateYesterday >= yesterday && driverDateYesterday <= yesterdayEnd;
            case 'today':
                if (!driverValue) return false;
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const todayEnd = new Date(today);
                todayEnd.setHours(23, 59, 59, 999);
                const driverDateToday = new Date(driverValue);
                return driverDateToday >= today && driverDateToday <= todayEnd;
            case 'tomorrow':
                if (!driverValue) return false;
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                tomorrow.setHours(0, 0, 0, 0);
                const tomorrowEnd = new Date(tomorrow);
                tomorrowEnd.setHours(23, 59, 59, 999);
                const driverDateTomorrow = new Date(driverValue);
                return driverDateTomorrow >= tomorrow && driverDateTomorrow <= tomorrowEnd;
            case 'previous_fy':
                if (!driverValue) return false;
                const prevFY = new Date();
                prevFY.setFullYear(prevFY.getFullYear() - 1);
                const prevFYStart = new Date(prevFY.getFullYear(), 0, 1);
                const prevFYEnd = new Date(prevFY.getFullYear(), 11, 31, 23, 59, 59, 999);
                const driverDatePrevFY = new Date(driverValue);
                return driverDatePrevFY >= prevFYStart && driverDatePrevFY <= prevFYEnd;
            case 'current_fy':
                if (!driverValue) return false;
                const currentFYStart = new Date(new Date().getFullYear(), 0, 1);
                const currentFYEnd = new Date(new Date().getFullYear(), 11, 31, 23, 59, 59, 999);
                const driverDateCurrentFY = new Date(driverValue);
                return driverDateCurrentFY >= currentFYStart && driverDateCurrentFY <= currentFYEnd;
            case 'next_fy':
                if (!driverValue) return false;
                const nextFY = new Date();
                nextFY.setFullYear(nextFY.getFullYear() + 1);
                const nextFYStart = new Date(nextFY.getFullYear(), 0, 1);
                const nextFYEnd = new Date(nextFY.getFullYear(), 11, 31, 23, 59, 59, 999);
                const driverDateNextFY = new Date(driverValue);
                return driverDateNextFY >= nextFYStart && driverDateNextFY <= nextFYEnd;
            case 'previous_fq':
                if (!driverValue) return false;
                const nowPrevFQ = new Date();
                const currentQuarterPrevFQ = Math.ceil((nowPrevFQ.getMonth() + 1) / 3);
                let prevQuarter = currentQuarterPrevFQ - 1;
                let prevQuarterYear = nowPrevFQ.getFullYear();
                if (prevQuarter <= 0) {
                    prevQuarter = 4;
                    prevQuarterYear -= 1;
                }
                const prevFQStart = new Date(prevQuarterYear, (prevQuarter - 1) * 3, 1);
                const prevFQEnd = new Date(prevQuarterYear, prevQuarter * 3, 0, 23, 59, 59, 999);
                const driverDatePrevFQ = new Date(driverValue);
                return driverDatePrevFQ >= prevFQStart && driverDatePrevFQ <= prevFQEnd;
            case 'current_fq':
                if (!driverValue) return false;
                const nowCurrentFQ = new Date();
                const currentQuarterCurrentFQ = Math.ceil((nowCurrentFQ.getMonth() + 1) / 3);
                const currentFQStart = new Date(nowCurrentFQ.getFullYear(), (currentQuarterCurrentFQ - 1) * 3, 1);
                const currentFQEnd = new Date(nowCurrentFQ.getFullYear(), currentQuarterCurrentFQ * 3, 0, 23, 59, 59, 999);
                const driverDateCurrentFQ = new Date(driverValue);
                return driverDateCurrentFQ >= currentFQStart && driverDateCurrentFQ <= currentFQEnd;
            case 'next_fq':
                if (!driverValue) return false;
                const nowNextFQ = new Date();
                const currentQuarterNextFQ = Math.ceil((nowNextFQ.getMonth() + 1) / 3);
                let nextQuarter = currentQuarterNextFQ + 1;
                let nextQuarterYear = nowNextFQ.getFullYear();
                if (nextQuarter > 4) {
                    nextQuarter = 1;
                    nextQuarterYear += 1;
                }
                const nextFQStart = new Date(nextQuarterYear, (nextQuarter - 1) * 3, 1);
                const nextFQEnd = new Date(nextQuarterYear, nextQuarter * 3, 0, 23, 59, 59, 999);
                const driverDateNextFQ = new Date(driverValue);
                return driverDateNextFQ >= nextFQStart && driverDateNextFQ <= nextFQEnd;
            default:
                return true;
        }
    }, []);

    // Filter drivers based on active filters and active tab
    const filteredDrivers = useMemo(() => {
        if (!safeDrivers || safeDrivers.length === 0) {
            return [];
        }
        
        // If a list is selected, apply list filter directly (independent from tabs)
        if (selectedListId) {
            const selectedList = lists.find((l: DriverList) => l.id === selectedListId);
            if (selectedList) {
                const listFiltered = safeDrivers.filter((driver) => {
                    // Apply all conditions (AND) - all must be met
                    if (selectedList.all_conditions && selectedList.all_conditions.length > 0) {
                        const allConditionsMet = selectedList.all_conditions.every((condition) => {
                            return checkCondition(driver, condition);
                        });
                        if (!allConditionsMet) {
                            return false;
                        }
                    }
                    
                    // Apply any conditions (OR) - at least one must be met
                    if (selectedList.any_conditions && selectedList.any_conditions.length > 0) {
                        const anyConditionMet = selectedList.any_conditions.some((condition) => {
                            return checkCondition(driver, condition);
                        });
                        if (!anyConditionMet) {
                            return false;
                        }
                    }
                    
                    return true;
                });
                
                // Apply other filters to list-filtered drivers
                return listFiltered.filter((driver) => {
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
            // Riding Company filter (dropdown)
            if (filters.riding_company_id) {
                if (filters.riding_company_id === 'is_empty') {
                    if (driver.riding_company?.id) {
                        return false;
                    }
                } else if (driver.riding_company?.id !== filters.riding_company_id) {
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
            // City filter
            if (filters.city) {
                if (filters.city === 'is_empty') {
                    const city = (driver as any).city;
                    if (city && String(city).trim() !== '') {
                        return false;
                    }
                } else {
                    const city = (driver as any).city;
                    if (!city || String(city).trim() !== String(filters.city).trim()) {
                        return false;
                    }
                }
            }
            // City filter
            if (filters.city) {
                if (filters.city === 'is_empty') {
                    const city = (driver as any).city;
                    if (city && String(city).trim() !== '') {
                        return false;
                    }
                } else {
                    const city = (driver as any).city;
                    if (!city || String(city).trim() !== String(filters.city).trim()) {
                        return false;
                    }
                }
            }
            // Car or Scooter filter
            if (filters.car_or_scooter) {
                if (filters.car_or_scooter === 'is_empty') {
                    const carOrScooter = (driver as any).car_or_scooter;
                    if (carOrScooter && String(carOrScooter).trim() !== '') {
                        return false;
                    }
                } else {
                    const carOrScooter = (driver as any).car_or_scooter;
                    if (!carOrScooter || String(carOrScooter).trim() !== String(filters.car_or_scooter).trim()) {
                        return false;
                    }
                }
            }
            // Cancel Reason filter
            if (filters.cancel_reason) {
                if (filters.cancel_reason === 'is_empty') {
                    if (driver.cancel_reason && driver.cancel_reason.trim() !== '') {
                        return false;
                    }
                } else {
                    const cancelReason = driver.cancel_reason;
                    if (!cancelReason || String(cancelReason).trim() !== String(filters.cancel_reason).trim()) {
                        return false;
                    }
                }
            }
            // Duplicate filter (number)
            if (filters.duplicate !== null && filters.duplicate !== undefined && filters.duplicate !== '') {
                if (filters.duplicate === 'is_empty') {
                    const duplicateValue = (driver as any).duplicate ?? 0;
                    if (duplicateValue !== 0 && duplicateValue !== null && duplicateValue !== undefined) {
                        return false;
                    }
                } else {
                    const duplicateValue = (driver as any).duplicate ?? 0;
                    const filterValue = Number(filters.duplicate);
                    if (isNaN(filterValue) || duplicateValue !== filterValue) {
                        return false;
                    }
                }
            }
            // Feedback Count filter (number)
            if (filters.feedback_count !== null && filters.feedback_count !== undefined && filters.feedback_count !== '') {
                if (filters.feedback_count === 'is_empty') {
                    const feedbackCountValue = (driver as any).feedback_count ?? 0;
                    if (feedbackCountValue !== 0 && feedbackCountValue !== null && feedbackCountValue !== undefined) {
                        return false;
                    }
                } else {
                    const feedbackCountValue = (driver as any).feedback_count ?? 0;
                    const filterValue = Number(filters.feedback_count);
                    if (isNaN(filterValue) || feedbackCountValue !== filterValue) {
                        return false;
                    }
                }
            }
            // Driver Number filter (number/string)
            if (filters.driver_num !== null && filters.driver_num !== undefined && filters.driver_num !== '') {
                if (filters.driver_num === 'is_empty') {
                    const driverNum = driver.driver_num || driver.id;
                    if (driverNum !== null && driverNum !== undefined && String(driverNum).trim() !== '') {
                        return false;
                    }
                } else {
                    const driverNum = String(driver.driver_num || driver.id);
                    const filterValue = String(filters.driver_num).trim();
                    if (!driverNum.includes(filterValue)) {
                        return false;
                    }
                }
            }
            return true;
        });
            }
        }
        
        // If no list is selected, apply tab filter
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
            // Riding Company filter (dropdown)
            if (filters.riding_company_id) {
                if (filters.riding_company_id === 'is_empty') {
                    if (driver.riding_company?.id) {
                        return false;
                    }
                } else if (driver.riding_company?.id !== filters.riding_company_id) {
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
            // City filter
            if (filters.city) {
                if (filters.city === 'is_empty') {
                    const city = (driver as any).city;
                    if (city && String(city).trim() !== '') {
                        return false;
                    }
                } else {
                    const city = (driver as any).city;
                    if (!city || String(city).trim() !== String(filters.city).trim()) {
                        return false;
                    }
                }
            }
            // Car or Scooter filter
            if (filters.car_or_scooter) {
                if (filters.car_or_scooter === 'is_empty') {
                    const carOrScooter = (driver as any).car_or_scooter;
                    if (carOrScooter && String(carOrScooter).trim() !== '') {
                        return false;
                    }
                } else {
                    const carOrScooter = (driver as any).car_or_scooter;
                    if (!carOrScooter || String(carOrScooter).trim() !== String(filters.car_or_scooter).trim()) {
                        return false;
                    }
                }
            }
            // Cancel Reason filter
            if (filters.cancel_reason) {
                if (filters.cancel_reason === 'is_empty') {
                    if (driver.cancel_reason && driver.cancel_reason.trim() !== '') {
                        return false;
                    }
                } else {
                    const cancelReason = driver.cancel_reason;
                    if (!cancelReason || String(cancelReason).trim() !== String(filters.cancel_reason).trim()) {
                        return false;
                    }
                }
            }
            // Duplicate filter (number)
            if (filters.duplicate !== null && filters.duplicate !== undefined && filters.duplicate !== '') {
                if (filters.duplicate === 'is_empty') {
                    const duplicateValue = (driver as any).duplicate ?? 0;
                    if (duplicateValue !== 0 && duplicateValue !== null && duplicateValue !== undefined) {
                        return false;
                    }
                } else {
                    const duplicateValue = (driver as any).duplicate ?? 0;
                    const filterValue = Number(filters.duplicate);
                    if (isNaN(filterValue) || duplicateValue !== filterValue) {
                        return false;
                    }
                }
            }
            // Feedback Count filter (number)
            if (filters.feedback_count !== null && filters.feedback_count !== undefined && filters.feedback_count !== '') {
                if (filters.feedback_count === 'is_empty') {
                    const feedbackCountValue = (driver as any).feedback_count ?? 0;
                    if (feedbackCountValue !== 0 && feedbackCountValue !== null && feedbackCountValue !== undefined) {
                        return false;
                    }
                } else {
                    const feedbackCountValue = (driver as any).feedback_count ?? 0;
                    const filterValue = Number(filters.feedback_count);
                    if (isNaN(filterValue) || feedbackCountValue !== filterValue) {
                        return false;
                    }
                }
            }
            // Driver Number filter (number/string)
            if (filters.driver_num !== null && filters.driver_num !== undefined && filters.driver_num !== '') {
                if (filters.driver_num === 'is_empty') {
                    const driverNum = driver.driver_num || driver.id;
                    if (driverNum !== null && driverNum !== undefined && String(driverNum).trim() !== '') {
                        return false;
                    }
                } else {
                    const driverNum = String(driver.driver_num || driver.id);
                    const filterValue = String(filters.driver_num).trim();
                    if (!driverNum.includes(filterValue)) {
                        return false;
                    }
                }
            }
            return true;
        });
    }, [safeDrivers, filters, activeTab, selectedListId, lists, checkCondition]);

    // Ensure all columns from allColumnsWithDocuments are present in columns state
    // Also remove columns that no longer exist (e.g., deleted document names)
    // This effect runs automatically whenever document names change (added or deleted)
    useEffect(() => {
        if (allColumnsWithDocuments.length === 0) return;
            
        const allColumnIdsSet = new Set(allColumnsWithDocuments.map(col => col.id));
        const currentColumnIds = new Set(columns.map(col => col.id));
        
        // Check if any columns are missing (new document names added)
        const missingColumns = allColumnsWithDocuments.filter(col => !currentColumnIds.has(col.id));
        
        // Check if any columns should be removed (deleted document names or old requirements)
        // Remove ALL document columns that are not in the current allColumnsWithDocuments
        const columnsToRemove = columns.filter(col => {
            // Keep static columns (not document columns)
            if (!col.id.startsWith('document_')) {
                return false;
            }
            // Remove document columns that no longer exist in document_names table
            return !allColumnIdsSet.has(col.id);
        });
        
        if (missingColumns.length > 0 || columnsToRemove.length > 0) {
            setColumns(prev => {
                // Remove deleted columns (including old requirements like document_02, document_03, document_ID)
                const filtered = prev.filter(col => !columnsToRemove.some(rem => rem.id === col.id));
                
                // Add missing columns
                const existingIds = new Set(filtered.map(col => col.id));
                const newColumns = [...filtered];
                missingColumns.forEach(col => {
                    if (!existingIds.has(col.id)) {
                        newColumns.push({
                            id: col.id,
                            visible: col.defaultVisible,
                            order: col.defaultOrder,
                        });
                    }
                });
                
                // Re-sort by order
                return newColumns.sort((a, b) => (a.order || 0) - (b.order || 0));
            });
        }
    }, [allColumnIds, documentNamesKey, allColumnsWithDocuments, columns]); // Watch for document names changes

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
                return allColumnsWithDocuments.map(col => ({
                    id: col.id,
                    visible: col.defaultVisible,
                    order: col.defaultOrder,
                }));
            }
            return [...columns].sort((a, b) => (a.order || 0) - (b.order || 0));
        } catch (e) {
            console.error('Error in sortedColumns:', e);
            return allColumnsWithDocuments.map(col => ({
                id: col.id,
                visible: col.defaultVisible,
                order: col.defaultOrder,
            }));
        }
    }, [columns, allColumnsWithDocuments]);

    // Get visible columns
    // Map column IDs to field names for permission checking
    // IMPORTANT: This map must include ALL columns that have field-level permissions
    const columnToFieldMap: Record<string, string> = {
        'name': 'full_name',
        'phone': 'phone',
        'whatsapp': 'whatsapp_phone',
        'email': 'email',
        'riding_company': 'riding_company',
        'campaign': 'campaign',
        'lead_source': 'lead_source',
        'lead_status': 'lead_status',
        'lead_status_comment': 'lead_status_comment',
        'next_follow_up': 'next_follow_up',
        'last_follow_up': 'last_follow_up',
        'assigned_to': 'assigned_to',
        'team_leader': 'team_leader',
        'account_manager': 'account_manager',
        'resigned_leads': 'resigned_leads',
        'lead_stage': 'lead_stage',
        'current_stage': 'current_stage',
        'last_assigned_date': 'last_assigned_time',
        'last_assigned_by': 'last_assigned_by',
        'notes': 'notes',
        'cancel_reason': 'cancel_reason',
        'vehicle_type': 'vehicle_type',
        'car_or_scooter': 'car_or_scooter',
        'vehicle_type_and_year': 'vehicle_type_and_year',
        'has_worked_before': 'has_worked_before',
        'worked_with_us_before': 'worked_with_us_before',
        'city': 'city',
        'feedback_count': 'feedback_count',
        'driver_num': 'driver_num',
        'duplicate': 'duplicate',
        'created_at': 'created_at',
        'updated_at': 'updated_at',
    };

    const visibleColumns = useMemo(() => {
        try {
            let cols;
            if (!sortedColumns || !Array.isArray(sortedColumns) || sortedColumns.length === 0) {
                cols = allColumnsWithDocuments.filter(col => col.defaultVisible).map(col => ({
                    id: col.id,
                    visible: col.defaultVisible,
                    order: col.defaultOrder,
                }));
            } else {
                cols = sortedColumns.filter(col => col.visible);
            }
            
            // Filter out columns for invisible fields
            const filtered = cols.filter(col => {
                // Always show actions column
                if (col.id === 'actions') return true;
                
                // Check field permissions for driver fields
                const fieldName = columnToFieldMap[col.id];
                if (fieldName) {
                    // Hide column if field is invisible
                    const canView = canViewDriverField(fieldName);
                    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
                        if (!canView) {
                            console.log(`[visibleColumns] Hiding column "${col.id}" (field: "${fieldName}") - invisible`);
                        }
                    }
                    return canView;
                }
                
                // Show columns that don't have field permissions (like riding_company, team_leader, etc.)
                return true;
            });
            
            if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
                console.log(`[visibleColumns] Filtered columns: ${filtered.length} out of ${cols.length}`, {
                    hidden: cols.length - filtered.length,
                    visible: filtered.map(c => c.id)
                });
            }
            
            return filtered;
        } catch (e) {
            console.error('Error in visibleColumns:', e);
            return ALL_DRIVER_COLUMNS.filter(col => col.defaultVisible).map(col => ({
                id: col.id,
                visible: col.defaultVisible,
                order: col.defaultOrder,
            }));
        }
    }, [sortedColumns, allColumnsWithDocuments, canViewDriverField]);

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
                    case 'name':
                    case 'full_name':
                        aValue = a.full_name || '';
                        bValue = b.full_name || '';
                        break;
                    case 'phone':
                        aValue = a.phone || '';
                        bValue = b.phone || '';
                        break;
                    case 'whatsapp':
                    case 'whatsapp_phone':
                        aValue = a.whatsapp_phone || '';
                        bValue = b.whatsapp_phone || '';
                        break;
                    case 'email':
                        aValue = a.email || '';
                        bValue = b.email || '';
                        break;
                    case 'driver_num':
                        aValue = a.driver_num || a.id || 0;
                        bValue = b.driver_num || b.id || 0;
                        break;
                    case 'riding_company':
                        aValue = a.riding_company?.id || 0;
                        bValue = b.riding_company?.id || 0;
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
                    case 'driver_stage':
                        aValue = (a as any).driver_stage?.name || '';
                        bValue = (b as any).driver_stage?.name || '';
                        break;
                    case 'current_stage':
                        aValue = (a as any).current_stage?.name || '';
                        bValue = (b as any).current_stage?.name || '';
                        break;
                    case 'assigned_to':
                        aValue = a.assigned_to?.name || '';
                        bValue = b.assigned_to?.name || '';
                        break;
                    case 'team_leader':
                        aValue = (a as any).team_leader?.name || '';
                        bValue = (b as any).team_leader?.name || '';
                        break;
                    case 'account_manager':
                        aValue = (a as any).account_manager?.name || '';
                        bValue = (b as any).account_manager?.name || '';
                        break;
                    case 'resigned_leads':
                        aValue = a.resigned_leads || '';
                        bValue = b.resigned_leads || '';
                        break;
                    case 'assigned_users':
                        aValue = a.assigned_users && a.assigned_users.length > 0 ? a.assigned_users.map((u: any) => u.name).join(', ') : '';
                        bValue = b.assigned_users && b.assigned_users.length > 0 ? b.assigned_users.map((u: any) => u.name).join(', ') : '';
                        break;
                    case 'last_assigned_date':
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
                    case 'cancel_reason':
                        aValue = (a as any).cancel_reason || '';
                        bValue = (b as any).cancel_reason || '';
                        break;
                    case 'vehicle_type':
                        aValue = (a as any).vehicle_type || '';
                        bValue = (b as any).vehicle_type || '';
                        break;
                    case 'vehicle_type_and_year':
                        aValue = (a as any).vehicle_type_and_year || '';
                        bValue = (b as any).vehicle_type_and_year || '';
                        break;
                    case 'car_or_scooter':
                        aValue = (a as any).car_or_scooter || '';
                        bValue = (b as any).car_or_scooter || '';
                        break;
                    case 'has_worked_before':
                        aValue = (a as any).has_worked_before || '';
                        bValue = (b as any).has_worked_before || '';
                        break;
                    case 'worked_with_us_before':
                        aValue = (a as any).worked_with_us_before || '';
                        bValue = (b as any).worked_with_us_before || '';
                        break;
                    case 'city':
                        aValue = (a as any).city || '';
                        bValue = (b as any).city || '';
                        break;
                    case 'feedback_count':
                        aValue = (a as any).feedback_count ?? 0;
                        bValue = (b as any).feedback_count ?? 0;
                        break;
                    case 'duplicate':
                        aValue = (a as any).duplicate ?? 0;
                        bValue = (b as any).duplicate ?? 0;
                        break;
                    case 'uuid':
                        aValue = a.uuid || '';
                        bValue = b.uuid || '';
                        break;
                    case 'created_at':
                        aValue = a.created_at || '';
                        bValue = b.created_at || '';
                        break;
                    case 'updated_at':
                        aValue = a.updated_at || '';
                        bValue = b.updated_at || '';
                        break;
                    default:
                        return 0;
                }
                
                // For numeric fields, compare directly
                if (sortField === 'duplicate' || sortField === 'feedback_count' || sortField === 'driver_num') {
                    const aNum = Number(aValue) || 0;
                    const bNum = Number(bValue) || 0;
                    if (aNum < bNum) return sortDirection === 'asc' ? -1 : 1;
                    if (aNum > bNum) return sortDirection === 'asc' ? 1 : -1;
                    return 0;
                }
                
                // For date fields, parse and compare as dates
                if (sortField === 'created_at' || sortField === 'updated_at' || 
                    sortField === 'next_follow_up' || sortField === 'last_follow_up' ||
                    sortField === 'last_assigned_date') {
                    try {
                        const aDate = new Date(aValue).getTime();
                        const bDate = new Date(bValue).getTime();
                        if (isNaN(aDate) && isNaN(bDate)) return 0;
                        if (isNaN(aDate)) return 1;
                        if (isNaN(bDate)) return -1;
                        if (aDate < bDate) return sortDirection === 'asc' ? -1 : 1;
                        if (aDate > bDate) return sortDirection === 'asc' ? 1 : -1;
                        return 0;
                    } catch (e) {
                        // If date parsing fails, fall back to string comparison
                    }
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
    };

    const handlePageSizeChange = (newSize: number) => {
        setPageSize(newSize);
        setCurrentPage(1);
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
            riding_company_id: null,
            campaign_id: null,
            lead_source_id: null,
            lead_status_id: null,
            lead_stage_id: null,
            assigned_to: null,
            next_follow_up_from: '',
            next_follow_up_to: '',
            next_follow_up_from_time: '',
            next_follow_up_to_time: '',
            last_follow_up_from: '',
            last_follow_up_to: '',
            last_follow_up_from_time: '',
            last_follow_up_to_time: '',
            created_at_from: '',
            created_at_to: '',
            created_at_from_time: '',
            created_at_to_time: '',
        updated_at_from: '',
        updated_at_to: '',
        updated_at_from_time: '',
        updated_at_to_time: '',
        cancel_reason: '',
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
    
    // Handle document status update
    const handleUpdateDocumentStatus = async (driverId: number, documentId: number, status: string) => {
        try {
            await axios.put(`/drivers/driver-documents/${documentId}`, {
                status: status,
            });
            // Refresh the page to update the data
            router.reload({ 
                only: ['drivers', 'filterOptions'],
                preserveState: true,
                preserveScroll: true
            });
        } catch (error) {
            console.error('Error updating document status:', error);
        }
    };
    
    // Handle document file deletion
    const handleDeleteDocumentFile = async (driverId: number, documentId: number) => {
        try {
            await axios.delete(`/drivers/driver-documents/${documentId}/file`);
            // Refresh the page to update the data
            router.reload({ 
                only: ['drivers', 'filterOptions'],
                preserveState: true,
                preserveScroll: true
            });
        } catch (error) {
            console.error('Error deleting document file:', error);
        }
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
            riding_company_id: driver.riding_company?.id || null,
            campaign_id: driver.campaign?.id || null,
            lead_source_id: driver.lead_source?.id || null,
            lead_status_id: driver.lead_status?.id || null,
            lead_status_comment: driver.lead_status_comment || '',
            cancel_reason: driver.cancel_reason || '',
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
        if (savedData.lead_status_comment !== undefined) {
            submitData.lead_status_comment = savedData.lead_status_comment;
        }
        if (savedData.cancel_reason !== undefined) {
            submitData.cancel_reason = savedData.cancel_reason;
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
            if (savedData.riding_company_id !== undefined) {
                const ridingCompany = filterOptions?.ridingCompanies?.find(rc => rc.value === savedData.riding_company_id);
                updatedDriver.riding_company = ridingCompany ? { id: ridingCompany.value, name: ridingCompany.label } : null;
            }
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
            if (savedData.lead_status_comment !== undefined) updatedDriver.lead_status_comment = savedData.lead_status_comment;
            if (savedData.cancel_reason !== undefined) updatedDriver.cancel_reason = savedData.cancel_reason;
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
            `/drivers/drivers/${driverId}`,
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
                setDriverFollowUps(data.follow_ups || []);
                setDriverDuplicateDrivers(data.duplicate_drivers || []);
                // Also reload drivers list to ensure data is up to date
                router.reload({ 
                    only: ['drivers', 'filterOptions'],
                    preserveState: true,
                    preserveScroll: true
                });
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

    const canDeleteFile = () => {
        return hasPermission('drivers.drivers.delete-document') || hasPermission('drivers.driverdocuments.delete-file');
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
                            // Also reload drivers list to reflect changes
                            router.reload({ 
                                only: ['drivers', 'filterOptions'],
                                preserveState: true,
                                preserveScroll: true
                            });
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
                    // Also reload drivers list to reflect changes
                    router.reload({ 
                        only: ['drivers', 'filterOptions'],
                        preserveState: true,
                        preserveScroll: true
                    });
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

    const handleDeleteFile = async (docId: number) => {
        if (!confirm('Are you sure you want to delete this file? This will set the document status to empty.')) {
            return;
        }
        try {
            await axios.delete(`/drivers/driver-documents/${docId}/delete-file`);
            // Reload driver details and drivers list
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
                    // Also reload drivers list to reflect changes
                    router.reload({ 
                        only: ['drivers', 'filterOptions'],
                        preserveState: true,
                        preserveScroll: true
                    });
                }
            }
        } catch (error) {
            console.error('Error deleting file:', error);
            alert('Failed to delete file. Please try again.');
        }
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
            <Head title="Drivers" />

            <div className={`h-full flex flex-col overflow-hidden ${whatsappWindowOpen && !whatsappFloating ? 'pr-0' : ''}`}>
                <div className={`flex gap-0 flex-1 min-h-0 overflow-hidden ${whatsappWindowOpen && !whatsappFloating ? 'flex-row' : ''}`}>
                    <div className={`flex flex-col flex-1 min-h-0 overflow-hidden ${whatsappWindowOpen && !whatsappFloating ? 'min-w-0' : 'w-full'}`}>
                <div className="px-6 py-2 mb-2 flex items-center justify-between flex-shrink-0">
                    <div>
                        <h1 className="text-xl font-bold">Drivers</h1>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
                            Manage drivers and their onboarding process
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                if (selectedDrivers.size > 0) {
                                    // Export selected drivers
                                    const ids = Array.from(selectedDrivers);
                                    window.location.href = `/drivers/drivers/export?ids=${ids.join(',')}`;
                                } else {
                                    // Export all visible drivers
                                    window.location.href = '/drivers/drivers/export';
                                }
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
                        <div className="flex items-center gap-2 ml-auto">
                            {showWhatsAppButton && whatsAppRidingCompanyId && (
                                <Button
                                    type="button"
                                    variant={whatsappWindowOpen ? "default" : "outline"}
                                    onClick={() => {
                                        if (whatsappWindowOpen) {
                                            setWhatsappWindowOpen(false);
                                            setWhatsappFloating(false);
                                        } else {
                                            setWhatsappWindowOpen(true);
                                        }
                                    }}
                                    className={whatsappWindowOpen ? "bg-[#25d366] hover:bg-[#20ba5a] text-white border-[#25d366]" : "border-[#25d366] text-[#25d366] hover:bg-[#25d366] hover:text-white"}
                                >
                                    <MessageCircle className="h-4 w-4 mr-2" />
                                    {whatsappWindowOpen ? 'Hide WhatsApp' : 'Open WhatsApp Chats'}
                                </Button>
                            )}
                            <Link href="/drivers/drivers/create">
                                <Button>Create Driver</Button>
                            </Link>
                        </div>
                    </div>
                </div>

                <Card className="flex-1 flex flex-col min-h-0 py-2 gap-2">
                    {safeDrivers.length > 0 ? (
                        <>
                            {/* Notification Buttons */}
                            <div className="px-6 py-2 mb-2 flex items-center gap-3 flex-wrap flex-shrink-0">
                                <button
                                    onClick={() => {
                                        setActiveTab('all');
                                        setSelectedListId(null);
                                        setCurrentPage(1);
                                        setSelectedDrivers(new Set());
                                    }}
                                    className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 transition-all ${
                                        activeTab === 'all'
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                                            : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                                    }`}
                                >
                                    <Users className={`h-4 w-4 ${activeTab === 'all' ? 'text-blue-600 dark:text-blue-400' : 'text-neutral-600 dark:text-neutral-400'}`} />
                                    <span className={`text-sm font-medium ${activeTab === 'all' ? 'text-blue-700 dark:text-blue-300' : 'text-neutral-700 dark:text-neutral-300'}`}>
                                        All Drivers
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
                                        setSelectedListId(null);
                                        setCurrentPage(1);
                                        setSelectedDrivers(new Set());
                                    }}
                                    className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 transition-all ${
                                        activeTab === 'new'
                                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20 shadow-md'
                                            : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                                    }`}
                                >
                                    <UserPlus className={`h-4 w-4 ${activeTab === 'new' ? 'text-green-600 dark:text-green-400' : 'text-neutral-600 dark:text-neutral-400'}`} />
                                    <span className={`text-sm font-medium ${activeTab === 'new' ? 'text-green-700 dark:text-green-300' : 'text-neutral-700 dark:text-neutral-300'}`}>
                                        New Drivers
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
                                        setSelectedListId(null);
                                        setCurrentPage(1);
                                        setSelectedDrivers(new Set());
                                    }}
                                    className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 transition-all ${
                                        activeTab === 'today'
                                            ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 shadow-md'
                                            : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                                    }`}
                                >
                                    <Calendar className={`h-4 w-4 ${activeTab === 'today' ? 'text-yellow-600 dark:text-yellow-400' : 'text-neutral-600 dark:text-neutral-400'}`} />
                                    <span className={`text-sm font-medium ${activeTab === 'today' ? 'text-yellow-700 dark:text-yellow-300' : 'text-neutral-700 dark:text-neutral-300'}`}>
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
                                        setSelectedListId(null);
                                        setCurrentPage(1);
                                        setSelectedDrivers(new Set());
                                    }}
                                    className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 transition-all ${
                                        activeTab === 'overdue'
                                            ? 'border-red-500 bg-red-50 dark:bg-red-900/20 shadow-md'
                                            : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                                    }`}
                                >
                                    <AlertCircle className={`h-4 w-4 ${activeTab === 'overdue' ? 'text-red-600 dark:text-red-400' : 'text-neutral-600 dark:text-neutral-400'}`} />
                                    <span className={`text-sm font-medium ${activeTab === 'overdue' ? 'text-red-700 dark:text-red-300' : 'text-neutral-700 dark:text-neutral-300'}`}>
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

                                {/* More Button with Lists */}
                                <div className="flex items-center gap-2">
                                    <div className="relative" ref={moreListsRef}>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setShowMoreLists(!showMoreLists);
                                            }}
                                            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 transition-all ${
                                                selectedListId
                                                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 shadow-md'
                                                    : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                                            }`}
                                        >
                                            <span className={`text-sm font-medium ${selectedListId ? 'text-purple-700 dark:text-purple-300' : 'text-neutral-700 dark:text-neutral-300'}`}>
                                                More
                                            </span>
                                        </button>
                                        {showMoreLists && lists && lists.length > 0 && (
                                            <div className={`absolute top-full left-0 mt-1 z-[9999] bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg min-w-[200px] ${lists.length > 10 ? 'max-h-[400px] overflow-y-auto' : ''}`}>
                                                {lists.map((list: any, index: number) => (
                                                    <div
                                                    key={list.id}
                                                        className={`flex items-center justify-between ${
                                                            selectedListId === list.id
                                                                ? 'bg-purple-50 dark:bg-purple-900/20'
                                                                : ''
                                                        } ${index === 0 ? 'rounded-t-lg' : ''} ${index === lists.length - 1 ? 'rounded-b-lg' : ''}`}
                                                    >
                                                        <button
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                console.log('Selecting list:', list);
                                                                setSelectedListId(list.id);
                                                                setActiveTab('all');
                                                                setShowMoreLists(false);
                                                                setCurrentPage(1);
                                                                setSelectedDrivers(new Set());
                                                            }}
                                                            className={`flex-1 text-left px-4 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors cursor-pointer ${
                                                                selectedListId === list.id
                                                                    ? 'text-purple-700 dark:text-purple-300'
                                                                    : 'text-neutral-700 dark:text-neutral-300'
                                                            }`}
                                                        >
                                                            {list.name}
                                                        </button>
                                                        {isSuperAdmin && (
                                                            <div className="flex items-center gap-1 pr-2" onClick={(e) => e.stopPropagation()}>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                router.get(`/drivers/drivers/lists/${list.id}/edit`);
                                                            }}
                                                            className="p-1 hover:bg-accent rounded"
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (confirm(`Are you sure you want to delete "${list.name}"?`)) {
                                                                        router.delete(`/drivers/drivers/lists/${list.id}`);
                                                                    }
                                                                }}
                                                                className="p-1 hover:bg-destructive/10 text-destructive rounded"
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {isSuperAdmin && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                window.location.href = '/drivers/drivers/lists/create';
                                            }}
                                            className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded transition-all"
                                            title="Add new list"
                                        >
                                            <Plus className="h-4 w-4 text-neutral-700 dark:text-neutral-300" />
                                        </button>
                                    )}
                                    {selectedListId && (() => {
                                        const selectedList = lists.find((l: DriverList) => l.id === selectedListId);
                                        const listDriversCount = filteredDrivers.length;
                                        return selectedList ? (
                                            <div className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-purple-500 bg-purple-50 dark:bg-purple-900/20 shadow-md">
                                                <span className="font-medium text-purple-700 dark:text-purple-300">
                                                    {selectedList.name}
                                                </span>
                                                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-600 text-white">
                                                    {listDriversCount}
                                                </span>
                                            </div>
                                        ) : null;
                                    })()}
                                </div>
                            </div>

                            {/* Table Controls Bar - Always visible and fixed at bottom */}
                            <div className="sticky bottom-0 z-50 bg-card border-t border-border px-6 py-2 flex items-center justify-between gap-4 flex-shrink-0 shadow-[0_-2px_8px_rgba(0,0,0,0.05)] dark:shadow-[0_-2px_8px_rgba(0,0,0,0.2)]">
                                <div className="flex items-center gap-3">
                                    {isAllSelected && sortedAndFilteredDrivers && sortedAndFilteredDrivers.length > 0 && (
                                        <button
                                            onClick={handleSelectAllVisible}
                                            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
                                        >
                                            Select all {sortedAndFilteredDrivers.length} driver(s)
                                        </button>
                                    )}
                                    {selectedDrivers.size > 0 && (
                                        <>
                                            <span className="text-sm text-neutral-900 dark:text-neutral-100">
                                                {selectedDrivers.size} driver(s) selected
                                            </span>
                                            <button
                                                onClick={() => setSelectedDrivers(new Set())}
                                                className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:underline"
                                            >
                                                Deselect
                                            </button>
                                            {selectedDrivers.size >= 2 && selectedDrivers.size <= 3 && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={handleMerge}
                                                >
                                                    Merge
                                                </Button>
                                            )}
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
                                        </>
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
                                                <SelectItem value="15">15</SelectItem>
                                                <SelectItem value="20">20</SelectItem>
                                                <SelectItem value="25">25</SelectItem>
                                                <SelectItem value="50">50</SelectItem>
                                                <SelectItem value="100">100</SelectItem>
                                                <SelectItem value="200">200</SelectItem>
                                                <SelectItem value="300">300</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="text-sm text-neutral-600 dark:text-neutral-400">
                                        Page {currentPage} of {totalPages}
                                    </div>
                                    <div className="text-sm text-neutral-600 dark:text-neutral-400">
                                        Total: {sortedAndFilteredDrivers?.length || 0} driver(s)
                                    </div>
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => setColumnsDialogOpen(true)}
                                    >
                                        <Settings2 className="h-4 w-4 mr-2" />
                                        Columns
                                    </Button>
                                    <Dialog open={columnsDialogOpen} onOpenChange={setColumnsDialogOpen}>
                                        <DialogContent className="max-w-md max-h-[80vh] flex flex-col overflow-hidden">
                                            <DialogHeader className="flex-shrink-0">
                                                <DialogTitle>Toggle Columns</DialogTitle>
                                                <DialogDescription>
                                                    Select which columns to display in the table
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="flex-1 overflow-y-auto mt-4 min-h-0">
                                                <div className="space-y-2 pr-2">
                                                    {allColumnsWithDocuments.filter((col) => {
                                                        // Always show actions column
                                                        if (col.id === 'actions') return true;
                                                        
                                                        // Check field permissions for driver fields
                                                        const fieldName = columnToFieldMap[col.id];
                                                        if (fieldName) {
                                                            // Hide column if field is invisible
                                                            return canViewDriverField(fieldName);
                                                        }
                                                        
                                                        // Show columns that don't have field permissions (like riding_company, team_leader, etc.)
                                                        return true;
                                                    }).map((col) => {
                                                        // Find if this column is in sortedColumns to get visibility state
                                                        const sortedCol = sortedColumns?.find(c => c.id === col.id);
                                                        const isVisible = sortedCol?.visible ?? col.defaultVisible;
                                                        
                                                        return (
                                                            <div key={col.id} className="flex items-center space-x-2 p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800/50 rounded">
                                                                <Checkbox
                                                                    id={`column-${col.id}`}
                                                                    checked={isVisible}
                                                                    onCheckedChange={() => toggleColumnVisibility(col.id)}
                                                                />
                                                                <label
                                                                    htmlFor={`column-${col.id}`}
                                                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                                                                >
                                                                    {col.label || col.id}
                                                                </label>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </div>

                            <div className="relative flex-1 min-h-0 flex flex-col pb-20">
                                <div ref={tableScrollRef} className="drivers-table-scroll overflow-x-scroll overflow-y-auto rounded-lg border flex-1 m-6" style={{ 
                                    scrollbarWidth: 'thin', 
                                    scrollbarColor: '#cbd5e1 #f1f5f9',
                                    position: 'relative',
                                    scrollbarGutter: 'stable'
                                }}>
                                    <style>{`
                                        .drivers-table-scroll {
                                            scrollbar-gutter: stable both-edges;
                                            overflow-x: scroll !important;
                                            overflow-y: auto !important;
                                        }
                                        .drivers-table-scroll::-webkit-scrollbar {
                                            height: 14px;
                                            width: 14px;
                                            -webkit-appearance: none;
                                            display: block !important;
                                            visibility: visible !important;
                                        }
                                        .drivers-table-scroll::-webkit-scrollbar:horizontal {
                                            position: sticky;
                                            bottom: 0;
                                            z-index: 50;
                                            display: block !important;
                                            visibility: visible !important;
                                            opacity: 1 !important;
                                            height: 14px !important;
                                        }
                                        .drivers-table-scroll::-webkit-scrollbar-track:horizontal {
                                            position: sticky;
                                            bottom: 0;
                                            z-index: 50;
                                        }
                                        .drivers-table-scroll::-webkit-scrollbar-thumb:horizontal {
                                            position: sticky;
                                            bottom: 0;
                                            z-index: 50;
                                        }
                                        .drivers-table-scroll::-webkit-scrollbar-track {
                                            background: #f1f5f9;
                                            border-radius: 0;
                                            border-top: 1px solid #e2e8f0;
                                        }
                                        .drivers-table-scroll::-webkit-scrollbar-thumb {
                                            background-color: #cbd5e1;
                                            border-radius: 0;
                                            border: 1px solid #f1f5f9;
                                        }
                                        .drivers-table-scroll::-webkit-scrollbar-thumb:hover {
                                            background-color: #94a3b8;
                                        }
                                        .drivers-table-scroll::-webkit-scrollbar-corner {
                                            background: #f1f5f9;
                                            border-top: 1px solid #e2e8f0;
                                            position: sticky;
                                            bottom: 0;
                                            right: 0;
                                            z-index: 50;
                                        }
                                        .dark .drivers-table-scroll::-webkit-scrollbar-track {
                                            background: #1e293b;
                                            border-top-color: #334155;
                                        }
                                        .dark .drivers-table-scroll::-webkit-scrollbar-thumb {
                                            background-color: #475569;
                                            border-color: #1e293b;
                                        }
                                        .dark .drivers-table-scroll::-webkit-scrollbar-thumb:hover {
                                            background-color: #64748b;
                                        }
                                        .dark .drivers-table-scroll::-webkit-scrollbar-corner {
                                            background: #1e293b;
                                            border-top-color: #334155;
                                        }
                                    `}</style>
                                    <table className="w-full">
                                    <thead className="bg-neutral-100 dark:bg-neutral-800 backdrop-blur-sm sticky top-0 z-30 shadow-sm" style={{ position: 'sticky', top: 0, zIndex: 30, willChange: 'transform' }}>
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
                                                const sortKey = col.id === 'name' ? 'name' : 
                                                               col.id === 'whatsapp' ? 'whatsapp' :
                                                               col.id === 'lead_stage' ? 'lead_stage' :
                                                               col.id === 'driver_stage' ? 'driver_stage' :
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
                                            <th className="px-1 py-1"></th>
                                            {(visibleColumns || []).map((col) => {
                                                if (col.id === 'actions') {
                                                    return <th key={col.id} className="px-1 py-1">
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
                                                                  col.id === 'riding_company' ? 'riding_company_id' :
                                                                  col.id === 'lead_source' ? 'lead_source_id' :
                                                                  col.id === 'lead_status' ? 'lead_status_id' :
                                                                  col.id === 'lead_status_comment' ? 'lead_status_comment' :
                                                                  col.id === 'lead_stage' ? 'lead_stage_id' :
                                                                  col.id === 'driver_stage' ? 'driver_stage_id' :
                                                                  col.id === 'assigned_to' ? 'assigned_to' :
                                                                  col.id === 'team_leader' ? 'team_leader_id' :
                                                                  col.id === 'account_manager' ? 'account_manager_id' :
                                                                  col.id === 'city' ? 'city' :
                                                                  col.id === 'car_or_scooter' ? 'car_or_scooter' :
                                                                  col.id === 'cancel_reason' ? 'cancel_reason' :
                                                                  col.id === 'campaign' ? 'campaign_id' :
                                                                  col.id === 'last_assigned_date' ? 'last_assigned_date' :
                                                                  col.id;
                                                if (col.id === 'last_assigned_date') {
                                                    const hasFromDate = filters.last_assigned_date_from && String(filters.last_assigned_date_from).trim() !== '';
                                                    const hasFromTime = filters.last_assigned_date_from_time && String(filters.last_assigned_date_from_time).trim() !== '';
                                                    const hasToDate = filters.last_assigned_date_to && String(filters.last_assigned_date_to).trim() !== '';
                                                    const hasToTime = filters.last_assigned_date_to_time && String(filters.last_assigned_date_to_time).trim() !== '';
                                                    const hasActiveDateFilter = hasFromDate || hasToDate;
                                                    
                                                    const formatDisplayValue = () => {
                                                        if (!hasActiveDateFilter) return 'Select date range...';
                                                        const fromStr = hasFromDate 
                                                            ? `${String(filters.last_assigned_date_from)}${hasFromTime ? ' ' + String(filters.last_assigned_date_from_time) : ' 00:00'}` 
                                                            : '...';
                                                        const toStr = hasToDate 
                                                            ? `${String(filters.last_assigned_date_to)}${hasToTime ? ' ' + String(filters.last_assigned_date_to_time) : ' 23:59'}`
                                                            : '...';
                                                        return `${fromStr} - ${toStr}`;
                                                    };
                                                    
                                                    const tempFrom = tempDateFilters[`last_assigned_date_from`] ?? filters.last_assigned_date_from;
                                                    const tempFromTime = tempDateFilters[`last_assigned_date_from_time`] ?? filters.last_assigned_date_from_time;
                                                    const tempTo = tempDateFilters[`last_assigned_date_to`] ?? filters.last_assigned_date_to;
                                                    const tempToTime = tempDateFilters[`last_assigned_date_to_time`] ?? filters.last_assigned_date_to_time;
                                                    
                                                    return (
                                                        <th key={col.id} className="px-1 py-1">
                                                            <div className="relative">
                                                                <DropdownMenu open={dateRangeDropdownOpen.last_assigned_date || false} onOpenChange={(open) => {
                                                                    setDateRangeDropdownOpen({...dateRangeDropdownOpen, last_assigned_date: open});
                                                                    if (open) {
                                                                        // Initialize temp values with current filter values
                                                                        setTempDateFilters(prev => ({
                                                                            ...prev,
                                                                            [`last_assigned_date_from`]: filters.last_assigned_date_from || '',
                                                                            [`last_assigned_date_from_time`]: filters.last_assigned_date_from_time || '00:00',
                                                                            [`last_assigned_date_to`]: filters.last_assigned_date_to || '',
                                                                            [`last_assigned_date_to_time`]: filters.last_assigned_date_to_time || '23:59',
                                                                        }));
                                                                    }
                                                                }}>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            className="w-full text-[10px] h-6 justify-start text-left font-normal bg-neutral-100 dark:bg-neutral-800/50 rounded-md"
                                                                        >
                                                                            {formatDisplayValue()}
                                                                        </Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent className="w-96 p-4" side="bottom" align="start" sideOffset={0} alignOffset={0}>
                                                                        <div className="space-y-4">
                                                                            <div>
                                                                                <label className="text-xs font-medium mb-1 block">From Date</label>
                                                                                <div className="flex gap-2">
                                                                                    <Input
                                                                                        type="date"
                                                                                        value={tempFrom ? String(tempFrom) : ''}
                                                                                        onChange={(e) => {
                                                                                            setTempDateFilters(prev => ({
                                                                                                ...prev,
                                                                                                [`last_assigned_date_from`]: e.target.value,
                                                                                                [`last_assigned_date_from_time`]: e.target.value && !tempFromTime ? '00:00' : tempFromTime,
                                                                                            }));
                                                                                        }}
                                                                                        onClick={(e) => {
                                                                                            const input = e.target as HTMLInputElement;
                                                                                            input.showPicker?.();
                                                                                        }}
                                                                                        onFocus={(e) => {
                                                                                            e.target.showPicker?.();
                                                                                        }}
                                                                                        className="flex-1 text-xs h-8 cursor-pointer bg-neutral-100 dark:bg-neutral-800/50"
                                                                                    />
                                                                                    <Input
                                                                                        type="time"
                                                                                        value={tempFromTime ? String(tempFromTime) : '00:00'}
                                                                                        onChange={(e) => setTempDateFilters(prev => ({...prev, [`last_assigned_date_from_time`]: e.target.value}))}
                                                                                        className="w-32 text-xs h-8 bg-neutral-100 dark:bg-neutral-800/50"
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                            <div>
                                                                                <label className="text-xs font-medium mb-1 block">To Date</label>
                                                                                <div className="flex gap-2">
                                                                                    <Input
                                                                                        type="date"
                                                                                        value={tempTo ? String(tempTo) : ''}
                                                                                        onChange={(e) => {
                                                                                            setTempDateFilters(prev => ({
                                                                                                ...prev,
                                                                                                [`last_assigned_date_to`]: e.target.value,
                                                                                                [`last_assigned_date_to_time`]: e.target.value && !tempToTime ? '23:59' : tempToTime,
                                                                                            }));
                                                                                        }}
                                                                                        onClick={(e) => {
                                                                                            const input = e.target as HTMLInputElement;
                                                                                            input.showPicker?.();
                                                                                        }}
                                                                                        onFocus={(e) => {
                                                                                            e.target.showPicker?.();
                                                                                        }}
                                                                                        className="flex-1 text-xs h-8 cursor-pointer bg-neutral-100 dark:bg-neutral-800/50"
                                                                                    />
                                                                                    <Input
                                                                                        type="time"
                                                                                        value={tempToTime ? String(tempToTime) : '23:59'}
                                                                                        onChange={(e) => setTempDateFilters(prev => ({...prev, [`last_assigned_date_to_time`]: e.target.value}))}
                                                                                        className="w-32 text-xs h-8 bg-neutral-100 dark:bg-neutral-800/50"
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex gap-2">
                                                                                <Button
                                                                                    variant="default"
                                                                                    size="sm"
                                                                                    className="flex-1 text-xs h-7"
                                                                                    onClick={() => {
                                                                                        handleFilterChange('last_assigned_date_from', tempFrom);
                                                                                        handleFilterChange('last_assigned_date_to', tempTo);
                                                                                        handleFilterChange('last_assigned_date_from_time', tempFromTime || '00:00');
                                                                                        handleFilterChange('last_assigned_date_to_time', tempToTime || '23:59');
                                                                                        setDateRangeDropdownOpen({...dateRangeDropdownOpen, last_assigned_date: false});
                                                                                    }}
                                                                                >
                                                                                    Apply
                                                                                </Button>
                                                                                <Button
                                                                                    variant="outline"
                                                                                    size="sm"
                                                                                    className="flex-1 text-xs h-7"
                                                                                    onClick={() => {
                                                                                        handleFilterChange('last_assigned_date_from', '');
                                                                                        handleFilterChange('last_assigned_date_to', '');
                                                                                        handleFilterChange('last_assigned_date_from_time', '');
                                                                                        handleFilterChange('last_assigned_date_to_time', '');
                                                                                        setTempDateFilters(prev => {
                                                                                            const newTemp = {...prev};
                                                                                            delete newTemp[`last_assigned_date_from`];
                                                                                            delete newTemp[`last_assigned_date_from_time`];
                                                                                            delete newTemp[`last_assigned_date_to`];
                                                                                            delete newTemp[`last_assigned_date_to_time`];
                                                                                            return newTemp;
                                                                                        });
                                                                                        setDateRangeDropdownOpen({...dateRangeDropdownOpen, last_assigned_date: false});
                                                                                    }}
                                                                                >
                                                                                    Clear
                                                                                </Button>
                                                                            </div>
                                                                        </div>
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                                {hasActiveDateFilter && (
                                                                    <button
                                                                        onClick={() => {
                                                                            clearFilter('last_assigned_date_from');
                                                                            clearFilter('last_assigned_date_to');
                                                                            clearFilter('last_assigned_date_from_time');
                                                                            clearFilter('last_assigned_date_to_time');
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
                                                // Date range filters for last_assigned_date, updated_at, created_at, last_follow_up, next_follow_up
                                                const dateTimeFields = ['last_assigned_date', 'updated_at', 'created_at', 'last_follow_up', 'next_follow_up'];
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
                                                    
                                                    const tempFrom = tempDateFilters[`${fieldName}_from`] ?? (filters[`${fieldName}_from` as keyof typeof filters] || '');
                                                    const tempFromTime = tempDateFilters[`${fieldName}_from_time`] ?? (filters[`${fieldName}_from_time` as keyof typeof filters] || '00:00');
                                                    const tempTo = tempDateFilters[`${fieldName}_to`] ?? (filters[`${fieldName}_to` as keyof typeof filters] || '');
                                                    const tempToTime = tempDateFilters[`${fieldName}_to_time`] ?? (filters[`${fieldName}_to_time` as keyof typeof filters] || '23:59');
                                                    
                                                    return (
                                                        <th key={col.id} className="px-1 py-1">
                                                            <div className="relative">
                                                                <DropdownMenu open={dateRangeDropdownOpen[fieldName as keyof typeof dateRangeDropdownOpen] || false} onOpenChange={(open) => {
                                                                    setDateRangeDropdownOpen({...dateRangeDropdownOpen, [fieldName]: open});
                                                                    if (open) {
                                                                        // Initialize temp values with current filter values
                                                                        setTempDateFilters(prev => ({
                                                                            ...prev,
                                                                            [`${fieldName}_from`]: filters[`${fieldName}_from` as keyof typeof filters] || '',
                                                                            [`${fieldName}_from_time`]: filters[`${fieldName}_from_time` as keyof typeof filters] || '00:00',
                                                                            [`${fieldName}_to`]: filters[`${fieldName}_to` as keyof typeof filters] || '',
                                                                            [`${fieldName}_to_time`]: filters[`${fieldName}_to_time` as keyof typeof filters] || '23:59',
                                                                        }));
                                                                    }
                                                                }}>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            className="w-full text-[10px] h-6 justify-start text-left font-normal bg-neutral-100 dark:bg-neutral-800/50 rounded-md"
                                                                        >
                                                                            {formatDisplayValue()}
                                                                        </Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent className="w-96 p-4" side="bottom" align="start" sideOffset={0} alignOffset={0}>
                                                                        <div className="space-y-4">
                                                                            <div>
                                                                                <label className="text-xs font-medium mb-1 block">From Date</label>
                                                                                <div className="flex gap-2">
                                                                                    <Input
                                                                                        type="date"
                                                                                        value={tempFrom ? String(tempFrom) : ''}
                                                                                        onChange={(e) => {
                                                                                            setTempDateFilters(prev => ({
                                                                                                ...prev,
                                                                                                [`${fieldName}_from`]: e.target.value,
                                                                                                [`${fieldName}_from_time`]: e.target.value && !tempFromTime ? '00:00' : tempFromTime,
                                                                                            }));
                                                                                        }}
                                                                                        onClick={(e) => {
                                                                                            const input = e.target as HTMLInputElement;
                                                                                            input.showPicker?.();
                                                                                        }}
                                                                                        onFocus={(e) => {
                                                                                            e.target.showPicker?.();
                                                                                        }}
                                                                                        className="flex-1 text-xs h-8 cursor-pointer bg-neutral-100 dark:bg-neutral-800/50"
                                                                                    />
                                                                                    <Input
                                                                                        type="time"
                                                                                        value={tempFromTime ? String(tempFromTime) : '00:00'}
                                                                                        onChange={(e) => setTempDateFilters(prev => ({...prev, [`${fieldName}_from_time`]: e.target.value}))}
                                                                                        className="w-32 text-xs h-8 bg-neutral-100 dark:bg-neutral-800/50"
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                            <div>
                                                                                <label className="text-xs font-medium mb-1 block">To Date</label>
                                                                                <div className="flex gap-2">
                                                                                    <Input
                                                                                        type="date"
                                                                                        value={tempTo ? String(tempTo) : ''}
                                                                                        onChange={(e) => {
                                                                                            setTempDateFilters(prev => ({
                                                                                                ...prev,
                                                                                                [`${fieldName}_to`]: e.target.value,
                                                                                                [`${fieldName}_to_time`]: e.target.value && !tempToTime ? '23:59' : tempToTime,
                                                                                            }));
                                                                                        }}
                                                                                        onClick={(e) => {
                                                                                            const input = e.target as HTMLInputElement;
                                                                                            input.showPicker?.();
                                                                                        }}
                                                                                        onFocus={(e) => {
                                                                                            e.target.showPicker?.();
                                                                                        }}
                                                                                        className="flex-1 text-xs h-8 cursor-pointer bg-neutral-100 dark:bg-neutral-800/50"
                                                                                    />
                                                                                    <Input
                                                                                        type="time"
                                                                                        value={tempToTime ? String(tempToTime) : '23:59'}
                                                                                        onChange={(e) => setTempDateFilters(prev => ({...prev, [`${fieldName}_to_time`]: e.target.value}))}
                                                                                        className="w-32 text-xs h-8 bg-neutral-100 dark:bg-neutral-800/50"
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex gap-2">
                                                                                <Button
                                                                                    variant="default"
                                                                                    size="sm"
                                                                                    className="flex-1 text-xs h-7"
                                                                                    onClick={() => {
                                                                                        handleFilterChange(`${fieldName}_from`, tempFrom);
                                                                                        handleFilterChange(`${fieldName}_to`, tempTo);
                                                                                        handleFilterChange(`${fieldName}_from_time`, tempFromTime || '00:00');
                                                                                        handleFilterChange(`${fieldName}_to_time`, tempToTime || '23:59');
                                                                                        setDateRangeDropdownOpen({...dateRangeDropdownOpen, [fieldName]: false});
                                                                                    }}
                                                                                >
                                                                                    Apply
                                                                                </Button>
                                                                                <Button
                                                                                    variant="outline"
                                                                                    size="sm"
                                                                                    className="flex-1 text-xs h-7"
                                                                                    onClick={() => {
                                                                                        handleFilterChange(`${fieldName}_from`, '');
                                                                                        handleFilterChange(`${fieldName}_to`, '');
                                                                                        handleFilterChange(`${fieldName}_from_time`, '');
                                                                                        handleFilterChange(`${fieldName}_to_time`, '');
                                                                                        setTempDateFilters(prev => {
                                                                                            const newTemp = {...prev};
                                                                                            delete newTemp[`${fieldName}_from`];
                                                                                            delete newTemp[`${fieldName}_from_time`];
                                                                                            delete newTemp[`${fieldName}_to`];
                                                                                            delete newTemp[`${fieldName}_to_time`];
                                                                                            return newTemp;
                                                                                        });
                                                                                        setDateRangeDropdownOpen({...dateRangeDropdownOpen, [fieldName]: false});
                                                                                    }}
                                                                                >
                                                                                    Clear
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
                                                if (['campaign', 'lead_source', 'lead_status', 'lead_stage', 'assigned_to', 'team_leader', 'account_manager', 'riding_company', 'city', 'car_or_scooter', 'cancel_reason', 'last_assigned_by'].includes(col.id)) {
                                                    const cancelReasonOptions = [
                                                        'Not interested',
                                                        'Wrong Number',
                                                        'Under Age',
                                                        'Duplicated',
                                                        'Wrong Documents',
                                                        'Car Not Accepted',
                                                        'Other',
                                                        'Already driver',
                                                        'Expired',
                                                        'Cities',
                                                        'Dont have driving license'
                                                    ];
                                                    
                                                    const carOrScooterOptions = ['Car', 'Scooter'];
                                                    
                                                    const options = col.id === 'campaign' ? (filterOptions?.campaigns || []) :
                                                                  col.id === 'lead_source' ? (filterOptions?.leadSources || []) :
                                                                  col.id === 'lead_status' ? (filterOptions?.leadStatuses || []) :
                                                                  col.id === 'lead_stage' ? ((filterOptions as any)?.leadStages || []) :
                                                                  col.id === 'assigned_to' ? (filterOptions?.users || []) :
                                                                  col.id === 'team_leader' ? (filterOptions?.users || []) :
                                                                  col.id === 'account_manager' ? (filterOptions?.users || []) :
                                                                  col.id === 'last_assigned_by' ? (filterOptions?.users || []) :
                                                                  col.id === 'riding_company' ? (filterOptions?.ridingCompanies || []) :
                                                                  col.id === 'city' ? EGYPT_GOVERNORATES.map((gov) => ({ id: gov, name: gov })) :
                                                                  col.id === 'car_or_scooter' ? carOrScooterOptions.map((val) => ({ id: val, name: val })) :
                                                                  col.id === 'cancel_reason' ? cancelReasonOptions.map((val) => ({ id: val, name: val })) : [];
                                                    
                                                    const selectedOption = options.find((opt: any) => String(opt.id) === String(filters[filterKey]));
                                                    const displayValue = filters[filterKey] === 'is_empty' ? 'Is Empty' : 
                                                        (col.id === 'city' || col.id === 'car_or_scooter' || col.id === 'cancel_reason' ? 
                                                            (filters[filterKey] ? String(filters[filterKey]) : '') : 
                                                            selectedOption?.name || '');
                                                    
                                                    return (
                                                        <th key={col.id} className="px-1 py-1 p-0 relative">
                                                            <FilterDropdown
                                                                options={options}
                                                                value={filters[filterKey]}
                                                                displayValue={displayValue}
                                                                onSelect={(value) => {
                                                                    if (col.id === 'city' || col.id === 'car_or_scooter' || col.id === 'cancel_reason') {
                                                                        handleFilterChange(filterKey, value === 'is_empty' ? 'is_empty' : String(value));
                                                                    } else {
                                                                        handleFilterChange(filterKey, value);
                                                                    }
                                                                }}
                                                                onClear={() => clearFilter(filterKey)}
                                                                hasActiveFilter={hasActiveFilter(filterKey)}
                                                            />
                                                        </th>
                                                    );
                                                }
                                                return (
                                                    <th key={col.id} className="px-1 py-1">
                                                        <div className="relative">
                                                            <Input
                                                                type={col.id === 'duplicate' || col.id === 'feedback_count' ? 'number' : 'text'}
                                                                value={
                                                                    filters[filterKey] === 'is_empty' || 
                                                                    filters[filterKey] === null || 
                                                                    filters[filterKey] === undefined
                                                                        ? ''
                                                                        : String(filters[filterKey])
                                                                }
                                                                onChange={(e) => {
                                                                    const value = col.id === 'duplicate' || col.id === 'feedback_count'
                                                                        ? (e.target.value === '' ? '' : Number(e.target.value))
                                                                        : e.target.value;
                                                                    setFilters((prev) => ({
                                                                        ...prev,
                                                                        [filterKey]: value,
                                                                    }));
                                                                }}
                                                                className="w-full text-[10px] h-6 px-1.5 pr-6 bg-neutral-100 dark:bg-neutral-800/50 rounded-md"
                                                            />
                                                            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                                                                {hasActiveFilter(filterKey) && (
                                                                    <button
                                                                        onClick={() => clearFilter(filterKey)}
                                                                        className="text-red-500 hover:text-red-700"
                                                                        title="Clear filter"
                                                                    >
                                                                        <X className="h-2.5 w-2.5" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </th>
                                                );
                                            })}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 bg-white dark:bg-neutral-900">
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
                                            (paginatedDrivers || []).map((driver, index) => (
                                                <tr
                                                    key={driver.id}
                                                    className={`
                                                        transition-colors duration-150 cursor-pointer
                                                        ${
                                                            selectedDrivers.has(driver.id)
                                                                ? 'bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 dark:hover:bg-blue-900'
                                                                : index % 2 === 0
                                                                  ? 'bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                                                                  : 'bg-neutral-50 dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800'
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
                                                        
                                                        // If this is a potential double click (within 500ms), wait a bit
                                                        if (timeSinceLastClick < 500) {
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
                                                            router.visit(`/drivers/drivers/${driver.id}`);
                                                        }, 500);
                                                        
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
                                                        if (canQuickEdit()) {
                                                            setQuickEditDialog({ open: true, driver });
                                                        }
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
                                                        // Double-check permissions before rendering cell
                                                        const fieldName = columnToFieldMap[col.id];
                                                        if (fieldName && !canViewDriverField(fieldName)) {
                                                            return null; // Don't render invisible fields
                                                        }
                                                        
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
                                                                        {canQuickEdit() && (
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
                                                                        )}
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
                                                        const columnDef = allColumnsWithDocuments.find(c => c.id === col.id);
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
                                                                            <div className="absolute z-[9999] flex gap-2 bg-white dark:bg-neutral-800 p-3 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 pointer-events-auto"
                                                                                style={{ 
                                                                                    left: '100%',
                                                                                    top: '50%',
                                                                                    marginLeft: '8px',
                                                                                    transform: 'translateY(-50%)'
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
                                                                            <div className="absolute z-[9999] flex gap-2 bg-white dark:bg-neutral-800 p-3 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 pointer-events-auto"
                                                                                style={{ 
                                                                                    left: '100%',
                                                                                    top: '50%',
                                                                                    marginLeft: '8px',
                                                                                    transform: 'translateY(-50%)'
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
                                                            case 'lead_status_comment':
                                                                cellContent = driver.lead_status_comment ? (
                                                                    <div className="max-w-xs truncate" title={driver.lead_status_comment}>
                                                                        {driver.lead_status_comment}
                                                                    </div>
                                                                ) : '-';
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
                                                                cellContent = driver.lead_stage ? (
                                                                    <Badge 
                                                                        variant="outline"
                                                                        style={driver.lead_stage.color ? {
                                                                            borderColor: driver.lead_stage.color,
                                                                            color: driver.lead_stage.color,
                                                                        } : {}}
                                                                    >
                                                                        {driver.lead_stage.name}
                                                                    </Badge>
                                                                ) : '-';
                                                                break;
                                                            case 'driver_stage':
                                                                cellContent = driver.driver_stage?.name || '-';
                                                                break;
                                                            case 'current_stage':
                                                                cellContent = (driver as any).current_stage?.name || '-';
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
                                                            case 'team_leader':
                                                                cellContent = driver.team_leader?.name || '-';
                                                                break;
                                                            case 'account_manager':
                                                                cellContent = driver.account_manager?.name || '-';
                                                                break;
                                                            case 'resigned_leads':
                                                                cellContent = driver.resigned_leads || '-';
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
                                                            case 'last_assigned_date':
                                                                cellContent = (driver as any).last_assigned_time ? (
                                                                    <span>{formatDate((driver as any).last_assigned_time)}</span>
                                                                ) : '-';
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
                                                            case 'cancel_reason':
                                                                cellContent = (driver as any).cancel_reason || '-';
                                                                break;
                                                            case 'vehicle_type':
                                                                cellContent = (driver as any).vehicle_type || '-';
                                                                break;
                                                            case 'car_or_scooter':
                                                                cellContent = (driver as any).car_or_scooter || '-';
                                                                break;
                                                            case 'has_worked_before':
                                                                cellContent = (driver as any).has_worked_before || '-';
                                                                break;
                                                            case 'city':
                                                                cellContent = (driver as any).city || '-';
                                                                break;
                                                            case 'feedback_count':
                                                                cellContent = (driver as any).feedback_count ?? 0;
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
                                                            default:
                                                                // Check if this is a document column
                                                                if (col.id.startsWith('document_')) {
                                                                    const docColumnDef = allColumnsWithDocuments.find(c => c.id === col.id) as any;
                                                                    const docName = docColumnDef?.documentName;
                                                                    if (docName) {
                                                                        const driverDoc = driver.documents?.[docName];
                                                                        const driverRidingCompanyId = driver.riding_company?.id;
                                                                        
                                                                        // Check if document is required for this driver's riding company
                                                                        // First check documentsByRidingCompany (from driver documents)
                                                                        let isRequired = driverRidingCompanyId && documentsByRidingCompany && documentsByRidingCompany[driverRidingCompanyId]?.includes(docName);
                                                                        
                                                                        // Also check allDocumentRequirements (active requirements)
                                                                        if (!isRequired && driverRidingCompanyId && allDocumentRequirements) {
                                                                            isRequired = allDocumentRequirements.some(req => 
                                                                                req.name === docName && 
                                                                                req.riding_company_id === driverRidingCompanyId &&
                                                                                req.active === true
                                                                            );
                                                                        }
                                                                        
                                                                        if (!isRequired) {
                                                                            cellContent = <span className="text-sm text-neutral-500 italic">Not Required</span>;
                                                                        } else if (driverDoc) {
                                                                            // Check if file is uploaded
                                                                            const hasFile = driverDoc.uploaded_path;
                                                                            const status = driverDoc.status || 'pending';
                                                                            
                                                                            if (!hasFile) {
                                                                                // Show EMPTY button (disabled) if no file uploaded
                                                                                cellContent = (
                                                                                    <Button
                                                                                        variant="outline"
                                                                                        size="sm"
                                                                                        className="h-7 px-3 text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                                                                                        disabled
                                                                                    >
                                                                                        EMPTY
                                                                                    </Button>
                                                                                );
                                                                            } else {
                                                                                // Show status dropdown only if file is uploaded
                                                                                cellContent = (
                                                                                    <DropdownMenu>
                                                                                        <DropdownMenuTrigger asChild>
                                                                                            <Button
                                                                                                variant="outline"
                                                                                                size="sm"
                                                                                                className={`h-7 px-3 text-xs ${
                                                                                                    status === 'pending' ? 'bg-yellow-500 hover:bg-yellow-600 text-white' :
                                                                                                    status === 'approved' ? 'bg-green-500 hover:bg-green-600 text-white' :
                                                                                                    status === 'rejected' ? 'bg-red-500 hover:bg-red-600 text-white' :
                                                                                                    'hover:bg-neutral-100 dark:hover:bg-neutral-800'
                                                                                                }`}
                                                                                            >
                                                                                                {status.toUpperCase()}
                                                                                            </Button>
                                                                                        </DropdownMenuTrigger>
                                                                                        <DropdownMenuContent align="end">
                                                                                            <DropdownMenuItem
                                                                                                onClick={() => {
                                                                                                    handleUpdateDocumentStatus(driver.id, driverDoc.id, 'pending');
                                                                                                }}
                                                                                            >
                                                                                                PENDING
                                                                                            </DropdownMenuItem>
                                                                                            <DropdownMenuItem
                                                                                                onClick={() => {
                                                                                                    handleUpdateDocumentStatus(driver.id, driverDoc.id, 'approved');
                                                                                                }}
                                                                                            >
                                                                                                APPROVED
                                                                                            </DropdownMenuItem>
                                                                                            <DropdownMenuItem
                                                                                                onClick={() => {
                                                                                                    handleUpdateDocumentStatus(driver.id, driverDoc.id, 'rejected');
                                                                                                }}
                                                                                            >
                                                                                                REJECT
                                                                                            </DropdownMenuItem>
                                                                                            <DropdownMenuItem
                                                                                                onClick={() => {
                                                                                                    handleDeleteDocumentFile(driver.id, driverDoc.id);
                                                                                                }}
                                                                                                className="text-red-600 dark:text-red-400"
                                                                                            >
                                                                                                DELETE
                                                                                            </DropdownMenuItem>
                                                                                        </DropdownMenuContent>
                                                                                    </DropdownMenu>
                                                                                );
                                                                            }
                                                                        } else {
                                                                            cellContent = (
                                                                                <DropdownMenu>
                                                                                    <DropdownMenuTrigger asChild>
                                                                                        <Button
                                                                                            variant="outline"
                                                                                            size="sm"
                                                                                            className="h-7 px-3 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                                                                            disabled
                                                                                        >
                                                                                            EMPTY
                                                                                        </Button>
                                                                                    </DropdownMenuTrigger>
                                                                                </DropdownMenu>
                                                                            );
                                                                        }
                                                                    } else {
                                                                        cellContent = '-';
                                                                    }
                                                                } else {
                                                                    cellContent = '-';
                                                                }
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
                        <div className="p-6 text-center py-6 text-neutral-500">
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
                {quickEditDialog.driver && quickEditDialog.open && (
                    <QuickEditDialog
                        key={`quick-edit-dialog-${quickEditDialog.driver.id}`}
                        driver={quickEditDialog.driver}
                        open={quickEditDialog.open}
                        onOpenChange={(open) => {
                            if (!open) {
                                setQuickEditDialog({ open: false, driver: null });
                            }
                        }}
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

                {/* Merge Drivers Dialog */}
                <Dialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen}>
                    <DialogContent className="!max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
                        <DialogHeader>
                            <DialogTitle>Merge Records In &gt; Drivers</DialogTitle>
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
                                                            <Link href={`/drivers/drivers/${driver.id}`} className="text-blue-600 hover:underline" target="_blank">
                                                                Record #{driver.id}
                                                            </Link>
                                                        </div>
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-neutral-900">
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
                                            
                                            {/* Riding Company */}
                                            <tr className="border-b hover:bg-muted/50">
                                                <td className="px-4 py-3 text-sm font-medium">Riding Company</td>
                                                {mergeDrivers.map((driver) => (
                                                    <td key={driver.id} className="px-4 py-3 text-sm">
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="radio"
                                                                name="riding_company_id"
                                                                value={driver.id}
                                                                defaultChecked={mergeDrivers[0].id === driver.id}
                                                                className="w-4 h-4"
                                                            />
                                                            <span>{driver.riding_company?.name || '-'}</span>
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
                                            
                                            {/* Driver Stage */}
                                            <tr className="border-b hover:bg-muted/50">
                                                <td className="px-4 py-3 text-sm font-medium">Driver Stage</td>
                                                {mergeDrivers.map((driver) => (
                                                    <td key={driver.id} className="px-4 py-3 text-sm">
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="radio"
                                                                name="driver_stage_id"
                                                                value={driver.id}
                                                                defaultChecked={mergeDrivers[0].id === driver.id}
                                                                className="w-4 h-4"
                                                            />
                                                            <span>{driver.driver_stage?.name || '-'}</span>
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
                                                'full_name', 'phone', 'whatsapp_phone', 'email', 'riding_company_id', 
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
                                                        if (fieldName === 'riding_company_id') {
                                                            fieldMappings[fieldName] = selectedDriver.riding_company?.id?.toString() || '';
                                                        } else if (fieldName === 'campaign_id') {
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
                                                await router.post('/drivers/drivers/merge', {
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
                                                        alert('Failed to merge drivers. Please try again.');
                                                    },
                                                });
                                            } catch (error) {
                                                console.error('Merge error:', error);
                                                alert('Failed to merge drivers. Please try again.');
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
                                {viewDialogTab === 'overview' && (
                                    <div className="space-y-6">
                                        {/* Personal Information & CRM Information */}
                                        <div className="grid gap-6 md:grid-cols-2">
                                            <Card className="p-6">
                                                <h2 className="mb-4 text-lg font-semibold">Personal Information</h2>
                                                <div className="space-y-4">
                                                    {canViewDriverField('full_name') && (
                                                        <div className="flex items-start gap-2">
                                                            <User className="mt-0.5 h-4 w-4 text-neutral-500" />
                                                            <div className="flex-1">
                                                                <p className="text-sm text-neutral-500">Full Name</p>
                                                                <p className="font-medium">{driverDetails.full_name}</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {canViewDriverField('phone') && (
                                                        <div className="flex items-start gap-2">
                                                            <Phone className="mt-0.5 h-4 w-4 text-neutral-500" />
                                                            <div className="flex-1">
                                                                <p className="text-sm text-neutral-500">Phone</p>
                                                                <p className="font-medium">{driverDetails.phone}</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {canViewDriverField('whatsapp_phone') && driverDetails.whatsapp_phone && (
                                                        <div className="flex items-start gap-2">
                                                            <Phone className="mt-0.5 h-4 w-4 text-neutral-500" />
                                                            <div className="flex-1">
                                                                <p className="text-sm text-neutral-500">WhatsApp</p>
                                                                <p className="font-medium">{driverDetails.whatsapp_phone}</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {canViewDriverField('email') && driverDetails.email && (
                                                        <div className="flex items-start gap-2">
                                                            <Mail className="mt-0.5 h-4 w-4 text-neutral-500" />
                                                            <div className="flex-1">
                                                                <p className="text-sm text-neutral-500">Email</p>
                                                                <p className="font-medium">{driverDetails.email}</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {canViewDriverField('city') && driverDetails.city && (
                                                        <div className="flex items-start gap-2">
                                                            <MapPin className="mt-0.5 h-4 w-4 text-neutral-500" />
                                                            <div className="flex-1">
                                                                <p className="text-sm text-neutral-500">City</p>
                                                                <p className="font-medium">{driverDetails.city}</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {canViewDriverField('vehicle_type') && driverDetails.vehicle_type && (
                                                        <div className="flex items-start gap-2">
                                                            <Car className="mt-0.5 h-4 w-4 text-neutral-500" />
                                                            <div className="flex-1">
                                                                <p className="text-sm text-neutral-500">Vehicle Type</p>
                                                                <p className="font-medium">{driverDetails.vehicle_type}</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {canViewDriverField('car_or_scooter') && driverDetails.car_or_scooter && (
                                                        <div className="flex items-start gap-2">
                                                            <Car className="mt-0.5 h-4 w-4 text-neutral-500" />
                                                            <div className="flex-1">
                                                                <p className="text-sm text-neutral-500">Car or Scooter</p>
                                                                <p className="font-medium">{driverDetails.car_or_scooter}</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {canViewDriverField('has_worked_before') && driverDetails.has_worked_before && (
                                                        <div className="flex items-start gap-2">
                                                            <User className="mt-0.5 h-4 w-4 text-neutral-500" />
                                                            <div className="flex-1">
                                                                <p className="text-sm text-neutral-500">Has Worked Before</p>
                                                                <p className="font-medium">{driverDetails.has_worked_before}</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {canViewDriverField('worked_with_us_before') && driverDetails.worked_with_us_before && (
                                                        <div className="flex items-start gap-2">
                                                            <User className="mt-0.5 h-4 w-4 text-neutral-500" />
                                                            <div className="flex-1">
                                                                <p className="text-sm text-neutral-500">Worked With Us Before</p>
                                                                <p className="text-sm whitespace-pre-wrap">{driverDetails.worked_with_us_before}</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {canViewDriverField('vehicle_type_and_year') && driverDetails.vehicle_type_and_year && (
                                                        <div className="flex items-start gap-2">
                                                            <Car className="mt-0.5 h-4 w-4 text-neutral-500" />
                                                            <div className="flex-1">
                                                                <p className="text-sm text-neutral-500">Vehicle Type and Year</p>
                                                                <p className="text-sm whitespace-pre-wrap">{driverDetails.vehicle_type_and_year}</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {canViewDriverField('feedback_count') && driverDetails.feedback_count !== undefined && (
                                                        <div className="flex items-start gap-2">
                                                            <MessageCircle className="mt-0.5 h-4 w-4 text-neutral-500" />
                                                            <div className="flex-1">
                                                                <p className="text-sm text-neutral-500">Feedback Count</p>
                                                                <p className="font-medium">{driverDetails.feedback_count ?? 0}</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {canViewDriverField('duplicate') && driverDetails.duplicate !== undefined && (
                                                        <div className="flex items-start gap-2">
                                                            <User className="mt-0.5 h-4 w-4 text-neutral-500" />
                                                            <div className="flex-1">
                                                                <p className="text-sm text-neutral-500">Duplicate Count</p>
                                                                <p className="font-medium">{driverDetails.duplicate ?? 0}</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {canViewDriverField('confirm_duplicate') && (
                                                        <div className="flex items-start gap-2">
                                                            <CheckCircle2 className="mt-0.5 h-4 w-4 text-neutral-500" />
                                                            <div className="flex-1">
                                                                <p className="text-sm text-neutral-500">Confirm Duplicate</p>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <Checkbox
                                                                        checked={driverDetails.confirm_duplicate || false}
                                                                        disabled
                                                                        className="pointer-events-none"
                                                                    />
                                                                    <span className="text-sm font-medium">
                                                                        {driverDetails.confirm_duplicate ? 'Yes' : 'No'}
                                                                    </span>
                                                                </div>
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
                                                    {canViewDriverField('riding_company') && (
                                                        <div>
                                                            <p className="text-sm text-neutral-500">Riding Company</p>
                                                            <p className="font-medium">
                                                                {driverDetails.riding_company?.name || <span className="text-neutral-400 italic">Not Set</span>}
                                                            </p>
                                                        </div>
                                                    )}
                                                    {canViewDriverField('campaign') && driverDetails.campaign && (
                                                        <div>
                                                            <p className="text-sm text-neutral-500">Campaign</p>
                                                            <p className="font-medium">{driverDetails.campaign.name}</p>
                                                        </div>
                                                    )}
                                                    {canViewDriverField('lead_source') && (
                                                        <div>
                                                            <p className="text-sm text-neutral-500">Lead Source</p>
                                                        <p className="font-medium">
                                                            {driverDetails.lead_source?.name || <span className="text-neutral-400 italic">Not Set</span>}
                                                        </p>
                                                        </div>
                                                    )}
                                                    {canViewDriverField('lead_status') && (
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
                                                    )}
                                                    {canViewDriverField('lead_status_comment') && (
                                                        <div>
                                                            <p className="text-sm text-neutral-500">Feedback Comment</p>
                                                            {driverDetails.lead_status_comment ? (
                                                                <p className="font-medium whitespace-pre-wrap">{driverDetails.lead_status_comment}</p>
                                                            ) : (
                                                                <span className="text-neutral-400 italic">Not Set</span>
                                                            )}
                                                        </div>
                                                    )}
                                                    {canViewDriverField('cancel_reason') && (
                                                        <div>
                                                            <p className="text-sm text-neutral-500">Cancel Reasons</p>
                                                            {driverDetails.cancel_reason ? (
                                                                <p className="font-medium">{driverDetails.cancel_reason}</p>
                                                            ) : (
                                                                <span className="text-neutral-400 italic">Not Set</span>
                                                            )}
                                                        </div>
                                                    )}
                                                    {canViewDriverField('next_follow_up') && (
                                                        <div>
                                                            <p className="text-sm text-neutral-500">Next Follow-up</p>
                                                            {driverDetails.next_follow_up ? (
                                                                <p className="font-medium">{formatDate(driverDetails.next_follow_up)}</p>
                                                            ) : (
                                                                <span className="text-neutral-400 italic">Not Set</span>
                                                            )}
                                                        </div>
                                                    )}
                                                    {canViewDriverField('last_follow_up') && (
                                                        <div>
                                                            <p className="text-sm text-neutral-500">Last Follow-up</p>
                                                            {driverDetails.last_follow_up ? (
                                                                <p className="font-medium">{formatDate(driverDetails.last_follow_up)}</p>
                                                            ) : (
                                                                <span className="text-neutral-400 italic">Not Set</span>
                                                            )}
                                                        </div>
                                                    )}
                                                    {canViewDriverField('lead_stage') && (
                                                        <div>
                                                            <p className="text-sm text-neutral-500">Lead Stage</p>
                                                            {driverDetails.lead_stage ? (
                                                                <Badge 
                                                                    variant="outline"
                                                                    style={driverDetails.lead_stage.color ? {
                                                                        borderColor: driverDetails.lead_stage.color,
                                                                        color: driverDetails.lead_stage.color,
                                                                    } : {}}
                                                                >
                                                                    {driverDetails.lead_stage.name}
                                                                </Badge>
                                                            ) : (
                                                                <span className="text-neutral-400 italic">Not Set</span>
                                                            )}
                                                        </div>
                                                    )}
                                                    {canViewDriverField('driver_stage') && (
                                                        <div>
                                                            <p className="text-sm text-neutral-500">Driver Stage</p>
                                                            {driverDetails.driver_stage ? (
                                                                <p className="font-medium">{driverDetails.driver_stage.name}</p>
                                                            ) : (
                                                                <span className="text-neutral-400 italic">Not Set</span>
                                                            )}
                                                        </div>
                                                    )}
                                                    {canViewDriverField('assigned_to') && (
                                                        <div>
                                                            <p className="text-sm text-neutral-500">Assigned To</p>
                                                            {driverDetails.assigned_to ? (
                                                                <p className="font-medium">{driverDetails.assigned_to.name}</p>
                                                            ) : driverDetails.assigned_users && driverDetails.assigned_users.length > 0 ? (
                                                                <div className="flex flex-wrap gap-1 mt-1">
                                                                    {driverDetails.assigned_users.map((user: any) => (
                                                                        <Badge key={user.id} variant="secondary" className="text-xs">
                                                                            {user.name}
                                                                        </Badge>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <span className="text-neutral-400 italic">Not Set</span>
                                                            )}
                                                        </div>
                                                    )}
                                                    {canViewDriverField('current_stage') && driverDetails.current_stage && (
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

                                        {/* Driver Stages Details */}
                                        {driverDetails.stages_status && driverDetails.stages_status.length > 0 && (
                                            <Card className="p-6">
                                                <div className="mb-4 flex items-center justify-between">
                                                    <div>
                                                        <h2 className="text-lg font-semibold">Driver Stages</h2>
                                                        <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
                                                            Manage drivers and their onboarding process
                                                        </p>
                                                    </div>
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
                                                                            Completed: {formatDate(stage.completed_at)}
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
                                            <div className="mb-4">
                                                <h2 className="text-lg font-semibold">Documents</h2>
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
                                                                        {doc.name || 'Unknown Document'}
                                                                    </p>
                                                                    {doc.original_filename && (
                                                                        <p className="text-xs text-neutral-500">{doc.original_filename}</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                {/* EMPTY status - show if file is NOT uploaded */}
                                                                {!doc.uploaded_path && (
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="h-7 px-3 text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                                                                        disabled
                                                                    >
                                                                        EMPTY
                                                                    </Button>
                                                                )}

                                                                {/* Status buttons - only show if file is uploaded */}
                                                                {doc.uploaded_path && (canSetPending() || canSetApproved() || canSetRejected()) && (
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
                                                                
                                                                {/* DELETE button - delete file */}
                                                                {canDeleteFile() && doc.uploaded_path && (
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="h-7 px-3 text-xs hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleDeleteFile(doc.id);
                                                                        }}
                                                                    >
                                                                        DELETE
                                                                    </Button>
                                                                )}

                                                                {/* UPLOAD button - always show */}
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
                                                                            className="h-7 px-3 text-xs"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                fileInputRefs.current[doc.id]?.click();
                                                                            }}
                                                                            disabled={uploadingDocId === doc.id}
                                                                        >
                                                                            <Upload className="h-4 w-4 mr-1" />
                                                                            {uploadingDocId === doc.id ? 'Uploading...' : 'UPLOAD'}
                                                                        </Button>
                                                                    </>
                                                                )}

                                                                {/* View button - only show if file is uploaded */}
                                                                {canViewDocument() && doc.uploaded_path && (
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="h-7 px-3 text-xs"
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
                                                            <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">Riding Company</th>
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
                                                                    {followUp.riding_company || 'N/A'}
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
                                                No follow-ups found for this driver.
                                            </div>
                                        )}
                                    </Card>
                                )}

                                {viewDialogTab === 'duplicates' && driverDetails?.duplicate > 0 && (
                                    <Card className="p-6">
                                        <h2 className="mb-4 text-lg font-semibold">Duplicate Drivers ({driverDetails.duplicate})</h2>
                                        <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">
                                            Drivers with the same phone number or WhatsApp number as this driver.
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
                                                            <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300">Riding Company</th>
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
                                                                router.visit(`/drivers/drivers/${dup.id}`);
                                                            }}>
                                                                <td className="px-4 py-3 text-sm">{dup.full_name || '-'}</td>
                                                                <td className="px-4 py-3 text-sm">{dup.phone || '-'}</td>
                                                                <td className="px-4 py-3 text-sm">{dup.whatsapp_phone || '-'}</td>
                                                                <td className="px-4 py-3 text-sm">{dup.email || '-'}</td>
                                                                <td className="px-4 py-3 text-sm">{dup.riding_company?.name || '-'}</td>
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
                                                                            router.visit(`/drivers/drivers/${dup.id}`);
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
                                            <p className="text-neutral-500 dark:text-neutral-400">No duplicate drivers found.</p>
                                        )}
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
    const currentUser = page.props.auth?.user;
    const isSuperAdmin = currentUser?.is_super_admin || false;
    const isCompanyAdmin = currentUser?.is_company_admin || false;
    const userRidingCompanyId = (currentUser as any)?.riding_company_id || null;
    
    // Hide riding company field if user has a specific riding company assigned (not admin)
    const showRidingCompanyField = isSuperAdmin || isCompanyAdmin || !userRidingCompanyId;
    
    // Field permissions hook
    const { canViewDriverField, canEditDriverField } = useFieldPermissions();
    
    const [leadStages, setLeadStages] = useState<FilterOption[]>([]);
    const [loadingLeadStages, setLoadingLeadStages] = useState(false);
    const [timeEditingState, setTimeEditingState] = useState<'hours' | 'minutes' | null>(null);
    const [confirmDuplicate, setConfirmDuplicate] = useState(false);
    const isAdmin = isSuperAdmin || isCompanyAdmin;
    
    // Early return if no driver
    if (!driver) {
        console.warn('QuickEditDialog: No driver provided');
        return null;
    }
    
    // Initialize form data
    const { data, setData, put, processing, errors, transform } = useForm({
        company_id: driver?.company_id ? String(driver.company_id) : '',
        full_name: driver?.full_name || '',
        phone: driver?.phone || '',
        whatsapp_phone: driver?.whatsapp_phone || '',
        email: driver?.email || '',
        riding_company_id: driver?.riding_company?.id ? String(driver.riding_company.id) : (userRidingCompanyId ? String(userRidingCompanyId) : ''),
        campaign_id: driver?.campaign?.id ? String(driver.campaign.id) : '',
        lead_source_id: driver?.lead_source?.id ? String(driver.lead_source.id) : '',
        assigned_to: driver?.assigned_to?.id ? String(driver.assigned_to.id) : '',
        assigned_users: (driver?.assigned_users && Array.isArray(driver.assigned_users) && driver.assigned_users.length > 0) 
            ? driver.assigned_users.map((u) => typeof u === 'object' ? u.id : u) 
            : [],
        lead_status_id: '', // Always clear on edit - user must select
        lead_status_comment: '', // Always clear on edit - user must enter
        cancel_reason: driver?.cancel_reason || '',
        next_follow_up: '', // Always clear on edit - user must enter
        last_follow_up: driver?.last_follow_up || '',
        lead_stage_id: driver?.lead_stage?.id ? String(driver.lead_stage.id) : '',
        current_stage_id: '',
                notes: driver?.notes || '',
                feedback_count: driver?.feedback_count || 0,
                vehicle_type: driver?.vehicle_type || '',
                car_or_scooter: driver?.car_or_scooter || '',
                has_worked_before: driver?.has_worked_before || '',
                worked_with_us_before: driver?.worked_with_us_before || '',
                vehicle_type_and_year: driver?.vehicle_type_and_year || '',
                city: driver?.city || '',
    });
    
    // Check if cancel_reason is required based on lead_status
    const isCancelReasonRequired = () => {
        if (!data.lead_status_id) return false;
        const selectedStatus = filterOptions?.leadStatuses?.find(s => String(s.id) === String(data.lead_status_id));
        return selectedStatus && ['Rejected', 'Deleted lead', 'Expired Account'].includes(selectedStatus.name);
    };

    // Check if next_follow_up and lead_status_comment are required based on lead_status
    const isFollowUpRequired = () => {
        if (!data.lead_status_id) return false;
        const selectedStatus = filterOptions?.leadStatuses?.find(s => String(s.id) === String(data.lead_status_id));
        const requiredStatuses = [
            'Probleme with link', 'Whats app Message', 'Follow Documents', 'Follow Up', 'Need Recall',
            'Link Not Done', 'Missing Documents', 'Waiting Activation', 'Need To Visit GL', 'Active',
            'Sign Up', 'Sign up Cities', 'DFT', 'Complete 50', 'Complete 100', 'Complete 120',
            'DFT Old', 'Fresh stage'
        ];
        return selectedStatus && requiredStatuses.includes(selectedStatus.name);
    };

    // Auto-set next_follow_up and cancel_reason based on lead status
    useEffect(() => {
        if (data.lead_status_id && filterOptions?.leadStatuses) {
            const selectedStatus = filterOptions.leadStatuses.find(s => String(s.id) === String(data.lead_status_id));
            if (selectedStatus) {
                if (selectedStatus.name === 'No Answer 1st Call') {
                    // For "No Answer 1st Call": Today's date + 2 hours from now
                    const today = new Date();
                    const twoHoursLater = new Date(today.getTime() + 2 * 60 * 60 * 1000); // Add 2 hours
                    const year = today.getFullYear();
                    const month = String(today.getMonth() + 1).padStart(2, '0');
                    const day = String(today.getDate()).padStart(2, '0');
                    const hours = String(twoHoursLater.getHours()).padStart(2, '0');
                    const minutes = String(twoHoursLater.getMinutes()).padStart(2, '0');
                    const dateStr = `${year}-${month}-${day}`;
                    const datetimeStr = `${dateStr}T${hours}:${minutes}`;
                    if (data.next_follow_up !== datetimeStr) {
                        setData('next_follow_up', datetimeStr);
                    }
                } else if (selectedStatus.name.toLowerCase().includes('answer') && selectedStatus.name !== 'No Answer 1st Call') {
                    // For Lead Statuses containing "Answer" (except "No Answer 1st Call"): Tomorrow's date + current time
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    const now = new Date();
                    const year = tomorrow.getFullYear();
                    const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
                    const day = String(tomorrow.getDate()).padStart(2, '0');
                    const hours = String(now.getHours()).padStart(2, '0');
                    const minutes = String(now.getMinutes()).padStart(2, '0');
                    const dateStr = `${year}-${month}-${day}`;
                    const datetimeStr = `${dateStr}T${hours}:${minutes}`;
                    if (data.next_follow_up !== datetimeStr) {
                        setData('next_follow_up', datetimeStr);
                    }
                }
                
                // Auto-set cancel_reason to "Expired" when "Expired Account" is selected
                if (selectedStatus.name === 'Expired Account') {
                    if (data.cancel_reason !== 'Expired') {
                        setData('cancel_reason', 'Expired');
                    }
                }
            }
        }
    }, [data.lead_status_id, setData, filterOptions?.leadStatuses]);
    
    // Update form data when driver changes or dialog opens
    useEffect(() => {
        if (open && driver) {
            setData({
                company_id: driver.company_id ? String(driver.company_id) : '',
                full_name: driver.full_name || '',
                phone: driver.phone || '',
                whatsapp_phone: driver.whatsapp_phone || '',
                email: driver.email || '',
                riding_company_id: driver.riding_company?.id ? String(driver.riding_company.id) : '',
                campaign_id: driver.campaign?.id ? String(driver.campaign.id) : '',
                lead_source_id: driver.lead_source?.id ? String(driver.lead_source.id) : '',
                assigned_to: driver.assigned_to?.id ? String(driver.assigned_to.id) : '',
                assigned_users: (driver.assigned_users && Array.isArray(driver.assigned_users) && driver.assigned_users.length > 0) 
                    ? driver.assigned_users.map((u) => typeof u === 'object' ? u.id : u) 
                    : [],
                lead_status_id: '', // Always clear on edit - user must select
                lead_status_comment: '', // Always clear on edit - user must enter
                cancel_reason: driver.cancel_reason || '',
                next_follow_up: '', // Always clear on edit - user must enter
                last_follow_up: driver.last_follow_up || '',
                lead_stage_id: driver.lead_stage?.id ? String(driver.lead_stage.id) : '',
                current_stage_id: '',
                notes: driver.notes || '',
                feedback_count: driver.feedback_count || 0,
                vehicle_type: driver.vehicle_type || '',
                car_or_scooter: driver.car_or_scooter || '',
                has_worked_before: driver.has_worked_before || '',
                worked_with_us_before: driver.worked_with_us_before || '',
                vehicle_type_and_year: driver.vehicle_type_and_year || '',
                city: driver.city || '',
            });
        }
    }, [open, driver?.id, setData]);

    // Transform data before submitting - convert empty strings to null
    transform((data) => {
        const transformed: any = {
            full_name: data.full_name || '',
            phone: data.phone || '',
            whatsapp_phone: data.whatsapp_phone || null,
            email: data.email || null,
            riding_company_id: data.riding_company_id ? Number(data.riding_company_id) : null,
            campaign_id: data.campaign_id ? Number(data.campaign_id) : null,
            lead_source_id: data.lead_source_id ? Number(data.lead_source_id) : null,
            assigned_to: data.assigned_to ? Number(data.assigned_to) : null,
            assigned_users: data.assigned_users && Array.isArray(data.assigned_users) && data.assigned_users.length > 0 
                ? data.assigned_users.map((id: any) => Number(id)) 
                : null,
            lead_status_id: data.lead_status_id ? Number(data.lead_status_id) : null,
            lead_status_comment: data.lead_status_comment || null,
            cancel_reason: data.cancel_reason || null,
            next_follow_up: data.next_follow_up || null,
            last_follow_up: data.last_follow_up || null,
            lead_stage_id: data.lead_stage_id ? Number(data.lead_stage_id) : null,
            current_stage_id: data.current_stage_id || null,
            notes: data.notes || null,
            feedback_count: data.feedback_count !== undefined ? Number(data.feedback_count) : null,
            vehicle_type: data.vehicle_type || null,
            car_or_scooter: data.car_or_scooter || null,
            has_worked_before: data.has_worked_before || null,
            worked_with_us_before: data.worked_with_us_before || null,
            vehicle_type_and_year: data.vehicle_type_and_year || null,
            city: data.city || null,
        };
        
        // Add company_id only for super admin
        if (isSuperAdmin && data.company_id) {
            transformed.company_id = Number(data.company_id);
        }
        
        // Add confirm_duplicate if admin
        if (isAdmin) {
            transformed.confirm_duplicate = confirmDuplicate;
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
            preserveState: true,
            onSuccess: () => {
                onOpenChange(false);
                // Reload drivers data immediately to show updates
                router.reload({ 
                    only: ['drivers', 'filterOptions', 'importAvailableFields'],
                    preserveState: true,
                    preserveScroll: true
                });
            },
            onError: (errors) => {
                console.error('Error updating driver:', errors);
                // Show error message to user
                if (errors && typeof errors === 'object') {
                    const errorMessages = Object.values(errors).flat();
                    alert('Error saving driver: ' + errorMessages.join(', '));
                } else {
                    alert('Error saving driver. Please try again.');
                }
            },
        });
    };

    return (
        <Dialog key={`quick-edit-${driver.id}`} open={open} onOpenChange={onOpenChange}>
                <DialogContent className="!max-w-6xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Quick Edit Driver</DialogTitle>
                        <DialogDescription>
                            Edit driver details: {driver?.full_name || 'Driver'}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        {canViewDriverField('full_name') && (
                            <div>
                                <label className="block text-sm font-medium mb-1">Full Name</label>
                                <Input
                                    value={data.full_name}
                                    onChange={(e) => setData('full_name', e.target.value)}
                                    className={errors.full_name ? 'border-red-500' : ''}
                                    disabled={!canEditDriverField('full_name')}
                                />
                                {errors.full_name && (
                                    <p className="text-sm text-red-500 mt-1">{errors.full_name}</p>
                                )}
                            </div>
                        )}
                        {canViewDriverField('phone') && (
                            <div>
                                <label className="block text-sm font-medium mb-1">Phone</label>
                                <Input
                                    value={data.phone}
                                    onChange={(e) => setData('phone', e.target.value)}
                                    className={errors.phone ? 'border-red-500' : ''}
                                    disabled={!canEditDriverField('phone')}
                                />
                                {errors.phone && (
                                    <p className="text-sm text-red-500 mt-1">{errors.phone}</p>
                                )}
                            </div>
                        )}
                        {canViewDriverField('whatsapp_phone') && (
                            <div>
                                <label className="block text-sm font-medium mb-1">WhatsApp</label>
                                <Input
                                    value={data.whatsapp_phone}
                                    onChange={(e) => setData('whatsapp_phone', e.target.value)}
                                    className={errors.whatsapp_phone ? 'border-red-500' : ''}
                                    disabled={!canEditDriverField('whatsapp_phone')}
                                />
                                {errors.whatsapp_phone && (
                                    <p className="text-sm text-red-500 mt-1">{errors.whatsapp_phone}</p>
                                )}
                            </div>
                        )}
                        {canViewDriverField('email') && (
                            <div>
                                <label className="block text-sm font-medium mb-1">Email</label>
                                <Input
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    className={errors.email ? 'border-red-500' : ''}
                                    disabled={!canEditDriverField('email')}
                                />
                                {errors.email && (
                                    <p className="text-sm text-red-500 mt-1">{errors.email}</p>
                                )}
                            </div>
                        )}
                        {canViewDriverField('confirm_duplicate') && (
                            <div className="col-span-2 flex items-center space-x-2">
                                <Checkbox
                                    id="confirm_duplicate_quick_edit"
                                    checked={confirmDuplicate}
                                    onCheckedChange={(checked) => setConfirmDuplicate(checked as boolean)}
                                    disabled={!canEditDriverField('confirm_duplicate')}
                                />
                                <label htmlFor="confirm_duplicate_quick_edit" className="text-sm font-normal cursor-pointer">
                                    Confirm Duplicate
                                </label>
                            </div>
                        )}
                        {showRidingCompanyField && (
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
                                {errors.riding_company_id && (
                                    <p className="text-sm text-red-500 mt-1">{errors.riding_company_id}</p>
                                )}
                            </div>
                        )}
                        {canViewDriverField('campaign') && (
                            <div>
                                <label className="block text-sm font-medium mb-1">Campaign</label>
                                <Select
                                    value={data.campaign_id}
                                    onValueChange={(value) => setData('campaign_id', value)}
                                    disabled={!canEditDriverField('campaign')}
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
                        )}
                        {canViewDriverField('lead_source') && (
                            <div>
                                <label className="block text-sm font-medium mb-1">Lead Source</label>
                                <Select
                                    value={data.lead_source_id}
                                    onValueChange={(value) => setData('lead_source_id', value)}
                                    disabled={!canEditDriverField('lead_source')}
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
                        )}
                        {/* Lead Status Group with Green Border */}
                        {(canViewDriverField('lead_status') || canViewDriverField('lead_status_comment') || canViewDriverField('cancel_reason') || canViewDriverField('next_follow_up')) && (
                            <div className="col-span-2 rounded-lg border-2 border-green-500 dark:border-green-600 bg-green-100/50 dark:bg-green-900/30 p-4 space-y-4">
                                {canViewDriverField('lead_status') && (
                                    <div>
                                        <label className="block text-sm font-bold mb-1 text-green-700 dark:text-green-300">Lead Status <span className="text-red-500">*</span></label>
                                        <Select
                                            value={data.lead_status_id}
                                            onValueChange={(value) => setData('lead_status_id', value)}
                                            required
                                            disabled={!canEditDriverField('lead_status')}
                                        >
                                            <SelectTrigger className={!data.lead_status_id ? 'border-red-500' : ''}>
                                                <SelectValue placeholder="-- Select Lead Status (Required) --" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {filterOptions.leadStatuses?.map((status) => (
                                                    <SelectItem key={status.id} value={String(status.id)}>
                                                        {status.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {!data.lead_status_id && (
                                            <p className="text-sm text-red-500 mt-1">Lead Status is required.</p>
                                        )}
                                    </div>
                                )}
                                {canViewDriverField('lead_status_comment') && (
                                    <div>
                                        <label className="block text-sm font-bold mb-1 text-green-700 dark:text-green-300">
                                            Feedback Comment
                                            {isFollowUpRequired() && <span className="text-red-500 ml-1">*</span>}
                                        </label>
                                        <textarea
                                            value={data.lead_status_comment}
                                            onChange={(e) => setData('lead_status_comment', e.target.value)}
                                            rows={3}
                                            className={`w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y ${(isFollowUpRequired() && !data.lead_status_comment) || errors.lead_status_comment ? 'border-red-500' : ''}`}
                                            placeholder="Enter lead status comment..."
                                            required={isFollowUpRequired()}
                                            disabled={!canEditDriverField('lead_status_comment')}
                                        />
                                        {errors.lead_status_comment && (
                                            <p className="text-sm text-red-500 mt-1">{errors.lead_status_comment}</p>
                                        )}
                                        {isFollowUpRequired() && !data.lead_status_comment && !errors.lead_status_comment && (
                                            <p className="text-sm text-red-500 mt-1">Feedback comment is required for this lead status.</p>
                                        )}
                                    </div>
                                )}
                                {canViewDriverField('cancel_reason') && (
                                    <div>
                                        <label className="block text-sm font-bold mb-1 text-green-700 dark:text-green-300">
                                            Cancel Reasons
                                            {isCancelReasonRequired() && <span className="text-red-500 ml-1">*</span>}
                                        </label>
                                        <Select
                                            value={data.cancel_reason || undefined}
                                            onValueChange={(value) => setData('cancel_reason', value || '')}
                                            required={isCancelReasonRequired()}
                                            disabled={!canEditDriverField('cancel_reason')}
                                        >
                                            <SelectTrigger className={isCancelReasonRequired() && !data.cancel_reason ? 'border-red-500' : ''}>
                                                <SelectValue placeholder="Select cancel reason..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Not interested">Not interested</SelectItem>
                                                <SelectItem value="Wrong Number">Wrong Number</SelectItem>
                                                <SelectItem value="Under Age">Under Age</SelectItem>
                                                <SelectItem value="Duplicated">Duplicated</SelectItem>
                                                <SelectItem value="Wrong Documents">Wrong Documents</SelectItem>
                                                <SelectItem value="Car Not Accepted">Car Not Accepted</SelectItem>
                                                <SelectItem value="Other">Other</SelectItem>
                                                <SelectItem value="Already driver">Already driver</SelectItem>
                                                <SelectItem value="Expired">Expired</SelectItem>
                                                <SelectItem value="Cities">Cities</SelectItem>
                                                <SelectItem value="Dont have driving license">Dont have driving license</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {errors.cancel_reason && (
                                            <p className="text-sm text-red-500 mt-1">{errors.cancel_reason}</p>
                                        )}
                                        {isCancelReasonRequired() && !data.cancel_reason && !errors.cancel_reason && (
                                            <p className="text-sm text-red-500 mt-1">Cancel reason is required for this lead status.</p>
                                        )}
                                    </div>
                                )}
                                {canViewDriverField('next_follow_up') && (
                                    <div className="col-span-2">
                                        <label className="block text-sm font-bold mb-1 text-green-700 dark:text-green-300">
                                            Next Follow-up
                                            {isFollowUpRequired() && <span className="text-red-500 ml-1">*</span>}
                                        </label>
                                        <div className="flex gap-2 items-center">
                                            {/* Date Input (Hidden) */}
                                            <input
                                                type="date"
                                                id="quick-edit-next-follow-up-date"
                                                value={data.next_follow_up ? (data.next_follow_up.includes('T') ? data.next_follow_up.split('T')[0] : data.next_follow_up) : ''}
                                                onChange={(e) => {
                                                    if (!canEditDriverField('next_follow_up')) return;
                                                    const selectedDate = e.target.value;
                                                    if (selectedDate) {
                                                        // Ensure selected date is today or future
                                                        const today = new Date();
                                                        today.setHours(0, 0, 0, 0);
                                                        const selected = new Date(selectedDate);
                                                        selected.setHours(0, 0, 0, 0);
                                                        
                                                        // If selected date is before today, use today instead
                                                        if (selected < today) {
                                                            const todayStr = today.toISOString().split('T')[0];
                                                            // Use current time
                                                            const now = new Date();
                                                            const hours = String(now.getHours()).padStart(2, '0');
                                                            const minutes = String(now.getMinutes()).padStart(2, '0');
                                                            setData('next_follow_up', `${todayStr}T${hours}:${minutes}`);
                                                            return;
                                                        }
                                                        
                                                            // Use current time when selecting a new date
                                                            const now = new Date();
                                                            const hours = String(now.getHours()).padStart(2, '0');
                                                            const minutes = String(now.getMinutes()).padStart(2, '0');
                                                            setData('next_follow_up', `${selectedDate}T${hours}:${minutes}`);
                                                    } else {
                                                        setData('next_follow_up', '');
                                                    }
                                                }}
                                                min={(() => {
                                                    const today = new Date();
                                                    const year = today.getFullYear();
                                                    const month = String(today.getMonth() + 1).padStart(2, '0');
                                                    const day = String(today.getDate()).padStart(2, '0');
                                                    return `${year}-${month}-${day}`;
                                                })()}
                                                className="absolute opacity-0 pointer-events-none"
                                                required={isFollowUpRequired()}
                                                disabled={!canEditDriverField('next_follow_up')}
                                            />
                                            {/* Time Input (Hidden) */}
                                            <input
                                                type="time"
                                                id="quick-edit-next-follow-up-time"
                                                value={data.next_follow_up && data.next_follow_up.includes('T') 
                                                    ? data.next_follow_up.split('T')[1].slice(0, 5) 
                                                    : '00:00'}
                                                onChange={(e) => {
                                                    if (!canEditDriverField('next_follow_up')) return;
                                                    const selectedTime = e.target.value;
                                                    const existingDate = data.next_follow_up && data.next_follow_up.includes('T')
                                                        ? data.next_follow_up.split('T')[0]
                                                        : (data.next_follow_up || new Date().toISOString().split('T')[0]);
                                                    setData('next_follow_up', `${existingDate}T${selectedTime}`);
                                                }}
                                                onFocus={() => {
                                                    if (canEditDriverField('next_follow_up')) {
                                                        setTimeEditingState('hours');
                                                    }
                                                }}
                                                onBlur={() => {
                                                    // Delay to allow time picker to close
                                                    setTimeout(() => setTimeEditingState(null), 300);
                                                }}
                                                onInput={(e) => {
                                                    if (!canEditDriverField('next_follow_up')) return;
                                                    // Track which part is being edited
                                                    const timeInput = e.target as HTMLInputElement;
                                                    const currentTime = timeInput.value;
                                                    const prevTime = data.next_follow_up && data.next_follow_up.includes('T')
                                                        ? data.next_follow_up.split('T')[1].slice(0, 5)
                                                        : '00:00';
                                                    
                                                    if (prevTime && currentTime) {
                                                        const [currentHours, currentMinutes] = currentTime.split(':').map(Number);
                                                        const [prevHours, prevMinutes] = prevTime.split(':').map(Number);
                                                        
                                                        if (currentHours !== prevHours) {
                                                            setTimeEditingState('hours');
                                                        } else if (currentMinutes !== prevMinutes) {
                                                            setTimeEditingState('minutes');
                                                        }
                                                    }
                                                }}
                                                className="absolute opacity-0 pointer-events-none"
                                                disabled={!canEditDriverField('next_follow_up')}
                                            />
                                    {/* Display */}
                                    <div className={`flex-1 rounded-md border px-3 py-2 bg-white dark:bg-neutral-800 flex items-center gap-2 ${errors.next_follow_up || (isFollowUpRequired() && !data.next_follow_up) ? 'border-red-500' : 'border-neutral-300 dark:border-neutral-600'}`}>
                                        {data.next_follow_up ? (() => {
                                            const date = new Date(data.next_follow_up);
                                            const day = String(date.getDate()).padStart(2, '0');
                                            const month = String(date.getMonth() + 1).padStart(2, '0');
                                            const year = date.getFullYear();
                                            let hours = date.getHours();
                                            const minutes = String(date.getMinutes()).padStart(2, '0');
                                            const ampm = hours >= 12 ? 'PM' : 'AM';
                                            hours = hours % 12;
                                            hours = hours ? hours : 12;
                                            const formattedHours = String(hours).padStart(2, '0');
                                            return (
                                                <>
                                                    <span 
                                                        className={canEditDriverField('next_follow_up') ? "cursor-pointer hover:text-blue-600 dark:hover:text-blue-400" : "cursor-not-allowed text-neutral-400"}
                                                        onClick={() => {
                                                            if (!canEditDriverField('next_follow_up')) return;
                                                            const dateInput = document.getElementById('quick-edit-next-follow-up-date') as HTMLInputElement;
                                                            if (dateInput) {
                                                                dateInput.showPicker?.() || dateInput.focus();
                                                            }
                                                        }}
                                                    >
                                                        {day}
                                                    </span>
                                                    <span 
                                                        className={canEditDriverField('next_follow_up') ? "cursor-pointer hover:text-blue-600 dark:hover:text-blue-400" : "cursor-not-allowed text-neutral-400"}
                                                        onClick={() => {
                                                            if (!canEditDriverField('next_follow_up')) return;
                                                            const dateInput = document.getElementById('quick-edit-next-follow-up-date') as HTMLInputElement;
                                                            if (dateInput) {
                                                                dateInput.showPicker?.() || dateInput.focus();
                                                            }
                                                        }}
                                                    >
                                                        -
                                                    </span>
                                                    <span 
                                                        className={canEditDriverField('next_follow_up') ? "cursor-pointer hover:text-blue-600 dark:hover:text-blue-400" : "cursor-not-allowed text-neutral-400"}
                                                        onClick={() => {
                                                            if (!canEditDriverField('next_follow_up')) return;
                                                            const dateInput = document.getElementById('quick-edit-next-follow-up-date') as HTMLInputElement;
                                                            if (dateInput) {
                                                                dateInput.showPicker?.() || dateInput.focus();
                                                            }
                                                        }}
                                                    >
                                                        {month}
                                                    </span>
                                                    <span 
                                                        className={canEditDriverField('next_follow_up') ? "cursor-pointer hover:text-blue-600 dark:hover:text-blue-400" : "cursor-not-allowed text-neutral-400"}
                                                        onClick={() => {
                                                            if (!canEditDriverField('next_follow_up')) return;
                                                            const dateInput = document.getElementById('quick-edit-next-follow-up-date') as HTMLInputElement;
                                                            if (dateInput) {
                                                                dateInput.showPicker?.() || dateInput.focus();
                                                            }
                                                        }}
                                                    >
                                                        -
                                                    </span>
                                                    <span 
                                                        className={canEditDriverField('next_follow_up') ? "cursor-pointer hover:text-blue-600 dark:hover:text-blue-400" : "cursor-not-allowed text-neutral-400"}
                                                        onClick={() => {
                                                            if (!canEditDriverField('next_follow_up')) return;
                                                            const dateInput = document.getElementById('quick-edit-next-follow-up-date') as HTMLInputElement;
                                                            if (dateInput) {
                                                                dateInput.showPicker?.() || dateInput.focus();
                                                            }
                                                        }}
                                                    >
                                                        {year}
                                                    </span>
                                                    <span className="mx-2 text-neutral-400">|</span>
                                                    <span 
                                                        className={`${canEditDriverField('next_follow_up') ? 'cursor-pointer hover:text-blue-600 dark:hover:text-blue-400' : 'cursor-not-allowed text-neutral-400'} transition-colors ${
                                                            timeEditingState === 'hours' 
                                                                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-1 rounded' 
                                                                : ''
                                                        }`}
                                                        onClick={() => {
                                                            if (!canEditDriverField('next_follow_up')) return;
                                                            setTimeEditingState('hours');
                                                            const timeInput = document.getElementById('quick-edit-next-follow-up-time') as HTMLInputElement;
                                                            if (timeInput) {
                                                                timeInput.showPicker?.() || timeInput.focus();
                                                            }
                                                        }}
                                                    >
                                                        {formattedHours}
                                                    </span>
                                                    <span className="text-neutral-400">:</span>
                                                    <span 
                                                        className={`${canEditDriverField('next_follow_up') ? 'cursor-pointer hover:text-blue-600 dark:hover:text-blue-400' : 'cursor-not-allowed text-neutral-400'} transition-colors ${
                                                            timeEditingState === 'minutes' 
                                                                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-1 rounded' 
                                                                : ''
                                                        }`}
                                                        onClick={() => {
                                                            if (!canEditDriverField('next_follow_up')) return;
                                                            setTimeEditingState('minutes');
                                                            const timeInput = document.getElementById('quick-edit-next-follow-up-time') as HTMLInputElement;
                                                            if (timeInput) {
                                                                timeInput.showPicker?.() || timeInput.focus();
                                                            }
                                                        }}
                                                    >
                                                        {minutes}
                                                    </span>
                                                    <Select
                                                        value={ampm}
                                                        onValueChange={(value) => {
                                                            if (!canEditDriverField('next_follow_up')) return;
                                                            const date = new Date(data.next_follow_up);
                                                            let hours = date.getHours();
                                                            const minutes = date.getMinutes();
                                                            const currentHours12 = hours % 12 || 12; // Convert to 12-hour format
                                                            
                                                            if (value === 'PM' && ampm === 'AM') {
                                                                // Convert from AM to PM
                                                                if (currentHours12 === 12) {
                                                                    hours = 12; // 12 AM -> 12 PM (noon)
                                                                } else {
                                                                    hours = currentHours12 + 12; // 1-11 AM -> 1-11 PM
                                                                }
                                                            } else if (value === 'AM' && ampm === 'PM') {
                                                                // Convert from PM to AM
                                                                if (currentHours12 === 12) {
                                                                    hours = 0; // 12 PM -> 12 AM (midnight)
                                                                } else {
                                                                    hours = currentHours12; // 1-11 PM -> 1-11 AM
                                                                }
                                                            }
                                                            
                                                            // Use local date/time instead of UTC to avoid timezone issues
                                                            const year = date.getFullYear();
                                                            const month = String(date.getMonth() + 1).padStart(2, '0');
                                                            const day = String(date.getDate()).padStart(2, '0');
                                                            const dateStr = `${year}-${month}-${day}`;
                                                            const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
                                                            setData('next_follow_up', `${dateStr}T${timeStr}`);
                                                        }}
                                                        disabled={!canEditDriverField('next_follow_up')}
                                                    >
                                                        <SelectTrigger className="h-auto py-0 px-2 border-0 bg-transparent shadow-none hover:bg-blue-50 dark:hover:bg-blue-900/20">
                                                            <SelectValue>{ampm}</SelectValue>
                                                        </SelectTrigger>
                                                        <SelectContent side="top" sideOffset={4}>
                                                            <SelectItem value="AM">AM</SelectItem>
                                                            <SelectItem value="PM">PM</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </>
                                            );
                                        })() : (
                                            <span 
                                                className={canEditDriverField('next_follow_up') ? "text-neutral-400 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400" : "text-neutral-400 cursor-not-allowed"}
                                                onClick={() => {
                                                    if (!canEditDriverField('next_follow_up')) return;
                                                    // Try date first, if fails try time
                                                    const dateInput = document.getElementById('quick-edit-next-follow-up-date') as HTMLInputElement;
                                                    if (dateInput) {
                                                        dateInput.showPicker?.() || dateInput.focus();
                                                    } else {
                                                        const timeInput = document.getElementById('quick-edit-next-follow-up-time') as HTMLInputElement;
                                                        if (timeInput) {
                                                            timeInput.showPicker?.() || timeInput.focus();
                                                        }
                                                    }
                                                }}
                                            >
                                                dd-mm-yyyy | hh:mm AM/PM
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {errors.next_follow_up && (
                                    <p className="text-sm text-red-500 mt-1">{errors.next_follow_up}</p>
                                )}
                                {isFollowUpRequired() && !data.next_follow_up && !errors.next_follow_up && (
                                    <p className="text-sm text-red-500 mt-1">Next follow-up is required for this lead status.</p>
                                )}
                                    </div>
                                )}
                            </div>
                        )}
                        {canViewDriverField('last_follow_up') && (
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
                        )}
                        {canViewDriverField('lead_stage') && (
                            <div>
                                <label className="block text-sm font-medium mb-1">Lead Stage</label>
                                <Select
                                    value={data.lead_stage_id}
                                    onValueChange={(value) => setData('lead_stage_id', value)}
                                    disabled={loadingLeadStages || !data.riding_company_id || !canEditDriverField('lead_stage')}
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
                        )}
                        {canViewDriverField('assigned_to') && (
                            <div className="col-span-2">
                                <label className="block text-sm font-medium mb-1">Assigned To</label>
                                <Select
                                    value={data.assigned_to ? String(data.assigned_to) : undefined}
                                    onValueChange={(value) => {
                                        if (value === 'none') {
                                            setData('assigned_to', null);
                                        } else {
                                            setData('assigned_to', Number(value));
                                        }
                                    }}
                                    disabled={!canEditDriverField('assigned_to')}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select user..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">-- None --</SelectItem>
                                        {filterOptions.users?.map((user) => (
                                            <SelectItem key={user.id} value={String(user.id)}>
                                                {user.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.assigned_to && (
                                    <p className="text-sm text-red-500 mt-1">{errors.assigned_to}</p>
                                )}
                            </div>
                        )}
                        {canViewDriverField('notes') && (
                            <div className="col-span-2">
                                <label className="block text-sm font-medium mb-1">Notes</label>
                                <textarea
                                    value={data.notes}
                                    onChange={(e) => setData('notes', e.target.value)}
                                    rows={4}
                                    className={`w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y ${errors.notes ? 'border-red-500' : ''}`}
                                    placeholder="Enter notes..."
                                    disabled={!canEditDriverField('notes')}
                                />
                                {errors.notes && (
                                    <p className="text-sm text-red-500 mt-1">{errors.notes}</p>
                                )}
                            </div>
                        )}
                        {canViewDriverField('vehicle_type') && (
                            <div>
                                <label className="block text-sm font-medium mb-1">Vehicle Type</label>
                                <Input
                                    value={data.vehicle_type}
                                    onChange={(e) => setData('vehicle_type', e.target.value)}
                                    className={errors.vehicle_type ? 'border-red-500' : ''}
                                    placeholder="Enter vehicle type..."
                                    disabled={!canEditDriverField('vehicle_type')}
                                />
                                {errors.vehicle_type && (
                                    <p className="text-sm text-red-500 mt-1">{errors.vehicle_type}</p>
                                )}
                            </div>
                        )}
                        {canViewDriverField('car_or_scooter') && (
                            <div>
                                <label className="block text-sm font-medium mb-1">Car or Scooter</label>
                                <Select
                                    value={data.car_or_scooter}
                                    onValueChange={(value) => setData('car_or_scooter', value)}
                                    disabled={!canEditDriverField('car_or_scooter')}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Car or Scooter" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Car">Car</SelectItem>
                                        <SelectItem value="Scooter">Scooter</SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.car_or_scooter && (
                                    <p className="text-sm text-red-500 mt-1">{errors.car_or_scooter}</p>
                                )}
                            </div>
                        )}
                        {canViewDriverField('has_worked_before') && (
                            <div>
                                <label className="block text-sm font-medium mb-1">Has the driver worked before?</label>
                                <Input
                                    value={data.has_worked_before}
                                    onChange={(e) => setData('has_worked_before', e.target.value)}
                                    className={errors.has_worked_before ? 'border-red-500' : ''}
                                    placeholder="Enter information about previous work experience..."
                                    disabled={!canEditDriverField('has_worked_before')}
                                />
                                {errors.has_worked_before && (
                                    <p className="text-sm text-red-500 mt-1">{errors.has_worked_before}</p>
                                )}
                            </div>
                        )}
                        {canViewDriverField('city') && (
                            <div>
                                <label className="block text-sm font-medium mb-1">City</label>
                                <Select
                                    value={data.city || undefined}
                                    onValueChange={(value) => setData('city', value || '')}
                                    disabled={!canEditDriverField('city')}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select city..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {EGYPT_GOVERNORATES.map((gov) => (
                                            <SelectItem key={gov} value={gov}>
                                                {gov}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.city && (
                                    <p className="text-sm text-red-500 mt-1">{errors.city}</p>
                                )}
                            </div>
                        )}
                        {canViewDriverField('worked_with_us_before') && (
                            <div>
                                <label className="block text-sm font-medium mb-1">Worked With Us Before</label>
                                <Input
                                    value={data.worked_with_us_before}
                                    onChange={(e) => setData('worked_with_us_before', e.target.value)}
                                    className={errors.worked_with_us_before ? 'border-red-500' : ''}
                                    placeholder="Enter information..."
                                    disabled={!canEditDriverField('worked_with_us_before')}
                                />
                                {errors.worked_with_us_before && (
                                    <p className="text-sm text-red-500 mt-1">{errors.worked_with_us_before}</p>
                                )}
                            </div>
                        )}
                        {canViewDriverField('vehicle_type_and_year') && (
                            <div>
                                <label className="block text-sm font-medium mb-1">Vehicle Type and Year</label>
                                <Input
                                    value={data.vehicle_type_and_year}
                                    onChange={(e) => setData('vehicle_type_and_year', e.target.value)}
                                    className={errors.vehicle_type_and_year ? 'border-red-500' : ''}
                                    placeholder="Enter vehicle type and year..."
                                    disabled={!canEditDriverField('vehicle_type_and_year')}
                                />
                                {errors.vehicle_type_and_year && (
                                    <p className="text-sm text-red-500 mt-1">{errors.vehicle_type_and_year}</p>
                                )}
                            </div>
                        )}
                        {canViewDriverField('feedback_count') && (
                            <div>
                                <label className="block text-sm font-medium mb-1">Feedback Count</label>
                                <Input
                                    type="number"
                                    value={String(data.feedback_count || 0)}
                                    disabled
                                    className="bg-neutral-100 dark:bg-neutral-800 cursor-not-allowed"
                                />
                                <p className="text-xs text-neutral-500 mt-1">Read-only: Automatically incremented when lead status is updated</p>
                                {errors.feedback_count && (
                                    <p className="text-sm text-red-500 mt-1">{errors.feedback_count}</p>
                                )}
                            </div>
                        )}
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

