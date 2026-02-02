import { DeleteDialog } from '@/components/core/delete-dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Search, X, Eye, Pencil, ArrowUp, ArrowDown, Settings2, GripVertical, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { type SharedData } from '@/types';
import { formatDate } from '@/utils/date-format';

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
    uuid?: string;
    driver_num?: string;
    full_name: string;
    phone: string;
    whatsapp_phone?: string;
    email?: string;
    riding_company?: RidingCompany;
    campaign?: Campaign;
    lead_source?: LeadSource;
    lead_status?: LeadStatus;
    lead_stage?: LeadStage;
    assigned_to?: User;
    assigned_users?: User[];
    next_follow_up?: string;
    last_follow_up?: string;
    created_at?: string;
    updated_at?: string;
}

interface DriverFollowUp {
    id: number;
    driver_id: number;
    driver?: Driver;
    driver_num?: string;
    assigned_to?: number;
    assigned_to_user?: User;
    user_name: string;
    created_time: string;
    riding_company?: string;
    lead_stage?: string;
    lead_status?: string;
    lead_status_comment?: string;
    notes?: string;
    created_at: string;
    updated_at: string;
}

interface DriverFollowUpsIndexProps {
    followUps: DriverFollowUp[];
}

// Define all available columns - Follow-ups columns
const ALL_FOLLOWUP_COLUMNS = [
    { id: 'actions', label: 'Actions', defaultVisible: true, defaultOrder: 0 },
    { id: 'driver_num', label: 'Lead Num', defaultVisible: true, defaultOrder: 1 },
    { id: 'driver', label: 'Lead', defaultVisible: true, defaultOrder: 2 },
    { id: 'user_name', label: 'User Name', defaultVisible: true, defaultOrder: 3 },
    { id: 'assigned_to', label: 'Assigned To', defaultVisible: true, defaultOrder: 4 },
    { id: 'created_time', label: 'Created Time', defaultVisible: true, defaultOrder: 5 },
    { id: 'lead_stage', label: 'Lead Stage', defaultVisible: true, defaultOrder: 7 },
    { id: 'lead_status', label: 'Lead Status', defaultVisible: true, defaultOrder: 7.5 },
    { id: 'lead_status_comment', label: 'Feedback Comment', defaultVisible: false, defaultOrder: 7.6 },
    { id: 'cancel_reason', label: 'Cancel Reasons', defaultVisible: false, defaultOrder: 7.65 },
    { id: 'next_follow_up_drivers', label: 'Next Follow-up (Leads)', defaultVisible: false, defaultOrder: 7.7 },
    { id: 'last_follow_up_drivers', label: 'Last Follow-up (Leads)', defaultVisible: false, defaultOrder: 7.8 },
    { id: 'notes', label: 'Notes', defaultVisible: false, defaultOrder: 8 },
    { id: 'created_at', label: 'Created At', defaultVisible: false, defaultOrder: 9 },
];

// Define all available columns from Drivers (with special naming)
const ALL_DRIVER_COLUMNS = [
    { id: 'driver_driver_num', label: 'Lead Num (Leads)', defaultVisible: false, defaultOrder: 10 },
    { id: 'driver_duplicate', label: 'Duplicate (Leads)', defaultVisible: false, defaultOrder: 10.1 },
    { id: 'driver_phone', label: 'Phone (Leads)', defaultVisible: false, defaultOrder: 10.2 },
    { id: 'driver_whatsapp', label: 'WhatsApp (Leads)', defaultVisible: false, defaultOrder: 10.3 },
    { id: 'driver_email', label: 'Email (Leads)', defaultVisible: false, defaultOrder: 10.4 },
    { id: 'driver_campaign', label: 'Campaign (Leads)', defaultVisible: false, defaultOrder: 10.6 },
    { id: 'driver_lead_source', label: 'Lead Source (Leads)', defaultVisible: false, defaultOrder: 10.7 },
    { id: 'driver_lead_status', label: 'Lead Status (Leads)', defaultVisible: false, defaultOrder: 10.8 },
    { id: 'driver_lead_status_comment', label: 'Feedback Comment (Leads)', defaultVisible: false, defaultOrder: 10.9 },
    { id: 'driver_next_follow_up', label: 'Next Follow-up (Leads)', defaultVisible: false, defaultOrder: 11 },
    { id: 'driver_next_time', label: 'Next Time (Leads)', defaultVisible: false, defaultOrder: 11.1 },
    { id: 'driver_last_follow_up', label: 'Last Follow-up (Leads)', defaultVisible: false, defaultOrder: 11.2 },
    { id: 'driver_assigned_to', label: 'Assigned To (Leads)', defaultVisible: false, defaultOrder: 11.3 },
    { id: 'driver_lead_stage', label: 'Lead Stage (Leads)', defaultVisible: false, defaultOrder: 11.5 },
    { id: 'driver_current_stage', label: 'Current Stage (Leads)', defaultVisible: false, defaultOrder: 11.6 },
    { id: 'driver_last_assigned_time', label: 'Last Assigned Time (Leads)', defaultVisible: false, defaultOrder: 11.7 },
    { id: 'driver_last_assigned_date', label: 'Last Assigned Date (Leads)', defaultVisible: false, defaultOrder: 11.75 },
    { id: 'driver_last_assigned_by', label: 'Last Assigned By (Leads)', defaultVisible: false, defaultOrder: 11.8 },
    { id: 'driver_notes', label: 'Notes (Leads)', defaultVisible: false, defaultOrder: 11.9 },
    { id: 'driver_cancel_reason', label: 'Cancel Reasons (Leads)', defaultVisible: false, defaultOrder: 12 },
    { id: 'driver_vehicle_type', label: 'Vehicle Type (Leads)', defaultVisible: false, defaultOrder: 12.1 },
    { id: 'driver_has_worked_before', label: 'Has the lead worked before? (Leads)', defaultVisible: false, defaultOrder: 12.2 },
    { id: 'driver_city', label: 'City (Leads)', defaultVisible: false, defaultOrder: 12.3 },
    { id: 'driver_feedback_count', label: 'Feedback Count (Leads)', defaultVisible: false, defaultOrder: 12.5 },
    { id: 'driver_uuid', label: 'UUID (Leads)', defaultVisible: false, defaultOrder: 13 },
    { id: 'driver_created_at', label: 'Created At (Leads)', defaultVisible: false, defaultOrder: 14 },
    { id: 'driver_updated_at', label: 'Updated At (Leads)', defaultVisible: false, defaultOrder: 15 },
];

