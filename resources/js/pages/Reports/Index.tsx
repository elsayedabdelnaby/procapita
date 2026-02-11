import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    ArrowDown,
    ArrowDownAZ,
    ArrowUp,
    BarChart2,
    BarChart3,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Copy,
    Eye,
    Folder,
    MoreVertical,
    Pencil,
    Pin,
    PinOff,
    Plus,
    Search,
    Table,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const PRIMARY_MODULE_OPTIONS = [
    { value: 'leads', label: 'Leads' },
    { value: 'follow_ups', label: 'Follow-ups' },
];

const MAX_RELATED_MODULES = 2;

// Fields available per module for chart X-axis, Y-axis (Count of), and Legend
const MODULE_FIELDS: Record<string, { value: string; label: string }[]> = {
    leads: [
        { value: 'full_name', label: 'Full Name' },
        { value: 'phone', label: 'Phone' },
        { value: 'whatsapp_phone', label: 'WhatsApp Phone' },
        { value: 'email', label: 'Email' },
        { value: 'city', label: 'City' },
        { value: 'governorate', label: 'Governorate' },
        { value: 'company', label: 'Reseller' },
        { value: 'campaign', label: 'Campaign' },
        { value: 'lead_source', label: 'Lead Source' },
        { value: 'lead_status', label: 'Lead Status' },
        { value: 'lead_stage', label: 'Lead Stage' },
        { value: 'assigned_to', label: 'Assigned To (Sales Person)' },
        { value: 'team_leader', label: 'Team Leader' },
        { value: 'account_manager', label: 'Account Manager' },
        { value: 'last_assigned_by', label: 'Last Assigned By' },
        { value: 'notes', label: 'Notes' },
        { value: 'lead_status_comment', label: 'Feedback Comment' },
        { value: 'cancel_reason', label: 'Cancel Reason' },
        { value: 'driver_num', label: 'Lead Num' },
        { value: 'duplicate', label: 'Duplicate Count' },
        { value: 'resigned_leads', label: 'Resigned Leads' },
        { value: 'next_follow_up', label: 'Next Follow-up Date' },
        { value: 'last_follow_up', label: 'Last Follow-up Date' },
        { value: 'created_at', label: 'Created Date' },
    ],
    follow_ups: [
        { value: 'assigned_to', label: 'Assigned To (Sales Person)' },
        { value: 'user_name', label: 'User Name' },
        { value: 'team_leader', label: 'Team Leader' },
        { value: 'account_manager', label: 'Account Manager' },
        { value: 'lead_stage', label: 'Lead Stage' },
        { value: 'lead_status', label: 'Lead Status' },
        { value: 'created_time', label: 'Created Time' },
    ],
};

interface FolderItem {
    id: string;
    name: string;
    active?: boolean;
}

interface ReportItem {
    id: number;
    report_type: string;
    report_name: string;
    primary_module: string;
    folder_name: string;
    owner?: string;
    user_id?: number;
    is_owner?: boolean;
}

interface ReportsIndexProps {
    folders: FolderItem[];
    reports: ReportItem[];
    pagination: { from: number; to: number; total: number; per_page: number; current_page?: number };
    filters?: {
        folder_id?: string;
        report_type?: string;
        report_name?: string;
        primary_module?: string;
        folder_name?: string;
    };
    sort?: string;
    sort_dir?: 'asc' | 'desc';
    pinnedReportIds?: number[];
}

