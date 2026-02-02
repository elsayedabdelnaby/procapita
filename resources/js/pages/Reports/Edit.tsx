import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import { BarChart2, BarChart3 } from 'lucide-react';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const PRIMARY_MODULE_OPTIONS = [
    { value: 'leads', label: 'Leads' },
    { value: 'follow_ups', label: 'Follow-ups' },
];
const MAX_RELATED_MODULES = 2;

const MODULE_FIELDS: Record<string, { value: string; label: string }[]> = {
    leads: [
        { value: 'full_name', label: 'Full Name' },
        { value: 'campaign', label: 'Campaign' },
        { value: 'lead_source', label: 'Lead Source' },
        { value: 'assigned_to', label: 'Assigned To (Sales Person)' },
        { value: 'team_leader', label: 'Team Leader' },
        { value: 'account_manager', label: 'Account Manager' },
        { value: 'lead_status', label: 'Lead Status' },
        { value: 'lead_stage', label: 'Lead Stage' },
        { value: 'riding_company', label: 'Reseller' },
        { value: 'city', label: 'City' },
        { value: 'governorate', label: 'Governorate' },
    ],
    follow_ups: [
        { value: 'assigned_to', label: 'Assigned To (Sales Person)' },
        { value: 'user_name', label: 'User Name' },
        { value: 'team_leader', label: 'Team Leader' },
        { value: 'account_manager', label: 'Account Manager' },
        { value: 'riding_company', label: 'Reseller' },
        { value: 'lead_stage', label: 'Lead Stage' },
        { value: 'lead_status', label: 'Lead Status' },
        { value: 'created_time', label: 'Created Time' },
    ],
};

interface FolderOption {
    id: string;
    name: string;
}

interface ReportEditProps {
    report: {
        id: number;
        report_name: string;
        report_folder_id: string;
        primary_module: string;
        related_modules: string[];
        description: string;
        share_report: (string | number)[];
        report_type: string;
        settings: Record<string, unknown>;
    };
    folders: FolderOption[];
}

