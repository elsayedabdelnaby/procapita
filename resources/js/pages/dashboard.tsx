import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { useState, useCallback, useEffect, useRef } from 'react';
import { ReportWidgetContent, type ReportData, type ReportSortMode } from '@/components/report-widget-content';
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ArrowDown, ArrowDownAZ, ArrowUp, Eye, GripVertical, MoreVertical, Pin, Settings } from 'lucide-react';

const REPORT_BG = '#F9F9F9';
const REPORT_BORDER = '#DDDDDD';
const REPORT_TEXT = '#333333';
const REPORT_LABEL = '#555555';
const MATRIX_COLOR_DARK = '#2E7EDD';

type Widget = {
    id: number;
    report_id: number;
    /** Width/height are persisted per user on the server; we use them so each user's frame size is remembered. */
    width: number;
    height: number;
    report: {
        id: number;
        report_type: string;
        report_name: string;
        primary_module: string;
        folder_name: string;
        settings: Record<string, unknown>;
    };
    filters: { created_from?: string; created_to?: string; assigned_to?: string };
    data: ReportData;
    sort_order: number;
    /** Persisted sort mode for pivot/chart (label_asc, label_desc, value_asc, value_desc). */
    sort_mode?: ReportSortMode | null;
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
];

function fieldKeyToLabel(key: string): string {
    if (!key || typeof key !== 'string') return '';
    if (key === 'riding_company') return 'Reseller';
    return key
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
}

function reportAxisSubtitle(settings: Record<string, unknown>): string {
    const x = settings?.x_axis as string | undefined;
    const y = settings?.y_axis as string | undefined;
    const xLabel = x ? fieldKeyToLabel(x) : '';
    const yLabel = y ? fieldKeyToLabel(y) : '';
    if (!xLabel && !yLabel) return '';
    if (xLabel && yLabel) return ` Values ( ${xLabel} By ${yLabel} )`;
    if (xLabel) return ` Values ( ${xLabel} )`;
    return ` Values ( ${yLabel} )`;
}