export default function ReportsIndex({
    folders,
    reports,
    pagination,
    filters: initialFilters = {},
    sort: initialSort = 'updated_at',
    sort_dir: initialSortDir = 'desc',
    pinnedReportIds = [],
}: ReportsIndexProps) {
    const [folderSearch, setFolderSearch] = useState('');
    const [foldersCollapsed, setFoldersCollapsed] = useState(false);
    const [reportTypeFilter, setReportTypeFilter] = useState(initialFilters.report_type ?? '');
    const [reportNameFilter, setReportNameFilter] = useState(initialFilters.report_name ?? '');
    const [primaryModuleFilter, setPrimaryModuleFilter] = useState(
        initialFilters.primary_module ?? ''
    );
    const [folderNameFilter, setFolderNameFilter] = useState(initialFilters.folder_name ?? '');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    const currentFolderId = initialFilters.folder_id ?? 'all';
    const currentPage = pagination.current_page ?? 1;

    // Create report - Step 1
    const [createReportOpen, setCreateReportOpen] = useState(false);
    const [createStep, setCreateStep] = useState<1 | 2>(1);
    const [createReportType, setCreateReportType] = useState<'pivot' | 'charts' | null>(null);
    const [step1Form, setStep1Form] = useState({
        report_name: '',
        report_folder_id: '',
        primary_module: '',
        related_modules: [] as string[],
        description: '',
        share_report: ['all'] as (string | number)[],
    });
    const [step1Errors, setStep1Errors] = useState<Record<string, string>>({});
    // Step 2 - Pivot: MODULE*, X-axis, Y-axis, VALUES (COUNT)
    const [step2PivotForm, setStep2PivotForm] = useState({
        module: '',
        x_axis: '',
        y_axis: '',
        values_count_field: '',
    });
    const [step2PivotErrors, setStep2PivotErrors] = useState<Record<string, string>>({});
    // Step 2 - Charts: chart type, X-axis, Y-axis (Count of), Legend
    const [step2ChartsForm, setStep2ChartsForm] = useState({
        chart_type: 'vertical' as 'vertical' | 'horizontal',
        x_axis: '',
        y_axis: '',
        legend: '',
    });
    const [step2ChartsErrors, setStep2ChartsErrors] = useState<Record<string, string>>({});

    const folderOptions = folders.filter((f) => f.id !== 'all' && f.id !== 'shared');

    const openCreateReport = (type: 'pivot' | 'charts') => {
        setCreateReportType(type);
        setCreateStep(1);
        setStep1Form({
            report_name: '',
            report_folder_id: '',
            primary_module: '',
            related_modules: [],
            description: '',
            share_report: ['all'],
        });
        setStep1Errors({});
        setStep2PivotForm({ module: '', x_axis: '', y_axis: '', values_count_field: '' });
        setStep2PivotErrors({});
        setStep2ChartsForm({
            chart_type: 'vertical',
            x_axis: '',
            y_axis: '',
            legend: '',
        });
        setStep2ChartsErrors({});
        setCreateReportOpen(true);
    };

    const handleRelatedModulesChange = (value: (string | number)[]) => {
        const strValues = value.map(String).slice(0, MAX_RELATED_MODULES);
        setStep1Form((prev) => ({ ...prev, related_modules: strValues }));
    };

    const handleStep1Next = () => {
        const err: Record<string, string> = {};
        if (!step1Form.report_name.trim()) err.report_name = 'Report Name is required';
        if (!step1Form.report_folder_id) err.report_folder_id = 'Report Folder is required';
        if (!step1Form.primary_module) err.primary_module = 'Primary Module is required';
        setStep1Errors(err);
        if (Object.keys(err).length > 0) return;
        if (createReportType === 'pivot') {
            setStep2PivotForm((prev) => ({ ...prev, module: step1Form.primary_module }));
        }
        if (createReportType === 'charts') {
            setStep2ChartsForm((prev) => ({
                ...prev,
                x_axis: '',
                y_axis: '',
                legend: '',
            }));
        }
        setCreateStep(2);
    };

    const handleStep2Back = () => {
        setCreateStep(1);
    };

    const pivotModuleFields = step2PivotForm.module ? MODULE_FIELDS[step2PivotForm.module] ?? [] : [];
    const pivotValuesOptions = pivotModuleFields.map((f) => ({
        value: f.value,
        label: `Count of ${f.label}`,
    }));

    const handleStep2PivotSubmit = () => {
        const err: Record<string, string> = {};
        if (!step2PivotForm.module) err.module = 'Module is required';
        if (!step2PivotForm.x_axis) err.x_axis = 'X-axis is required';
        if (!step2PivotForm.y_axis) err.y_axis = 'Y-axis is required';
        if (!step2PivotForm.values_count_field) err.values_count_field = 'Values (Count) is required';
        setStep2PivotErrors(err);
        if (Object.keys(err).length > 0) return;
        router.post('/reports', {
            report_name: step1Form.report_name,
            report_folder_id: step1Form.report_folder_id,
            primary_module: step1Form.primary_module,
            related_modules: step1Form.related_modules,
            description: step1Form.description || null,
            share_report: step1Form.share_report,
            report_type: 'pivot',
            settings: step2PivotForm,
        });
        setCreateReportOpen(false);
    };

    const chartsModuleFields = step1Form.primary_module ? MODULE_FIELDS[step1Form.primary_module] ?? [] : [];
    const chartsYAxisOptions = chartsModuleFields.map((f) => ({
        value: f.value,
        label: `Count of ${f.label}`,
    }));

    const handleStep2ChartsSubmit = () => {
        const err: Record<string, string> = {};
        if (!step2ChartsForm.x_axis) err.x_axis = 'X-axis is required';
        if (!step2ChartsForm.y_axis) err.y_axis = 'Y-axis is required';
        if (!step2ChartsForm.legend) err.legend = 'Legend is required';
        setStep2ChartsErrors(err);
        if (Object.keys(err).length > 0) return;
        router.post('/reports', {
            report_name: step1Form.report_name,
            report_folder_id: step1Form.report_folder_id,
            primary_module: step1Form.primary_module,
            related_modules: step1Form.related_modules,
            description: step1Form.description || null,
            share_report: step1Form.share_report,
            report_type: 'charts',
            settings: step2ChartsForm,
        });
        setCreateReportOpen(false);
    };

    const openViewReport = (report: ReportItem) => {
        router.visit(`/reports/${report.id}`);
    };

    const filteredFolders = folders.filter((f) =>
        f.name.toLowerCase().includes(folderSearch.toLowerCase())
    );

    const toggleSelect = (id: number) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === reports.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(reports.map((r) => r.id));
        }
    };

    const buildListParams = (page: number, perPage = pagination.per_page, sortCol = initialSort, sortDir = initialSortDir) => {
        const params: Record<string, string | number> = {
            folder_id: currentFolderId,
            page,
            per_page: perPage,
            sort: sortCol,
            dir: sortDir,
        };
        if (reportTypeFilter) params.report_type = reportTypeFilter;
        if (reportNameFilter) params.report_name = reportNameFilter;
        if (primaryModuleFilter) params.primary_module = primaryModuleFilter;
        if (folderNameFilter) params.folder_name = folderNameFilter;
        return params;
    };

    const applyFilters = () => {
        router.get('/reports', buildListParams(1));
    };

    const applySort = (sortCol: string, sortDir: 'asc' | 'desc') => {
        router.get('/reports', buildListParams(1, pagination.per_page, sortCol, sortDir));
    };

    const goToPage = (page: number) => {
        router.get('/reports', buildListParams(page));
    };

    const handlePerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const perPage = Number(e.target.value);
        router.get('/reports', buildListParams(1, perPage));
    };

    const handleBulkDelete = () => {
        if (selectedIds.length === 0) return;
        if (!confirm(`Delete ${selectedIds.length} selected report(s)?`)) return;
        router.post('/reports/mass-delete', { ids: selectedIds });
    };

    const handleDeleteReport = (report: ReportItem) => {
        if (!confirm(`Delete report "${report.report_name}"?`)) return;
        router.delete(`/reports/${report.id}`);
    };

    const handleDuplicateReport = (report: ReportItem) => {
        router.post(`/reports/${report.id}/duplicate`);
    };

    const handleEditReport = (report: ReportItem) => {
        router.visit(`/reports/${report.id}/edit`);
    };

    // Add folder dialog
    const [addFolderOpen, setAddFolderOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [addFolderSubmitting, setAddFolderSubmitting] = useState(false);

    const handleAddFolder = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newFolderName.trim()) return;
        setAddFolderSubmitting(true);
        router.post('/reports/folders', { name: newFolderName.trim() }, {
            onFinish: () => {
                setAddFolderSubmitting(false);
                setNewFolderName('');
                setAddFolderOpen(false);
            },
        });
    };

    return (
        <AppLayout breadcrumbs={[]}>
            <Head title="Reports - All Reports" />

            {/* Orange accent bar at top */}
            <div className="h-1 shrink-0 bg-orange-500" />

            <div className="flex flex-1 min-h-0">
                {/* FOLDERS sidebar */}
                <aside
                    className={cn(
                        'flex flex-col border-r border-sidebar-border bg-card shrink-0 transition-[width] ease-linear',
                        foldersCollapsed ? 'w-12' : 'w-64'
                    )}
                >
                    {!foldersCollapsed && (
                        <>
                            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-sidebar-border">
                                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Folders
                                </span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    title="Add folder"
                                    onClick={() => setAddFolderOpen(true)}
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="p-2 border-b border-sidebar-border">
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search for folders"
                                        value={folderSearch}
                                        onChange={(e) => setFolderSearch(e.target.value)}
                                        className="pl-8 h-8 text-sm bg-muted/50 border-0 focus-visible:ring-1"
                                    />
                                </div>
                            </div>
                            <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
                                {filteredFolders.map((folder) => (
                                    <Link
                                        key={folder.id}
                                        href={folder.id === 'all' ? '/reports' : `/reports?folder_id=${folder.id}`}
                                        className={cn(
                                            'flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors',
                                            folder.active
                                                ? 'bg-primary/10 text-primary font-medium'
                                                : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                                        )}
                                    >
                                        <Folder className="h-4 w-4 shrink-0" />
                                        <span className="truncate">{folder.name}</span>
                                    </Link>
                                ))}
                                <button
                                    type="button"
                                    className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground w-full"
                                >
                                    <span className="truncate">More...</span>
                                </button>
                            </nav>
                        </>
                    )}
                    <button
                        type="button"
                        onClick={() => setFoldersCollapsed(!foldersCollapsed)}
                        className="mt-auto flex items-center justify-center h-10 border-t border-sidebar-border text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                        title={foldersCollapsed ? 'Expand folders' : 'Collapse folders'}
                    >
                        <ChevronLeft
                            className={cn('h-4 w-4', foldersCollapsed && 'rotate-180')}
                        />
                    </button>
                </aside>

                {/* Main content */}
                <div className="flex flex-1 flex-col min-w-0">
                    {/* Header: icon + breadcrumb + Add Report */}
                    <div className="flex h-16 shrink-0 items-center gap-3 border-b border-sidebar-border px-6 bg-background">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500/15 text-orange-600 dark:text-orange-400">
                            <BarChart3 className="h-5 w-5" />
                        </div>
                        <nav className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Link href="/reports" className="hover:text-foreground">
                                Reports
                            </Link>
                            <span>/</span>
                            <Link href="/reports" className="hover:text-foreground">
                                List
                            </Link>
                            <span>/</span>
                            <span className="text-foreground font-medium">All Reports</span>
                        </nav>
                        <div className="ml-auto">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                        <Plus className="h-4 w-4 mr-1" />
                                        Add Report
                                        <ChevronDown className="h-4 w-4 ml-1" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="min-w-[180px]">
                                    <DropdownMenuItem
                                        onClick={() => openCreateReport('pivot')}
                                        className="flex items-center gap-2"
                                    >
                                        <Table className="h-4 w-4" />
                                        Pivot Tables
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => openCreateReport('charts')}
                                        className="flex items-center gap-2"
                                    >
                                        <BarChart2 className="h-4 w-4" />
                                        Chart
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    {/* Toolbar */}
                    <div className="flex items-center justify-between gap-4 px-6 py-3 border-b border-sidebar-border bg-muted/30">
                        <div className="flex items-center gap-2">
                            <Checkbox
                                checked={
                                    reports.length > 0 && selectedIds.length === reports.length
                                }
                                onCheckedChange={toggleSelectAll}
                            />
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title="Bulk delete"
                                onClick={handleBulkDelete}
                                disabled={selectedIds.length === 0}
                            >
                                <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                                {pagination.from} to {pagination.to} of {pagination.total}
                            </span>
                            <select
                                className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                                value={pagination.per_page}
                                onChange={handlePerPageChange}
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                            <div className="flex items-center gap-0.5">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    disabled={currentPage <= 1}
                                    onClick={() => goToPage(currentPage - 1)}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="flex items-center px-2 text-sm text-muted-foreground">
                                    {currentPage}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    disabled={currentPage * pagination.per_page >= pagination.total}
                                    onClick={() => goToPage(currentPage + 1)}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="flex-1 overflow-auto">
                        <table className="w-full border-collapse text-sm">
                            <thead>
                                <tr className="bg-muted/50">
                                    <th className="w-10 border-b border-sidebar-border p-2">
                                        <Checkbox
                                            checked={
                                                reports.length > 0 &&
                                                selectedIds.length === reports.length
                                            }
                                            onCheckedChange={toggleSelectAll}
                                        />
                                    </th>
                                    <th className="w-auto min-w-[10rem] border-b border-sidebar-border p-2 text-left font-medium text-muted-foreground">
                                        <span className="text-xs">Actions / Sort</span>
                                    </th>
                                    <th className="border-b border-sidebar-border p-3 text-left font-medium text-muted-foreground">
                                        Report Type
                                    </th>
                                    <th className="border-b border-sidebar-border p-3 text-left font-medium text-muted-foreground">
                                        Report Name
                                    </th>
                                    <th className="border-b border-sidebar-border p-3 text-left font-medium text-muted-foreground">
                                        Primary Module
                                    </th>
                                    <th className="border-b border-sidebar-border p-3 text-left font-medium text-muted-foreground">
                                        Folder Name
                                    </th>
                                    <th className="border-b border-sidebar-border p-3 text-left font-medium text-muted-foreground">
                                        Owner <span className="text-muted-foreground/80 font-normal">(صاحب التقرير)</span>
                                    </th>
                                </tr>
                                <tr className="bg-muted/30">
                                    <th className="w-10 p-1" />
                                    <th className="min-w-[10rem] p-1">
                                        <Button
                                            size="sm"
                                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                                            onClick={applyFilters}
                                        >
                                            <Search className="h-3 w-3 mr-1" />
                                            Search
                                        </Button>
                                    </th>
                                    <th className="p-2">
                                        <Input
                                            placeholder=""
                                            value={reportTypeFilter}
                                            onChange={(e) => setReportTypeFilter(e.target.value)}
                                            className="h-8 text-sm"
                                        />
                                    </th>
                                    <th className="p-2">
                                        <Input
                                            placeholder=""
                                            value={reportNameFilter}
                                            onChange={(e) => setReportNameFilter(e.target.value)}
                                            className="h-8 text-sm border-emerald-500/50 focus-visible:ring-emerald-500/50"
                                        />
                                    </th>
                                    <th className="p-2">
                                        <Input
                                            placeholder=""
                                            value={primaryModuleFilter}
                                            onChange={(e) =>
                                                setPrimaryModuleFilter(e.target.value)
                                            }
                                            className="h-8 text-sm"
                                        />
                                    </th>
                                    <th className="p-2">
                                        <Input
                                            placeholder=""
                                            value={folderNameFilter}
                                            onChange={(e) => setFolderNameFilter(e.target.value)}
                                            className="h-8 text-sm"
                                        />
                                    </th>
                                    <th className="p-2" />
                                </tr>
                            </thead>
                            <tbody>
                                {reports.map((report) => (
                                    <tr
                                        key={report.id}
                                        className="border-b border-sidebar-border hover:bg-muted/30 transition-colors"
                                    >
                                        <td className="p-2">
                                            <Checkbox
                                                checked={selectedIds.includes(report.id)}
                                                onCheckedChange={() => toggleSelect(report.id)}
                                            />
                                        </td>
                                        <td className="p-2">
                                            <div className="flex items-center gap-1 flex-wrap">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7"
                                                    title="View"
                                                    onClick={() => openViewReport(report)}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant={initialSort === 'report_name' && initialSortDir === 'asc' ? 'secondary' : 'ghost'}
                                                    size="icon"
                                                    className={cn('h-7 w-7', initialSort === 'report_name' && initialSortDir === 'asc' && 'bg-muted')}
                                                    title="Sort A–Z (by name)"
                                                    onClick={() => applySort('report_name', 'asc')}
                                                >
                                                    <ArrowDownAZ className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant={initialSort === 'updated_at' ? 'secondary' : 'ghost'}
                                                    size="icon"
                                                    className={cn('h-7 w-7', initialSort === 'updated_at' && 'bg-muted')}
                                                    title={initialSort === 'updated_at' && initialSortDir === 'asc' ? 'Sort descending (newest first)' : 'Sort ascending (oldest first)'}
                                                    onClick={() => applySort('updated_at', initialSort === 'updated_at' && initialSortDir === 'asc' ? 'desc' : 'asc')}
                                                >
                                                    {initialSort === 'updated_at' && initialSortDir === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                                                </Button>
                                                {report.is_owner && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7"
                                                        title="Edit"
                                                        onClick={() => handleEditReport(report)}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7"
                                                    title="Duplicate"
                                                    onClick={() => handleDuplicateReport(report)}
                                                >
                                                    <Copy className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7"
                                                    title={pinnedReportIds.includes(report.id) ? 'Unpin from dashboard' : 'Pin to dashboard'}
                                                    onClick={() =>
                                                        pinnedReportIds.includes(report.id)
                                                            ? router.delete(`/dashboard/widgets/${report.id}`)
                                                            : router.post('/dashboard/widgets', { report_id: report.id })
                                                    }
                                                >
                                                    {pinnedReportIds.includes(report.id) ? (
                                                        <PinOff className="h-4 w-4 text-muted-foreground" />
                                                    ) : (
                                                        <Pin className="h-4 w-4" />
                                                    )}
                                                </Button>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7"
                                                        >
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem
                                                            onClick={() =>
                                                                pinnedReportIds.includes(report.id)
                                                                    ? router.delete(`/dashboard/widgets/${report.id}`)
                                                                    : router.post('/dashboard/widgets', { report_id: report.id })
                                                            }
                                                        >
                                                            {pinnedReportIds.includes(report.id) ? (
                                                                <>
                                                                    <PinOff className="mr-2 h-4 w-4" />
                                                                    Unpin from dashboard
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Pin className="mr-2 h-4 w-4" />
                                                                    Pin to dashboard
                                                                </>
                                                            )}
                                                        </DropdownMenuItem>
                                                        {report.is_owner && (
                                                            <DropdownMenuItem onClick={() => handleEditReport(report)}>
                                                                <Pencil className="mr-2 h-4 w-4" />
                                                                Edit
                                                            </DropdownMenuItem>
                                                        )}
                                                        <DropdownMenuItem onClick={() => handleDuplicateReport(report)}>
                                                            <Copy className="mr-2 h-4 w-4" />
                                                            Duplicate
                                                        </DropdownMenuItem>
                                                        {report.is_owner && (
                                                            <DropdownMenuItem
                                                                className="text-destructive focus:text-destructive"
                                                                onClick={() => handleDeleteReport(report)}
                                                            >
                                                                Delete
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <div className="flex items-center gap-2">
                                                {report.report_type === 'pivot' ? (
                                                    <Table className="h-4 w-4 text-muted-foreground" />
                                                ) : (
                                                    <BarChart2 className="h-4 w-4 text-muted-foreground" />
                                                )}
                                                <span>{report.report_type === 'pivot' ? 'Pivot Table' : 'Chart'}</span>
                                            </div>
                                        </td>
                                        <td className="p-3 font-medium">{report.report_name}</td>
                                        <td className="p-3 text-muted-foreground">
                                            {report.primary_module}
                                        </td>
                                        <td className="p-3 text-muted-foreground">
                                            {report.folder_name}
                                        </td>
                                        <td className="p-3 text-muted-foreground">
                                            {report.owner ?? '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Create Report - Step 1 & Step 2 (Pivot / Charts) */}
            <Dialog
                open={createReportOpen}
                onOpenChange={(open) => {
                    if (!open) setCreateStep(1);
                    setCreateReportOpen(open);
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {createStep === 1
                                ? `New ${createReportType === 'pivot' ? 'Pivot Table' : 'Chart'} Report`
                                : `Step 2 - ${createReportType === 'pivot' ? 'Pivot Table' : 'Chart'} Fields`}
                        </DialogTitle>
                    </DialogHeader>

                    {createStep === 1 && (
                        <>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="report_name">
                                        Report Name <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="report_name"
                                        value={step1Form.report_name}
                                        onChange={(e) =>
                                            setStep1Form((prev) => ({
                                                ...prev,
                                                report_name: e.target.value,
                                            }))
                                        }
                                        placeholder="e.g. Overdue at all"
                                        className={step1Errors.report_name ? 'border-destructive' : ''}
                                    />
                                    {step1Errors.report_name && (
                                        <p className="text-sm text-destructive">
                                            {step1Errors.report_name}
                                        </p>
                                    )}
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="report_folder">
                                        Report Folder <span className="text-destructive">*</span>
                                    </Label>
                                    <Select
                                        value={step1Form.report_folder_id}
                                        onValueChange={(value) =>
                                            setStep1Form((prev) => ({ ...prev, report_folder_id: value }))
                                        }
                                    >
                                        <SelectTrigger
                                            id="report_folder"
                                            className={
                                                step1Errors.report_folder_id ? 'border-destructive' : ''
                                            }
                                        >
                                            <SelectValue placeholder="Select folder" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {folderOptions.map((folder) => (
                                                <SelectItem key={folder.id} value={folder.id}>
                                                    {folder.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {step1Errors.report_folder_id && (
                                        <p className="text-sm text-destructive">
                                            {step1Errors.report_folder_id}
                                        </p>
                                    )}
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="primary_module">
                                        Primary Module <span className="text-destructive">*</span>
                                    </Label>
                                    <Select
                                        value={step1Form.primary_module}
                                        onValueChange={(value) =>
                                            setStep1Form((prev) => ({ ...prev, primary_module: value }))
                                        }
                                    >
                                        <SelectTrigger
                                            id="primary_module"
                                            className={
                                                step1Errors.primary_module ? 'border-destructive' : ''
                                            }
                                        >
                                            <SelectValue placeholder="Select module" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {PRIMARY_MODULE_OPTIONS.map((opt) => (
                                                <SelectItem key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {step1Errors.primary_module && (
                                        <p className="text-sm text-destructive">
                                            {step1Errors.primary_module}
                                        </p>
                                    )}
                                </div>
                                <div className="grid gap-2">
                                    <Label>
                                        Select Related Modules (MAX {MAX_RELATED_MODULES})
                                    </Label>
                                    <MultiSelect
                                        options={PRIMARY_MODULE_OPTIONS}
                                        value={step1Form.related_modules}
                                        onChange={handleRelatedModulesChange}
                                        placeholder="Select Related Modules"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="description">Description</Label>
                                    <textarea
                                        id="description"
                                        value={step1Form.description}
                                        onChange={(e) =>
                                            setStep1Form((prev) => ({
                                                ...prev,
                                                description: e.target.value,
                                            }))
                                        }
                                        placeholder="Optional description"
                                        rows={3}
                                        className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 resize-y min-h-[80px]"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Share Report</Label>
                                    <MultiSelect
                                        options={[{ value: 'all', label: 'All Users' }]}
                                        value={step1Form.share_report}
                                        onChange={(value) =>
                                            setStep1Form((prev) => ({ ...prev, share_report: value }))
                                        }
                                        placeholder="Select users or groups"
                                        searchable={false}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setCreateReportOpen(false)}>
                                    Cancel
                                </Button>
                                <Button
                                    className="bg-emerald-600 hover:bg-emerald-700"
                                    onClick={handleStep1Next}
                                >
                                    Next
                                </Button>
                            </DialogFooter>
                        </>
                    )}

                    {createStep === 2 && createReportType === 'pivot' && (
                        <>
                            <div className="grid gap-4 py-4">
                                <p className="text-sm text-muted-foreground">
                                    Select fields for the pivot table. X-axis = rows, Y-axis = columns,
                                    Values = count aggregation.
                                </p>
                                <div className="grid gap-2">
                                    <Label>
                                        MODULE <span className="text-destructive">*</span>
                                    </Label>
                                    <Select
                                        value={step2PivotForm.module}
                                        onValueChange={(value) =>
                                            setStep2PivotForm((prev) => ({
                                                ...prev,
                                                module: value,
                                                x_axis: '',
                                                y_axis: '',
                                                values_count_field: '',
                                            }))
                                        }
                                    >
                                        <SelectTrigger
                                            className={step2PivotErrors.module ? 'border-destructive' : ''}
                                        >
                                            <SelectValue placeholder="Select module" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {PRIMARY_MODULE_OPTIONS.map((opt) => (
                                                <SelectItem key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {step2PivotErrors.module && (
                                        <p className="text-sm text-destructive">
                                            {step2PivotErrors.module}
                                        </p>
                                    )}
                                </div>
                                <div className="grid gap-2">
                                    <Label>X-axis</Label>
                                    <Select
                                        value={step2PivotForm.x_axis}
                                        onValueChange={(value) =>
                                            setStep2PivotForm((prev) => ({ ...prev, x_axis: value }))
                                        }
                                    >
                                        <SelectTrigger
                                            className={step2PivotErrors.x_axis ? 'border-destructive' : ''}
                                        >
                                            <SelectValue placeholder="Select field" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {pivotModuleFields.map((f) => (
                                                <SelectItem key={f.value} value={f.value}>
                                                    {f.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {step2PivotErrors.x_axis && (
                                        <p className="text-sm text-destructive">
                                            {step2PivotErrors.x_axis}
                                        </p>
                                    )}
                                </div>
                                <div className="grid gap-2">
                                    <Label>Y-axis</Label>
                                    <Select
                                        value={step2PivotForm.y_axis}
                                        onValueChange={(value) =>
                                            setStep2PivotForm((prev) => ({ ...prev, y_axis: value }))
                                        }
                                    >
                                        <SelectTrigger
                                            className={step2PivotErrors.y_axis ? 'border-destructive' : ''}
                                        >
                                            <SelectValue placeholder="Select field" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {pivotModuleFields.map((f) => (
                                                <SelectItem key={f.value} value={f.value}>
                                                    {f.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {step2PivotErrors.y_axis && (
                                        <p className="text-sm text-destructive">
                                            {step2PivotErrors.y_axis}
                                        </p>
                                    )}
                                </div>
                                <div className="grid gap-2">
                                    <Label>VALUES (COUNT)</Label>
                                    <Select
                                        value={step2PivotForm.values_count_field}
                                        onValueChange={(value) =>
                                            setStep2PivotForm((prev) => ({
                                                ...prev,
                                                values_count_field: value,
                                            }))
                                        }
                                    >
                                        <SelectTrigger
                                            className={
                                                step2PivotErrors.values_count_field
                                                    ? 'border-destructive'
                                                    : ''
                                            }
                                        >
                                            <SelectValue placeholder="Count of" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {pivotValuesOptions.map((f) => (
                                                <SelectItem key={f.value} value={f.value}>
                                                    {f.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {step2PivotErrors.values_count_field && (
                                        <p className="text-sm text-destructive">
                                            {step2PivotErrors.values_count_field}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={handleStep2Back}>
                                    Back
                                </Button>
                                <Button
                                    className="bg-emerald-600 hover:bg-emerald-700"
                                    onClick={handleStep2PivotSubmit}
                                >
                                    Save
                                </Button>
                            </DialogFooter>
                        </>
                    )}

                    {createStep === 2 && createReportType === 'charts' && (
                        <>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label>Select chart type</Label>
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setStep2ChartsForm((prev) => ({
                                                    ...prev,
                                                    chart_type: 'vertical',
                                                }))
                                            }
                                            className={cn(
                                                'flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors',
                                                step2ChartsForm.chart_type === 'vertical'
                                                    ? 'border-emerald-500 bg-emerald-500/10'
                                                    : 'border-border hover:border-muted-foreground/50'
                                            )}
                                        >
                                            <BarChart2 className="h-8 w-8 text-muted-foreground" />
                                            <span className="text-sm font-medium">
                                                Vertical Bar Chart
                                            </span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setStep2ChartsForm((prev) => ({
                                                    ...prev,
                                                    chart_type: 'horizontal',
                                                }))
                                            }
                                            className={cn(
                                                'flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors',
                                                step2ChartsForm.chart_type === 'horizontal'
                                                    ? 'border-emerald-500 bg-emerald-500/10'
                                                    : 'border-border hover:border-muted-foreground/50'
                                            )}
                                        >
                                            <BarChart2 className="h-8 w-8 rotate-90 text-muted-foreground" />
                                            <span className="text-sm font-medium">
                                                Horizontal Bar Chart
                                            </span>
                                        </button>
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label>X-axis</Label>
                                    <Select
                                        value={step2ChartsForm.x_axis}
                                        onValueChange={(value) =>
                                            setStep2ChartsForm((prev) => ({ ...prev, x_axis: value }))
                                        }
                                    >
                                        <SelectTrigger
                                            className={step2ChartsErrors.x_axis ? 'border-destructive' : ''}
                                        >
                                            <SelectValue placeholder="Select field" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {chartsModuleFields.map((f) => (
                                                <SelectItem key={f.value} value={f.value}>
                                                    {f.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {step2ChartsErrors.x_axis && (
                                        <p className="text-sm text-destructive">
                                            {step2ChartsErrors.x_axis}
                                        </p>
                                    )}
                                </div>
                                <div className="grid gap-2">
                                    <Label>Y-axis (Count of)</Label>
                                    <Select
                                        value={step2ChartsForm.y_axis}
                                        onValueChange={(value) =>
                                            setStep2ChartsForm((prev) => ({ ...prev, y_axis: value }))
                                        }
                                    >
                                        <SelectTrigger
                                            className={step2ChartsErrors.y_axis ? 'border-destructive' : ''}
                                        >
                                            <SelectValue placeholder="Count of" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {chartsYAxisOptions.map((f) => (
                                                <SelectItem key={f.value} value={f.value}>
                                                    {f.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {step2ChartsErrors.y_axis && (
                                        <p className="text-sm text-destructive">
                                            {step2ChartsErrors.y_axis}
                                        </p>
                                    )}
                                </div>
                                <div className="grid gap-2">
                                    <Label>Legend</Label>
                                    <Select
                                        value={step2ChartsForm.legend}
                                        onValueChange={(value) =>
                                            setStep2ChartsForm((prev) => ({ ...prev, legend: value }))
                                        }
                                    >
                                        <SelectTrigger
                                            className={step2ChartsErrors.legend ? 'border-destructive' : ''}
                                        >
                                            <SelectValue placeholder="Select field" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {chartsModuleFields.map((f) => (
                                                <SelectItem key={f.value} value={f.value}>
                                                    {f.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {step2ChartsErrors.legend && (
                                        <p className="text-sm text-destructive">
                                            {step2ChartsErrors.legend}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={handleStep2Back}>
                                    Back
                                </Button>
                                <Button
                                    className="bg-emerald-600 hover:bg-emerald-700"
                                    onClick={handleStep2ChartsSubmit}
                                >
                                    Save
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Add Folder dialog */}
            <Dialog open={addFolderOpen} onOpenChange={setAddFolderOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Add Folder</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddFolder} className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="new_folder_name">Folder Name</Label>
                            <Input
                                id="new_folder_name"
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                placeholder="e.g. Sales Dashboard"
                            />
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setAddFolderOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="bg-emerald-600 hover:bg-emerald-700"
                                disabled={!newFolderName.trim() || addFolderSubmitting}
                            >
                                {addFolderSubmitting ? 'Creating...' : 'Create Folder'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