export default function ReportEdit({ report, folders }: ReportEditProps) {
    const [step, setStep] = useState<1 | 2>(1);

    const [reportName, setReportName] = useState(report.report_name);
    const [reportFolderId, setReportFolderId] = useState(report.report_folder_id);
    const [primaryModule, setPrimaryModule] = useState(report.primary_module);
    const [relatedModules, setRelatedModules] = useState<string[]>(
        Array.isArray(report.related_modules) ? report.related_modules : []
    );
    const [description, setDescription] = useState(report.description);
    const [shareReport, setShareReport] = useState<(string | number)[]>(
        Array.isArray(report.share_report) ? report.share_report : ['all']
    );

    const s = report.settings ?? {};
    const [step2Pivot, setStep2Pivot] = useState({
        module: (s.module as string) ?? report.primary_module,
        x_axis: (s.x_axis as string) ?? '',
        y_axis: (s.y_axis as string) ?? '',
        values_count_field: (s.values_count_field as string) ?? '',
    });
    const [step2Charts, setStep2Charts] = useState({
        chart_type: (s.chart_type as string) ?? 'vertical',
        x_axis: (s.x_axis as string) ?? '',
        y_axis: (s.y_axis as string) ?? '',
        legend: (s.legend as string) ?? '',
    });

    const [step1Errors, setStep1Errors] = useState<Record<string, string>>({});
    const [step2PivotErrors, setStep2PivotErrors] = useState<Record<string, string>>({});
    const [step2ChartsErrors, setStep2ChartsErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);

    const handleRelatedModulesChange = (value: (string | number)[]) => {
        setRelatedModules(value.map(String).slice(0, MAX_RELATED_MODULES));
    };

    const handleStep1Next = () => {
        const err: Record<string, string> = {};
        if (!reportName.trim()) err.report_name = 'Report Name is required';
        if (!reportFolderId) err.report_folder_id = 'Report Folder is required';
        if (!primaryModule) err.primary_module = 'Primary Module is required';
        setStep1Errors(err);
        if (Object.keys(err).length > 0) return;
        setStep2Pivot((prev) => ({ ...prev, module: primaryModule }));
        setStep(2);
    };

    const handleStep2Back = () => {
        setStep(1);
    };

    const handleSave = () => {
        if (report.report_type === 'pivot') {
            const err: Record<string, string> = {};
            if (!step2Pivot.module) err.module = 'Module is required';
            if (!step2Pivot.x_axis) err.x_axis = 'X-axis is required';
            if (!step2Pivot.y_axis) err.y_axis = 'Y-axis is required';
            if (!step2Pivot.values_count_field) err.values_count_field = 'Values (Count) is required';
            setStep2PivotErrors(err);
            if (Object.keys(err).length > 0) return;
        } else {
            const err: Record<string, string> = {};
            if (!step2Charts.x_axis) err.x_axis = 'X-axis is required';
            if (!step2Charts.y_axis) err.y_axis = 'Y-axis is required';
            if (!step2Charts.legend) err.legend = 'Legend is required';
            setStep2ChartsErrors(err);
            if (Object.keys(err).length > 0) return;
        }

        setSaving(true);
        const settings =
            report.report_type === 'pivot'
                ? {
                      module: step2Pivot.module,
                      x_axis: step2Pivot.x_axis,
                      y_axis: step2Pivot.y_axis,
                      values_count_field: step2Pivot.values_count_field,
                  }
                : {
                      chart_type: step2Charts.chart_type,
                      x_axis: step2Charts.x_axis,
                      y_axis: step2Charts.y_axis,
                      legend: step2Charts.legend,
                  };

        const payload: Record<string, unknown> = {
            report_name: reportName,
            primary_module: primaryModule,
            related_modules: relatedModules,
            description: description || null,
            share_report: shareReport,
            settings,
        };
        if (reportFolderId && folders.some((f) => f.id === reportFolderId)) {
            payload.report_folder_id = Number(reportFolderId);
        }

        router.put(`/reports/${report.id}`, payload, {
            onFinish: () => setSaving(false),
        });
    };

    const pivotModuleFields = step2Pivot.module ? MODULE_FIELDS[step2Pivot.module] ?? [] : [];
    const chartsModuleFields = primaryModule ? MODULE_FIELDS[primaryModule] ?? [] : [];
    const chartsYAxisOptions = chartsModuleFields;

    return (
        <AppLayout breadcrumbs={[]}>
            <Head title={`Edit Report - ${report.report_name}`} />
            <div className="h-1 shrink-0 bg-orange-500" />
            <div className="flex flex-1 flex-col min-h-0 p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500/15 text-orange-600 dark:text-orange-400">
                        <BarChart3 className="h-5 w-5" />
                    </div>
                    <nav className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Link href="/reports" className="hover:text-foreground">
                            Reports
                        </Link>
                        <span>/</span>
                        <span className="text-foreground font-medium">
                            Edit: {report.report_name} — Step {step}
                        </span>
                    </nav>
                </div>

                <div className="max-w-md space-y-4">
                    {step === 1 && (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="report_name">
                                    Report Name <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="report_name"
                                    value={reportName}
                                    onChange={(e) => setReportName(e.target.value)}
                                    placeholder="e.g. Overdue at all"
                                    className={step1Errors.report_name ? 'border-destructive' : ''}
                                />
                                {step1Errors.report_name && (
                                    <p className="text-sm text-destructive">{step1Errors.report_name}</p>
                                )}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="report_folder">
                                    Report Folder <span className="text-destructive">*</span>
                                </Label>
                                <Select value={reportFolderId} onValueChange={setReportFolderId}>
                                    <SelectTrigger
                                        id="report_folder"
                                        className={step1Errors.report_folder_id ? 'border-destructive' : ''}
                                    >
                                        <SelectValue placeholder="Select folder" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {folders.map((folder) => (
                                            <SelectItem key={folder.id} value={folder.id}>
                                                {folder.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {step1Errors.report_folder_id && (
                                    <p className="text-sm text-destructive">{step1Errors.report_folder_id}</p>
                                )}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="primary_module">
                                    Primary Module <span className="text-destructive">*</span>
                                </Label>
                                <Select value={primaryModule} onValueChange={setPrimaryModule}>
                                    <SelectTrigger
                                        id="primary_module"
                                        className={step1Errors.primary_module ? 'border-destructive' : ''}
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
                                    <p className="text-sm text-destructive">{step1Errors.primary_module}</p>
                                )}
                            </div>
                            <div className="grid gap-2">
                                <Label>Select Related Modules (MAX {MAX_RELATED_MODULES})</Label>
                                <MultiSelect
                                    options={PRIMARY_MODULE_OPTIONS}
                                    value={relatedModules}
                                    onChange={handleRelatedModulesChange}
                                    placeholder="Select Related Modules"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="description">Description</Label>
                                <textarea
                                    id="description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Optional description"
                                    rows={3}
                                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 resize-y min-h-[80px]"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Share Report</Label>
                                <MultiSelect
                                    options={[{ value: 'all', label: 'All Users' }]}
                                    value={shareReport}
                                    onChange={setShareReport}
                                    placeholder="Select users or groups"
                                    searchable={false}
                                />
                            </div>
                            <div className="flex gap-2 justify-end">
                                <Link href="/reports">
                                    <Button type="button" variant="outline">
                                        Cancel
                                    </Button>
                                </Link>
                                <Button
                                    type="button"
                                    className="bg-emerald-600 hover:bg-emerald-700"
                                    onClick={handleStep1Next}
                                    disabled={!reportName.trim()}
                                >
                                    Next
                                </Button>
                            </div>
                        </>
                    )}

                    {step === 2 && report.report_type === 'pivot' && (
                        <>
                            <p className="text-sm text-muted-foreground">
                                Select fields for the pivot table. X-axis = rows, Y-axis = columns, Values =
                                count aggregation.
                            </p>
                            <div className="grid gap-2">
                                <Label>MODULE <span className="text-destructive">*</span></Label>
                                <Select
                                    value={step2Pivot.module}
                                    onValueChange={(value) =>
                                        setStep2Pivot((prev) => ({
                                            ...prev,
                                            module: value,
                                            x_axis: '',
                                            y_axis: '',
                                            values_count_field: '',
                                        }))
                                    }
                                >
                                    <SelectTrigger className={step2PivotErrors.module ? 'border-destructive' : ''}>
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
                                    <p className="text-sm text-destructive">{step2PivotErrors.module}</p>
                                )}
                            </div>
                            <div className="grid gap-2">
                                <Label>X-axis</Label>
                                <Select
                                    value={step2Pivot.x_axis}
                                    onValueChange={(value) =>
                                        setStep2Pivot((prev) => ({ ...prev, x_axis: value }))
                                    }
                                >
                                    <SelectTrigger className={step2PivotErrors.x_axis ? 'border-destructive' : ''}>
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
                                    <p className="text-sm text-destructive">{step2PivotErrors.x_axis}</p>
                                )}
                            </div>
                            <div className="grid gap-2">
                                <Label>Y-axis</Label>
                                <Select
                                    value={step2Pivot.y_axis}
                                    onValueChange={(value) =>
                                        setStep2Pivot((prev) => ({ ...prev, y_axis: value }))
                                    }
                                >
                                    <SelectTrigger className={step2PivotErrors.y_axis ? 'border-destructive' : ''}>
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
                                    <p className="text-sm text-destructive">{step2PivotErrors.y_axis}</p>
                                )}
                            </div>
                            <div className="grid gap-2">
                                <Label>VALUES (COUNT)</Label>
                                <Select
                                    value={step2Pivot.values_count_field}
                                    onValueChange={(value) =>
                                        setStep2Pivot((prev) => ({ ...prev, values_count_field: value }))
                                    }
                                >
                                    <SelectTrigger
                                        className={
                                            step2PivotErrors.values_count_field ? 'border-destructive' : ''
                                        }
                                    >
                                        <SelectValue placeholder="Count of" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {pivotModuleFields.map((f) => (
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
                            <div className="flex gap-2 justify-end">
                                <Button type="button" variant="outline" onClick={handleStep2Back}>
                                    Back
                                </Button>
                                <Button
                                    type="button"
                                    className="bg-emerald-600 hover:bg-emerald-700"
                                    onClick={handleSave}
                                    disabled={saving}
                                >
                                    {saving ? 'Saving...' : 'Save'}
                                </Button>
                            </div>
                        </>
                    )}

                    {step === 2 && report.report_type === 'charts' && (
                        <>
                            <div className="grid gap-2">
                                <Label>Select chart type</Label>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setStep2Charts((prev) => ({ ...prev, chart_type: 'vertical' }))
                                        }
                                        className={cn(
                                            'flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors',
                                            step2Charts.chart_type === 'vertical'
                                                ? 'border-emerald-500 bg-emerald-500/10'
                                                : 'border-border hover:border-muted-foreground/50'
                                        )}
                                    >
                                        <BarChart2 className="h-8 w-8 text-muted-foreground" />
                                        <span className="text-sm font-medium">Vertical Bar Chart</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setStep2Charts((prev) => ({ ...prev, chart_type: 'horizontal' }))
                                        }
                                        className={cn(
                                            'flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors',
                                            step2Charts.chart_type === 'horizontal'
                                                ? 'border-emerald-500 bg-emerald-500/10'
                                                : 'border-border hover:border-muted-foreground/50'
                                        )}
                                    >
                                        <BarChart2 className="h-8 w-8 rotate-90 text-muted-foreground" />
                                        <span className="text-sm font-medium">Horizontal Bar Chart</span>
                                    </button>
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label>X-axis</Label>
                                <Select
                                    value={step2Charts.x_axis}
                                    onValueChange={(value) =>
                                        setStep2Charts((prev) => ({ ...prev, x_axis: value }))
                                    }
                                >
                                    <SelectTrigger className={step2ChartsErrors.x_axis ? 'border-destructive' : ''}>
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
                                    <p className="text-sm text-destructive">{step2ChartsErrors.x_axis}</p>
                                )}
                            </div>
                            <div className="grid gap-2">
                                <Label>Y-axis (Count of)</Label>
                                <Select
                                    value={step2Charts.y_axis}
                                    onValueChange={(value) =>
                                        setStep2Charts((prev) => ({ ...prev, y_axis: value }))
                                    }
                                >
                                    <SelectTrigger className={step2ChartsErrors.y_axis ? 'border-destructive' : ''}>
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
                                    <p className="text-sm text-destructive">{step2ChartsErrors.y_axis}</p>
                                )}
                            </div>
                            <div className="grid gap-2">
                                <Label>Legend</Label>
                                <Select
                                    value={step2Charts.legend}
                                    onValueChange={(value) =>
                                        setStep2Charts((prev) => ({ ...prev, legend: value }))
                                    }
                                >
                                    <SelectTrigger className={step2ChartsErrors.legend ? 'border-destructive' : ''}>
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
                                    <p className="text-sm text-destructive">{step2ChartsErrors.legend}</p>
                                )}
                            </div>
                            <div className="flex gap-2 justify-end">
                                <Button type="button" variant="outline" onClick={handleStep2Back}>
                                    Back
                                </Button>
                                <Button
                                    type="button"
                                    className="bg-emerald-600 hover:bg-emerald-700"
                                    onClick={handleSave}
                                    disabled={saving}
                                >
                                    {saving ? 'Saving...' : 'Save'}
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