export default function Dashboard({ widgets: initialWidgets = [] }: { widgets: Widget[] }) {
    const [widgets, setWidgets] = useState<Widget[]>(initialWidgets);
    useEffect(() => setWidgets(initialWidgets), [initialWidgets]);
    const [filterVisible, setFilterVisible] = useState<Record<number, boolean>>({});
    const [filterValues, setFilterValues] = useState<Record<number, { created_from: string; created_to: string; assigned_to: string }>>({});
    const [draggedId, setDraggedId] = useState<number | null>(null);
    const [dragOverId, setDragOverId] = useState<number | null>(null);
    const [resizing, setResizing] = useState<{ widgetId: number; startX: number; startY: number; startW: number; startH: number } | null>(null);
    const [sizes, setSizes] = useState<Record<number, { w: number; h: number }>>({});
    const [widgetSort, setWidgetSort] = useState<Record<number, ReportSortMode | null>>(() => {
        const r: Record<number, ReportSortMode | null> = {};
        initialWidgets.forEach((w) => {
            r[w.id] = w.sort_mode ?? null;
        });
        return r;
    });
    const resizeRef = useRef<{ widgetId: number; startX: number; startY: number; startW: number; startH: number; currentW: number; currentH: number } | null>(null);

    useEffect(() => {
        const r: Record<number, ReportSortMode | null> = {};
        initialWidgets.forEach((w) => {
            r[w.id] = w.sort_mode ?? null;
        });
        setWidgetSort((prev) => {
            const next = { ...r };
            Object.keys(prev).forEach((id) => {
                const n = Number(id);
                if (next[n] === undefined) next[n] = prev[n];
            });
            return next;
        });
    }, [initialWidgets]);

    const toggleFilter = (widgetId: number) => {
        setFilterVisible((prev) => ({ ...prev, [widgetId]: !prev[widgetId] }));
        const w = widgets.find((x) => x.id === widgetId);
        if (w && !filterValues[widgetId]) {
            setFilterValues((prev) => ({
                ...prev,
                [widgetId]: {
                    created_from: w.filters?.created_from ?? '',
                    created_to: w.filters?.created_to ?? '',
                    assigned_to: w.filters?.assigned_to ?? 'all',
                },
            }));
        }
    };

    const applyFilter = (widgetId: number) => {
        const f = filterValues[widgetId];
        if (!f) return;
        const w = widgets.find((x) => x.id === widgetId);
        if (!w) return;
        router.put('/dashboard/widgets', {
            widgets: widgets.map((x) =>
                x.id === widgetId
                    ? { id: x.id, filters: { created_from: f.created_from || undefined, created_to: f.created_to || undefined, assigned_to: f.assigned_to } }
                    : { id: x.id }
            ),
        });
    };

    const unpin = (reportId: number) => {
        router.delete(`/dashboard/widgets/${reportId}`);
    };

    const updateOrder = useCallback(
        (ordered: Widget[]) => {
            router.put('/dashboard/widgets', {
                widgets: ordered.map((w, i) => ({ id: w.id, sort_order: i })),
            });
        },
        [widgets]
    );

    const handleDragStart = (e: React.DragEvent, widgetId: number) => {
        setDraggedId(widgetId);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(widgetId));
    };
    const handleDragOver = (e: React.DragEvent, widgetId: number) => {
        e.preventDefault();
        if (draggedId !== widgetId) setDragOverId(widgetId);
    };
    const handleDragLeave = () => setDragOverId(null);
    const handleDrop = (e: React.DragEvent, targetId: number) => {
        e.preventDefault();
        setDragOverId(null);
        setDraggedId(null);
        if (draggedId == null || draggedId === targetId) return;
        const fromIndex = widgets.findIndex((w) => w.id === draggedId);
        const toIndex = widgets.findIndex((w) => w.id === targetId);
        if (fromIndex === -1 || toIndex === -1) return;
        const next = [...widgets];
        const [removed] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, removed);
        setWidgets(next);
        updateOrder(next);
    };
    const handleDragEnd = () => {
        setDraggedId(null);
        setDragOverId(null);
    };

    const handleResizeStart = (e: React.MouseEvent, widgetId: number) => {
        e.preventDefault();
        const w = widgets.find((x) => x.id === widgetId);
        if (!w) return;
        const currentW = sizes[widgetId]?.w ?? w.width;
        const currentH = sizes[widgetId]?.h ?? w.height;
        setResizing({ widgetId, startX: e.clientX, startY: e.clientY, startW: currentW, startH: currentH });
        resizeRef.current = { widgetId, startX: e.clientX, startY: e.clientY, startW: currentW, startH: currentH, currentW, currentH };
    };
    const handleResizeMove = useCallback((e: MouseEvent) => {
        if (!resizeRef.current) return;
        const r = resizeRef.current;
        const newW = Math.max(200, r.startW + (e.clientX - r.startX));
        const newH = Math.max(200, r.startH + (e.clientY - r.startY));
        resizeRef.current = { ...r, currentW: newW, currentH: newH };
        setSizes((prev) => ({ ...prev, [r.widgetId]: { w: newW, h: newH } }));
    }, []);
    const handleResizeEnd = useCallback(() => {
        const r = resizeRef.current;
        if (!r) return;
        router.put('/dashboard/widgets', {
            widgets: [{ id: r.widgetId, width: r.currentW, height: r.currentH }],
        });
        resizeRef.current = null;
        setResizing(null);
    }, []);

    useEffect(() => {
        if (!resizing) return;
        window.addEventListener('mousemove', handleResizeMove);
        window.addEventListener('mouseup', handleResizeEnd);
        return () => {
            window.removeEventListener('mousemove', handleResizeMove);
            window.removeEventListener('mouseup', handleResizeEnd);
        };
    }, [resizing, handleResizeMove, handleResizeEnd]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="p-6">
                <div className="mb-4 flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Dashboard</h1>
                    <Link href="/reports">
                        <Button variant="outline">Add report to dashboard</Button>
                    </Link>
                </div>

                {widgets.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-12 text-center" style={{ borderColor: REPORT_BORDER, color: REPORT_LABEL }}>
                        <p className="mb-2">No reports pinned yet.</p>
                        <Link href="/reports">
                            <Button style={{ background: MATRIX_COLOR_DARK }} className="text-white">Go to Reports & pin one</Button>
                        </Link>
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-6 p-5 content-start">
                        {widgets.map((widget) => {
                            const w = sizes[widget.id]?.w ?? widget.width;
                            const h = sizes[widget.id]?.h ?? widget.height;
                            const filters = filterValues[widget.id] ?? {
                                created_from: widget.filters?.created_from ?? '',
                                created_to: widget.filters?.created_to ?? '',
                                assigned_to: widget.filters?.assigned_to ?? 'all',
                            };
                            const showFilter = filterVisible[widget.id] ?? false;
                            return (
                                <div
                                    key={widget.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, widget.id)}
                                    onDragOver={(e) => handleDragOver(e, widget.id)}
                                    onDragLeave={handleDragLeave}
                                    onDrop={(e) => handleDrop(e, widget.id)}
                                    onDragEnd={handleDragEnd}
                                    className={`shrink-0 rounded-lg border flex flex-col overflow-hidden transition-shadow box-border ${draggedId === widget.id ? 'opacity-50' : ''} ${dragOverId === widget.id ? 'ring-2 ring-offset-2' : ''}`}
                                    style={{
                                        width: w,
                                        height: h,
                                        background: REPORT_BG,
                                        borderColor: REPORT_BORDER,
                                        boxShadow: dragOverId === widget.id ? `0 0 0 2px ${MATRIX_COLOR_DARK}` : undefined,
                                    }}
                                >
                                    <div className="flex shrink-0 items-center gap-1 border-b px-2 py-1.5" style={{ borderColor: REPORT_BORDER }}>
                                        <button type="button" className="cursor-grab touch-none text-muted-foreground hover:text-foreground" aria-label="Drag to reorder">
                                            <GripVertical className="h-4 w-4" />
                                        </button>
                                        <span className="min-w-0 flex-1 truncate text-sm font-semibold" style={{ color: REPORT_TEXT }} title={widget.report.report_name + reportAxisSubtitle(widget.report.settings ?? {})}>
                                            {widget.report.report_name}
                                            {reportAxisSubtitle(widget.report.settings ?? {}) && (
                                                <span className="font-normal text-muted-foreground">
                                                    {reportAxisSubtitle(widget.report.settings ?? {})}
                                                </span>
                                            )}
                                        </span>
                                        <Link href={`/reports/${widget.report_id}`} className="rounded p-1 text-muted-foreground hover:bg-black/10" title="View report">
                                            <Eye className="h-4 w-4" />
                                        </Link>
                                        {widget.report.report_type === 'charts' && (
                                            <>
                                                <button type="button" className="rounded p-1 text-muted-foreground hover:bg-black/10" title="Sort A–Z (by label)" onClick={(e) => { e.stopPropagation(); e.preventDefault(); const next = widgetSort[widget.id] === 'label_asc' ? null : 'label_asc'; setWidgetSort((prev) => ({ ...prev, [widget.id]: next })); router.put('/dashboard/widgets', { widgets: [{ id: widget.id, sort_mode: next }] }); }}>
                                                    <ArrowDownAZ className="h-4 w-4" />
                                                </button>
                                                <button type="button" className="rounded p-1 text-muted-foreground hover:bg-black/10" title={widgetSort[widget.id] === 'value_desc' ? 'Sort ascending (by value)' : 'Sort descending (by value)'} onClick={(e) => { e.stopPropagation(); e.preventDefault(); const next = widgetSort[widget.id] === 'value_desc' ? 'value_asc' : 'value_desc'; setWidgetSort((prev) => ({ ...prev, [widget.id]: next })); router.put('/dashboard/widgets', { widgets: [{ id: widget.id, sort_mode: next }] }); }}>
                                                    {widgetSort[widget.id] === 'value_desc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                                                </button>
                                            </>
                                        )}
                                        <button type="button" onClick={() => unpin(widget.report_id)} className="rounded p-1 text-muted-foreground hover:bg-black/10" title="Unpin from dashboard">
                                            <Pin className="h-4 w-4" />
                                        </button>
                                        <button type="button" onClick={() => toggleFilter(widget.id)} className={`rounded p-1 ${showFilter ? 'bg-black/10' : ''} text-muted-foreground hover:bg-black/10`} title="Filter">
                                            <Settings className="h-4 w-4" />
                                        </button>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button type="button" className="rounded p-1 text-muted-foreground hover:bg-black/10">
                                                    <MoreVertical className="h-4 w-4" />
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/reports/${widget.report_id}`}>View</Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/reports/${widget.report_id}/edit`}>Edit</Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => unpin(widget.report_id)}>Unpin</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    {showFilter && (
                                        <div className="shrink-0 border-b px-3 py-3 flex flex-col gap-3" style={{ borderColor: REPORT_BORDER, background: REPORT_BG }}>
                                            <div className="grid gap-1">
                                                <Label className="text-xs font-medium" style={{ color: REPORT_TEXT }}>Created Time between</Label>
                                                <div className="flex items-center gap-2">
                                                    <Input type="date" value={filters.created_from} onChange={(e) => setFilterValues((prev) => ({ ...prev, [widget.id]: { ...prev[widget.id]!, created_from: e.target.value } }))} className="max-w-[140px] text-xs" style={{ borderColor: REPORT_BORDER }} />
                                                    <span className="text-xs" style={{ color: REPORT_LABEL }}>to</span>
                                                    <Input type="date" value={filters.created_to} onChange={(e) => setFilterValues((prev) => ({ ...prev, [widget.id]: { ...prev[widget.id]!, created_to: e.target.value } }))} className="max-w-[140px] text-xs" style={{ borderColor: REPORT_BORDER }} />
                                                </div>
                                            </div>
                                            <div className="grid gap-1">
                                                <Label className="text-xs font-medium" style={{ color: REPORT_TEXT }}>Assigned To</Label>
                                                <Select value={filters.assigned_to} onValueChange={(v) => setFilterValues((prev) => ({ ...prev, [widget.id]: { ...prev[widget.id]!, assigned_to: v } }))}>
                                                    <SelectTrigger className="max-w-[180px] text-xs" style={{ borderColor: REPORT_BORDER }}>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">All</SelectItem>
                                                        <SelectItem value="me">Current User</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <Button size="sm" onClick={() => applyFilter(widget.id)} className="w-fit text-xs" style={{ background: MATRIX_COLOR_DARK }}>Apply filters</Button>
                                        </div>
                                    )}

                                    <div className="flex-1 min-h-0 overflow-auto">
                                        <ReportWidgetContent data={widget.data} reportSort={widgetSort[widget.id] ?? undefined} />
                                    </div>

                                    <div
                                        onMouseDown={(e) => handleResizeStart(e, widget.id)}
                                        className="h-3 shrink-0 cursor-se-resize border-t flex items-center justify-end pr-1" style={{ borderColor: REPORT_BORDER }}
                                        title="Drag to resize"
                                    >
                                        <span className="text-muted-foreground">⋰</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