// Combine all columns
const ALL_COLUMNS = [...ALL_FOLLOWUP_COLUMNS, ...ALL_DRIVER_COLUMNS];

export default function DriverFollowUpsIndex({ followUps = [] }: DriverFollowUpsIndexProps) {
    const page = usePage<SharedData>();
    
    const safeFollowUps = Array.isArray(followUps) ? followUps : [];
    const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; followUp: DriverFollowUp | null }>({
        open: false,
        followUp: null,
    });
    const [selectedFollowUps, setSelectedFollowUps] = useState<Set<number>>(new Set());
    const [massDeleteDialog, setMassDeleteDialog] = useState(false);

    const hasPermission = (permission: string): boolean => {
        const user = page.props.auth?.user;
        if (user?.is_super_admin || user?.is_company_admin) {
            return true;
        }
        const permissions = (user as any)?.permissions || [];
        return permissions.some((p: any) => p.name === permission);
    };

    const canMassEdit = () => {
        return hasPermission('drivers.driverfollowups.mass-edit');
    };

    const canMassDelete = () => {
        return hasPermission('drivers.driverfollowups.mass-delete');
    };

    const canDeleteFollowUp = () => {
        return hasPermission('drivers.driverfollowups.delete');
    };

    // Column visibility and order states
    const STORAGE_KEY_COLUMNS = 'followups_table_columns';
    const STORAGE_KEY_PAGE_SIZE = 'followups_table_page_size';

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
    const mergeColumns = (saved: any[] | null) => {
        if (!saved || !Array.isArray(saved)) {
            return ALL_COLUMNS.map(col => ({
                id: col.id,
                visible: col.defaultVisible,
                order: col.defaultOrder,
            }));
        }
        
        // Create a map of saved columns
        const savedMap = new Map(saved.map(col => [col.id, col]));
        
        // Merge: use saved settings if exists, otherwise use defaults
        return ALL_COLUMNS.map(col => {
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
        return 10;
    };

    const [pageSize, setPageSize] = useState(loadPageSize());
    const [currentPage, setCurrentPage] = useState(1);

    // Filter states
    const [filters, setFilters] = useState<Record<string, string | number | null | 'is_empty'>>({
        driver_num: '',
        driver: '',
        user_name: '',
        assigned_to: null,
        lead_stage: '',
        lead_status: '',
        lead_status_comment: '',
        notes: '',
        // Driver columns filters
        driver_phone: '',
        driver_whatsapp: '',
        driver_email: '',
        driver_campaign: null,
        driver_lead_source: null,
            driver_lead_status: null,
            driver_lead_stage: null,
            driver_assigned_to: null,
            driver_next_follow_up: '',
            driver_last_follow_up: '',
        });

    // Sort states
    const [sortField, setSortField] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

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
            
            return newColumns.map((col, index) => ({ ...col, order: index }));
        });
    };

    const handleDragEnd = () => {
        setDraggedColumn(null);
    };

    const sortedColumns = useMemo(() => {
        try {
            if (!columns || !Array.isArray(columns) || columns.length === 0) {
                return ALL_COLUMNS.map(col => ({
                    id: col.id,
                    visible: col.defaultVisible,
                    order: col.defaultOrder,
                }));
            }
            return [...columns].sort((a, b) => (a.order || 0) - (b.order || 0));
        } catch (e) {
            console.error('Error in sortedColumns:', e);
            return ALL_COLUMNS.map(col => ({
                id: col.id,
                visible: col.defaultVisible,
                order: col.defaultOrder,
            }));
        }
    }, [columns]);

    const visibleColumns = useMemo(() => {
        try {
            if (!sortedColumns || !Array.isArray(sortedColumns) || sortedColumns.length === 0) {
                return ALL_COLUMNS.filter(col => col.defaultVisible).map(col => ({
                    id: col.id,
                    visible: col.defaultVisible,
                    order: col.defaultOrder,
                }));
            }
            return sortedColumns.filter(col => col.visible);
        } catch (e) {
            console.error('Error in visibleColumns:', e);
            return ALL_COLUMNS.filter(col => col.defaultVisible).map(col => ({
                id: col.id,
                visible: col.defaultVisible,
                order: col.defaultOrder,
            }));
        }
    }, [sortedColumns]);

    // Filter follow-ups
    const filteredFollowUps = useMemo(() => {
        if (!safeFollowUps || safeFollowUps.length === 0) {
            return [];
        }
        return safeFollowUps.filter((followUp) => {
            if (filters.driver_num && filters.driver_num !== 'is_empty') {
                const driverNum = followUp.driver_num || String(followUp.driver_id);
                if (!driverNum.toLowerCase().includes(String(filters.driver_num).toLowerCase())) {
                    return false;
                }
            } else if (filters.driver_num === 'is_empty') {
                if (followUp.driver_num && followUp.driver_num.trim() !== '') {
                    return false;
                }
            }

            if (filters.driver && filters.driver !== 'is_empty') {
                if (!followUp.driver?.full_name?.toLowerCase().includes(String(filters.driver).toLowerCase())) {
                    return false;
                }
            } else if (filters.driver === 'is_empty') {
                if (followUp.driver?.full_name && followUp.driver.full_name.trim() !== '') {
                    return false;
                }
            }

            if (filters.user_name && filters.user_name !== 'is_empty') {
                if (!followUp.user_name?.toLowerCase().includes(String(filters.user_name).toLowerCase())) {
                    return false;
                }
            } else if (filters.user_name === 'is_empty') {
                if (followUp.user_name && followUp.user_name.trim() !== '') {
                    return false;
                }
            }

            if (filters.assigned_to) {
                if (filters.assigned_to === 'is_empty') {
                    if (followUp.assigned_to) {
                        return false;
                    }
                } else if (followUp.assigned_to !== filters.assigned_to) {
                    return false;
                }
            }

            if (filters.lead_stage && filters.lead_stage !== 'is_empty') {
                if (!followUp.lead_stage?.toLowerCase().includes(String(filters.lead_stage).toLowerCase())) {
                    return false;
                }
            } else if (filters.lead_stage === 'is_empty') {
                if (followUp.lead_stage && followUp.lead_stage.trim() !== '') {
                    return false;
                }
            }

            if (filters.lead_status && filters.lead_status !== 'is_empty') {
                if (!followUp.lead_status?.toLowerCase().includes(String(filters.lead_status).toLowerCase())) {
                    return false;
                }
            } else if (filters.lead_status === 'is_empty') {
                if (followUp.lead_status && followUp.lead_status.trim() !== '') {
                    return false;
                }
            }

            if (filters.lead_status_comment && filters.lead_status_comment !== 'is_empty') {
                if (!followUp.lead_status_comment?.toLowerCase().includes(String(filters.lead_status_comment).toLowerCase())) {
                    return false;
                }
            } else if (filters.lead_status_comment === 'is_empty') {
                if (followUp.lead_status_comment && followUp.lead_status_comment.trim() !== '') {
                    return false;
                }
            }

            if (filters.notes && filters.notes !== 'is_empty') {
                if (!followUp.notes?.toLowerCase().includes(String(filters.notes).toLowerCase())) {
                    return false;
                }
            } else if (filters.notes === 'is_empty') {
                if (followUp.notes && followUp.notes.trim() !== '') {
                    return false;
                }
            }

            // Driver columns filters
            if (filters.driver_phone && filters.driver_phone !== 'is_empty') {
                if (!followUp.driver?.phone?.toLowerCase().includes(String(filters.driver_phone).toLowerCase())) {
                    return false;
                }
            } else if (filters.driver_phone === 'is_empty') {
                if (followUp.driver?.phone && followUp.driver.phone.trim() !== '') {
                    return false;
                }
            }

            if (filters.driver_whatsapp && filters.driver_whatsapp !== 'is_empty') {
                if (!followUp.driver?.whatsapp_phone?.toLowerCase().includes(String(filters.driver_whatsapp).toLowerCase())) {
                    return false;
                }
            } else if (filters.driver_whatsapp === 'is_empty') {
                if (followUp.driver?.whatsapp_phone && followUp.driver.whatsapp_phone.trim() !== '') {
                    return false;
                }
            }

            if (filters.driver_email && filters.driver_email !== 'is_empty') {
                if (!followUp.driver?.email?.toLowerCase().includes(String(filters.driver_email).toLowerCase())) {
                    return false;
                }
            } else if (filters.driver_email === 'is_empty') {
                if (followUp.driver?.email && followUp.driver.email.trim() !== '') {
                    return false;
                }
            }

            if (filters.driver_campaign) {
                if (filters.driver_campaign === 'is_empty') {
                    if (followUp.driver?.campaign) {
                        return false;
                    }
                } else if (followUp.driver?.campaign?.id !== filters.driver_campaign) {
                    return false;
                }
            }

            if (filters.driver_lead_source) {
                if (filters.driver_lead_source === 'is_empty') {
                    if (followUp.driver?.lead_source) {
                        return false;
                    }
                } else if (followUp.driver?.lead_source?.id !== filters.driver_lead_source) {
                    return false;
                }
            }

            if (filters.driver_lead_status) {
                if (filters.driver_lead_status === 'is_empty') {
                    if (followUp.driver?.lead_status) {
                        return false;
                    }
                } else if (followUp.driver?.lead_status?.id !== filters.driver_lead_status) {
                    return false;
                }
            }

            if (filters.driver_lead_stage) {
                if (filters.driver_lead_stage === 'is_empty') {
                    if (followUp.driver?.lead_stage) {
                        return false;
                    }
                } else if (followUp.driver?.lead_stage?.id !== filters.driver_lead_stage) {
                    return false;
                }
            }

            if (filters.driver_assigned_to) {
                if (filters.driver_assigned_to === 'is_empty') {
                    if (followUp.driver?.assigned_to) {
                        return false;
                    }
                } else if (followUp.driver?.assigned_to?.id !== filters.driver_assigned_to) {
                    return false;
                }
            }

            // Next Follow-up (Leads) filter
            if (filters.driver_next_follow_up && filters.driver_next_follow_up !== 'is_empty') {
                if (!followUp.driver?.next_follow_up || !followUp.driver.next_follow_up.includes(String(filters.driver_next_follow_up))) {
                    return false;
                }
            } else if (filters.driver_next_follow_up === 'is_empty') {
                if (followUp.driver?.next_follow_up && followUp.driver.next_follow_up.trim() !== '') {
                    return false;
                }
            }

            // Last Follow-up (Leads) filter
            if (filters.driver_last_follow_up && filters.driver_last_follow_up !== 'is_empty') {
                if (!followUp.driver?.last_follow_up || !followUp.driver.last_follow_up.includes(String(filters.driver_last_follow_up))) {
                    return false;
                }
            } else if (filters.driver_last_follow_up === 'is_empty') {
                if (followUp.driver?.last_follow_up && followUp.driver.last_follow_up.trim() !== '') {
                    return false;
                }
            }

            return true;
        });
    }, [safeFollowUps, filters]);

    // Sort and filter
    const sortedAndFilteredFollowUps = useMemo(() => {
        if (!filteredFollowUps || !Array.isArray(filteredFollowUps)) {
            return [];
        }
        let result = [...filteredFollowUps];
        
        if (sortField) {
            result.sort((a, b) => {
                let aValue: any;
                let bValue: any;
                
                switch (sortField) {
                    case 'driver_num':
                        aValue = a.driver_num || String(a.driver_id);
                        bValue = b.driver_num || String(b.driver_id);
                        break;
                    case 'driver':
                        aValue = a.driver?.full_name || '';
                        bValue = b.driver?.full_name || '';
                        break;
                    case 'user_name':
                        aValue = a.user_name || '';
                        bValue = b.user_name || '';
                        break;
                    case 'assigned_to':
                        aValue = a.assigned_to_user?.name || '';
                        bValue = b.assigned_to_user?.name || '';
                        break;
                    case 'lead_stage':
                        aValue = a.lead_stage || '';
                        bValue = b.lead_stage || '';
                        break;
                    case 'lead_status':
                        aValue = a.lead_status || '';
                        bValue = b.lead_status || '';
                        break;
                    case 'lead_status_comment':
                        aValue = a.lead_status_comment || '';
                        bValue = b.lead_status_comment || '';
                        break;
                    case 'cancel_reason':
                        aValue = a.driver?.cancel_reason || '';
                        bValue = b.driver?.cancel_reason || '';
                        break;
                    case 'next_follow_up_drivers':
                        aValue = a.driver?.next_follow_up || '';
                        bValue = b.driver?.next_follow_up || '';
                        break;
                    case 'last_follow_up_drivers':
                        aValue = a.driver?.last_follow_up || '';
                        bValue = b.driver?.last_follow_up || '';
                        break;
                    case 'created_time':
                        aValue = a.created_time ? new Date(a.created_time).getTime() : 0;
                        bValue = b.created_time ? new Date(b.created_time).getTime() : 0;
                        break;
                    default:
                        return 0;
                }
                
                if (typeof aValue === 'string') {
                    aValue = aValue.toLowerCase();
                    bValue = String(bValue).toLowerCase();
                }
                
                if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
                return 0;
            });
        } else {
            result.sort((a, b) => {
                const aDate = new Date(a.created_at).getTime();
                const bDate = new Date(b.created_at).getTime();
                return bDate - aDate;
            });
        }
        
        return result;
    }, [filteredFollowUps, sortField, sortDirection]);

    // Pagination
    const paginatedFollowUps = useMemo(() => {
        if (!sortedAndFilteredFollowUps || sortedAndFilteredFollowUps.length === 0) {
            return [];
        }
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        return sortedAndFilteredFollowUps.slice(startIndex, endIndex);
    }, [sortedAndFilteredFollowUps, currentPage, pageSize]);

    const totalPages = useMemo(() => {
        if (!sortedAndFilteredFollowUps || sortedAndFilteredFollowUps.length === 0) {
            return 1;
        }
        return Math.ceil(sortedAndFilteredFollowUps.length / pageSize);
    }, [sortedAndFilteredFollowUps, pageSize]);

    const handlePageChange = (newPage: number) => {
        setCurrentPage(newPage);
    };

    const handlePageSizeChange = (newSize: number) => {
        setPageSize(newSize);
        setCurrentPage(1);
    };

    const handleSelectFollowUp = (followUpId: number, checked: boolean) => {
        const newSelected = new Set(selectedFollowUps);
        if (checked) {
            newSelected.add(followUpId);
        } else {
            newSelected.delete(followUpId);
        }
        setSelectedFollowUps(newSelected);
    };

    // Handle select all in current page only
    const handleSelectAll = useCallback((checked: boolean) => {
        setSelectedFollowUps((prevSelected) => {
            const newSelected = new Set(prevSelected);
            if (paginatedFollowUps && Array.isArray(paginatedFollowUps)) {
                if (checked) {
                    paginatedFollowUps.forEach((f) => newSelected.add(f.id));
                } else {
                    paginatedFollowUps.forEach((f) => newSelected.delete(f.id));
                }
            }
            return newSelected;
        });
    }, [paginatedFollowUps]);

    // Handle select all visible records (all filtered/sorted records)
    const handleSelectAllVisible = useCallback(() => {
        if (sortedAndFilteredFollowUps && Array.isArray(sortedAndFilteredFollowUps)) {
            setSelectedFollowUps((prevSelected) => {
                const newSelected = new Set(prevSelected);
                sortedAndFilteredFollowUps.forEach((f) => newSelected.add(f.id));
                return newSelected;
            });
        }
    }, [sortedAndFilteredFollowUps]);

    const isAllSelected = useMemo(() => {
        if (!paginatedFollowUps || paginatedFollowUps.length === 0) {
            return false;
        }
        return paginatedFollowUps.every((f) => selectedFollowUps.has(f.id));
    }, [paginatedFollowUps, selectedFollowUps]);

    const isIndeterminate = useMemo(() => {
        if (!paginatedFollowUps || paginatedFollowUps.length === 0) {
            return false;
        }
        return paginatedFollowUps.some((f) => selectedFollowUps.has(f.id)) && !isAllSelected;
    }, [paginatedFollowUps, selectedFollowUps, isAllSelected]);

    const handleFilterChange = (field: string, value: string | number | null | 'is_empty') => {
        setFilters((prev) => ({
            ...prev,
            [field]: value,
        }));
        setCurrentPage(1);
    };

    const clearFilter = (field: string) => {
        setFilters((prev) => ({
            ...prev,
            [field]: field.includes('_to') ? null : '',
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
            driver_num: '',
            driver: '',
            user_name: '',
            assigned_to: null,
            lead_stage: '',
            lead_status: '',
            lead_status_comment: '',
            notes: '',
            // Driver columns filters
            driver_phone: '',
            driver_whatsapp: '',
            driver_email: '',
            driver_campaign: null,
            driver_lead_source: null,
            driver_lead_status: null,
            driver_lead_stage: null,
            driver_assigned_to: null,
            driver_next_follow_up: '',
            driver_last_follow_up: '',
        });
    };

    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const clearSort = () => {
        setSortField(null);
        setSortDirection('desc');
    };

    const handleDelete = (followUp: DriverFollowUp) => {
        setDeleteDialog({ open: true, followUp });
    };

    const confirmDelete = () => {
        if (deleteDialog.followUp) {
            router.delete(`/drivers/driver-follow-ups/${deleteDialog.followUp.id}`, {
                onSuccess: () => {
                    router.reload({ only: ['followUps'] });
                },
            });
        }
    };

    const handleMassDelete = () => {
        setMassDeleteDialog(true);
    };

    const confirmMassDelete = () => {
        if (selectedFollowUps.size > 0) {
            router.post('/drivers/driver-follow-ups/mass-delete', {
                ids: Array.from(selectedFollowUps),
            }, {
                onSuccess: () => {
                    setSelectedFollowUps(new Set());
                    setMassDeleteDialog(false);
                    router.reload({ only: ['followUps'] });
                },
            });
        }
    };

    const handleMassEdit = () => {
        if (selectedFollowUps.size > 0) {
            const ids = Array.from(selectedFollowUps);
            router.visit(`/drivers/driver-follow-ups/mass-edit?ids=${ids.join(',')}`);
        }
    };

    // Get unique values for filter dropdowns
    const uniqueUsers = useMemo(() => {
        const usersMap = new Map<number, User>();
        safeFollowUps.forEach(followUp => {
            if (followUp.assigned_to_user) {
                usersMap.set(followUp.assigned_to_user.id, followUp.assigned_to_user);
            }
            if (followUp.driver?.assigned_to) {
                usersMap.set(followUp.driver.assigned_to.id, followUp.driver.assigned_to);
            }
        });
        return Array.from(usersMap.values());
    }, [safeFollowUps]);

    const uniqueCampaigns = useMemo(() => {
        const campaignsMap = new Map<number, Campaign>();
        safeFollowUps.forEach(followUp => {
            if (followUp.driver?.campaign) {
                campaignsMap.set(followUp.driver.campaign.id, followUp.driver.campaign);
            }
        });
        return Array.from(campaignsMap.values());
    }, [safeFollowUps]);

    const uniqueLeadSources = useMemo(() => {
        const leadSourcesMap = new Map<number, LeadSource>();
        safeFollowUps.forEach(followUp => {
            if (followUp.driver?.lead_source) {
                leadSourcesMap.set(followUp.driver.lead_source.id, followUp.driver.lead_source);
            }
        });
        return Array.from(leadSourcesMap.values());
    }, [safeFollowUps]);

    const uniqueLeadStatuses = useMemo(() => {
        const leadStatusesMap = new Map<number, LeadStatus>();
        safeFollowUps.forEach(followUp => {
            if (followUp.driver?.lead_status) {
                leadStatusesMap.set(followUp.driver.lead_status.id, followUp.driver.lead_status);
            }
        });
        return Array.from(leadStatusesMap.values());
    }, [safeFollowUps]);

    const uniqueLeadStages = useMemo(() => {
        const leadStagesMap = new Map<number, LeadStage>();
        safeFollowUps.forEach(followUp => {
            if (followUp.driver?.lead_stage) {
                leadStagesMap.set(followUp.driver.lead_stage.id, followUp.driver.lead_stage);
            }
        });
        return Array.from(leadStagesMap.values());
    }, [safeFollowUps]);

    return (
        <AppLayout>
            <Head title="Lead Follow-ups" />
            <div className="p-6">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Lead Follow-ups</h1>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            Track all changes made to leads
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                if (selectedFollowUps.size > 0) {
                                    // Export selected follow-ups
                                    const ids = Array.from(selectedFollowUps);
                                    window.location.href = `/drivers/driver-follow-ups/export?ids=${ids.join(',')}`;
                                } else {
                                    // Export all visible follow-ups
                                    window.location.href = '/drivers/driver-follow-ups/export';
                                }
                            }}
                        >
                            Export
                        </Button>
                        <Link href="/drivers/driver-follow-ups/create">
                            <Button>Create Follow-up</Button>
                        </Link>
                    </div>
                </div>

                <Card className="p-6">
                    {safeFollowUps.length > 0 ? (
                        <>
                            {/* Mass Actions Bar */}
                            {selectedFollowUps.size > 0 && (
                                <div className="mb-4 p-3 bg-muted rounded-md flex items-center justify-between">
                                    <span className="text-sm font-medium">
                                        {selectedFollowUps.size} follow-up(s) selected
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
                                    {isAllSelected && sortedAndFilteredFollowUps && sortedAndFilteredFollowUps.length > 0 && (
                                        <button
                                            onClick={handleSelectAllVisible}
                                            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
                                        >
                                            Select all {sortedAndFilteredFollowUps.length} follow-up(s)
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
                                        Total: {sortedAndFilteredFollowUps?.length || 0} follow-up(s)
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
                                                const columnDef = ALL_COLUMNS.find(c => c.id === col.id);
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
                                                const columnDef = ALL_COLUMNS.find(c => c.id === col.id);
                                                const sortKey = col.id === 'driver' ? 'driver' : 
                                                               col.id === 'driver_num' ? 'driver_num' :
                                                               col.id === 'user_name' ? 'user_name' :
                                                               col.id === 'assigned_to' ? 'assigned_to' :
                                                               col.id === 'lead_stage' ? 'lead_stage' :
                                                               col.id === 'lead_status' ? 'lead_status' :
                                                               col.id === 'lead_status_comment' ? 'lead_status_comment' :
                                                               col.id === 'created_time' ? 'created_time' :
                                                               col.id.startsWith('driver_') ? col.id : col.id;
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
                                                const filterKey = col.id === 'driver' ? 'driver' : 
                                                                  col.id === 'driver_num' ? 'driver_num' :
                                                                  col.id === 'user_name' ? 'user_name' :
                                                                  col.id === 'assigned_to' ? 'assigned_to' :
                                                                  col.id === 'lead_stage' ? 'lead_stage' :
                                                                  col.id === 'lead_status' ? 'lead_status' :
                                                                  col.id === 'lead_status_comment' ? 'lead_status_comment' :
                                                                  col.id === 'notes' ? 'notes' :
                                                                  col.id === 'next_follow_up_drivers' ? 'driver_next_follow_up' :
                                                                  col.id === 'last_follow_up_drivers' ? 'driver_last_follow_up' :
                                                                  col.id === 'driver_last_assigned_date' ? 'driver_last_assigned_time' :
                                                                  col.id.startsWith('driver_') ? col.id : col.id;
                                                // Date inputs for next_follow_up_drivers, last_follow_up_drivers, and driver_last_assigned_date
                                                if (col.id === 'next_follow_up_drivers' || col.id === 'last_follow_up_drivers' || col.id === 'driver_last_assigned_date') {
                                                    return (
                                                        <th key={col.id} className="px-4 py-2">
                                                            <div className="relative">
                                                                <Input
                                                                    type="date"
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
                                                }
                                                if (col.id === 'assigned_to' || col.id === 'driver_assigned_to' || 
                                                    col.id === 'driver_campaign' || col.id === 'driver_lead_source' || 
                                                    col.id === 'driver_lead_status' || col.id === 'driver_lead_stage') {
                                                    let options: Array<{ id: number; name: string }> = [];
                                                    if (col.id === 'assigned_to' || col.id === 'driver_assigned_to') {
                                                        options = uniqueUsers;
                                                    } else if (col.id === 'driver_campaign') {
                                                        options = uniqueCampaigns;
                                                    } else if (col.id === 'driver_lead_source') {
                                                        options = uniqueLeadSources;
                                                    } else if (col.id === 'driver_lead_status') {
                                                        options = uniqueLeadStatuses;
                                                    } else if (col.id === 'driver_lead_stage') {
                                                        options = uniqueLeadStages;
                                                    }
                                                    
                                                    return (
                                                        <th key={col.id} className="px-4 py-2">
                                                            <div className="relative">
                                                                <Select
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
                                                                        {options.map((option) => (
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
                                        {(!paginatedFollowUps || paginatedFollowUps.length === 0) ? (
                                            <tr>
                                                <td
                                                    colSpan={(visibleColumns?.length || 0) + 1}
                                                    className="px-4 py-8 text-center text-sm text-neutral-500"
                                                >
                                                    No follow-ups found
                                                </td>
                                            </tr>
                                        ) : (
                                            (paginatedFollowUps || []).map((followUp, index) => (
                                                <tr
                                                    key={followUp.id}
                                                    className={`
                                                        transition-colors duration-150
                                                        ${
                                                            index === 0
                                                                ? 'bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100/70 dark:hover:bg-blue-950/40'
                                                                : index % 2 === 0
                                                                  ? 'bg-white dark:bg-neutral-950 hover:bg-neutral-50 dark:hover:bg-neutral-900/50'
                                                                  : 'bg-neutral-50/80 dark:bg-neutral-900/30 hover:bg-neutral-100 dark:hover:bg-neutral-900/60'
                                                        }
                                                    `}
                                                >
                                                    <td className="px-4 py-3">
                                                        <Checkbox
                                                            checked={selectedFollowUps.has(followUp.id)}
                                                            onCheckedChange={(checked) => {
                                                                handleSelectFollowUp(followUp.id, checked as boolean);
                                                            }}
                                                        />
                                                    </td>
                                                    {(visibleColumns || []).map((col) => {
                                                        if (col.id === 'actions') {
                                                            return (
                                                                <td key={col.id} className="px-4 py-3 text-center">
                                                                    <div className="flex items-center justify-center gap-2">
                                                                        <Link href={`/drivers/driver-follow-ups/${followUp.id}`}>
                                                                            <button
                                                                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                                                                title="View Details"
                                                                            >
                                                                                <Eye className="h-4 w-4" />
                                                                            </button>
                                                                        </Link>
                                                                        <Link href={`/drivers/driver-follow-ups/${followUp.id}/edit`}>
                                                                            <button
                                                                                className="text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-300"
                                                                                title="Edit"
                                                                            >
                                                                                <Pencil className="h-4 w-4" />
                                                                            </button>
                                                                        </Link>
                                                                        {canDeleteFollowUp() && (
                                                                            <button
                                                                                onClick={() => handleDelete(followUp)}
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
                                                        let cellContent: React.ReactNode = '';
                                                        switch (col.id) {
                                                            case 'driver_num':
                                                                cellContent = (
                                                                    <Link
                                                                        href={`/drivers/drivers/${followUp.driver_id}`}
                                                                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline font-medium"
                                                                    >
                                                                        {followUp.driver_num || followUp.driver_id}
                                                                    </Link>
                                                                );
                                                                break;
                                                            case 'driver':
                                                                cellContent = (
                                                                    <Link
                                                                        href={`/drivers/drivers/${followUp.driver_id}`}
                                                                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline font-medium"
                                                                    >
                                                                        {followUp.driver?.full_name || 'N/A'}
                                                                    </Link>
                                                                );
                                                                break;
                                                            case 'user_name':
                                                                cellContent = followUp.user_name || '-';
                                                                break;
                                                            case 'assigned_to':
                                                                cellContent = followUp.assigned_to_user?.name || 'N/A';
                                                                break;
                                                            case 'created_time':
                                                                cellContent = followUp.created_time
                                                                    ? formatDate(followUp.created_time)
                                                                    : 'N/A';
                                                                break;
                                                            case 'lead_stage':
                                                                cellContent = followUp.lead_stage || 'N/A';
                                                                break;
                                                            case 'lead_status':
                                                                cellContent = followUp.lead_status || 'N/A';
                                                                break;
                                                            case 'lead_status_comment':
                                                                cellContent = followUp.lead_status_comment ? (
                                                                    <div className="max-w-xs truncate" title={followUp.lead_status_comment}>
                                                                        {followUp.lead_status_comment}
                                                                    </div>
                                                                ) : 'N/A';
                                                                break;
                                                            case 'cancel_reason':
                                                                cellContent = followUp.driver?.cancel_reason || '-';
                                                                break;
                                                            case 'notes':
                                                                cellContent = followUp.notes ? (
                                                                    <div className="max-w-xs truncate" title={followUp.notes}>
                                                                        {followUp.notes}
                                                                    </div>
                                                                ) : '-';
                                                                break;
                                                            case 'created_at':
                                                                cellContent = followUp.created_at ? formatDate(followUp.created_at) : '-';
                                                                break;
                                                            // Driver columns
                                                            case 'driver_phone':
                                                                cellContent = followUp.driver?.phone || '-';
                                                                break;
                                                            case 'driver_whatsapp':
                                                                cellContent = followUp.driver?.whatsapp_phone || '-';
                                                                break;
                                                            case 'driver_email':
                                                                cellContent = followUp.driver?.email || '-';
                                                                break;
                                                            case 'driver_campaign':
                                                                cellContent = followUp.driver?.campaign?.name || '-';
                                                                break;
                                                            case 'driver_lead_source':
                                                                cellContent = followUp.driver?.lead_source?.name || '-';
                                                                break;
                                                            case 'driver_lead_status':
                                                                cellContent = followUp.driver?.lead_status?.name || '-';
                                                                break;
                                                            case 'driver_lead_stage':
                                                                cellContent = followUp.driver?.lead_stage?.name || '-';
                                                                break;
                                                            case 'driver_assigned_to':
                                                                cellContent = followUp.driver?.assigned_to?.name || '-';
                                                                break;
                                                            case 'driver_last_assigned_time':
                                                                cellContent = followUp.driver?.last_assigned_time ? (
                                                                    <span>{new Date(followUp.driver.last_assigned_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                                                                ) : '-';
                                                                break;
                                                            case 'driver_last_assigned_date':
                                                                cellContent = followUp.driver?.last_assigned_time ? (
                                                                    <span>{formatDate(followUp.driver.last_assigned_time)}</span>
                                                                ) : '-';
                                                                break;
                                                            case 'driver_last_assigned_by':
                                                                cellContent = followUp.driver?.last_assigned_by?.name || '-';
                                                                break;
                                                            case 'driver_notes':
                                                                cellContent = followUp.driver?.notes ? (
                                                                    <div className="max-w-xs truncate" title={followUp.driver.notes}>
                                                                        {followUp.driver.notes}
                                                                    </div>
                                                                ) : '-';
                                                                break;
                                                            case 'driver_cancel_reason':
                                                                cellContent = followUp.driver?.cancel_reason || '-';
                                                                break;
                                                            case 'driver_vehicle_type':
                                                                cellContent = followUp.driver?.vehicle_type || '-';
                                                                break;
                                                            case 'driver_has_worked_before':
                                                                cellContent = followUp.driver?.has_worked_before || '-';
                                                                break;
                                                            case 'driver_city':
                                                                cellContent = followUp.driver?.city || followUp.driver?.governorate || '-';
                                                                break;
                                                            case 'driver_feedback_count':
                                                                cellContent = followUp.driver?.feedback_count ?? 0;
                                                                break;
                                                            case 'driver_assigned_users':
                                                                cellContent = followUp.driver?.assigned_users && followUp.driver.assigned_users.length > 0 ? (
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {followUp.driver.assigned_users.map((user) => (
                                                                            <span key={user.id} className="text-xs bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded">
                                                                                {user.name}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                ) : '-';
                                                                break;
                                                            case 'driver_uuid':
                                                                cellContent = followUp.driver?.uuid || '-';
                                                                break;
                                                            case 'driver_created_at':
                                                                cellContent = followUp.driver?.created_at ? formatDate(followUp.driver.created_at) : '-';
                                                                break;
                                                            case 'driver_updated_at':
                                                                cellContent = followUp.driver?.updated_at ? formatDate(followUp.driver.updated_at) : '-';
                                                                break;
                                                            case 'next_follow_up_drivers':
                                                                cellContent = followUp.driver?.next_follow_up ? formatDate(followUp.driver.next_follow_up) : '-';
                                                                break;
                                                            case 'last_follow_up_drivers':
                                                                cellContent = followUp.driver?.last_follow_up ? formatDate(followUp.driver.last_follow_up) : '-';
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
                            No follow-ups found
                        </div>
                    )}
                </Card>

                <DeleteDialog
                    open={deleteDialog.open}
                    onOpenChange={(open) => setDeleteDialog({ open, followUp: null })}
                    onConfirm={confirmDelete}
                    title="Delete Follow-up"
                    description={`Are you sure you want to delete this follow-up record?`}
                />

                <DeleteDialog
                    open={massDeleteDialog}
                    onOpenChange={setMassDeleteDialog}
                    onConfirm={confirmMassDelete}
                    title="Delete Selected Follow-ups"
                    description={`Are you sure you want to delete ${selectedFollowUps.size} follow-up(s)? This action cannot be undone.`}
                />
            </div>
        </AppLayout>
    );
}
