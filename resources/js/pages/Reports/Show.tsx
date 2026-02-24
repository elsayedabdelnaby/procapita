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
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowDown, ArrowDownAZ, ArrowUp, BarChart3, Table } from 'lucide-react';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import type { ReportSortMode } from '@/components/report-widget-content';

/** 30 light colors, ~30° hue spread; order avoids gradient (consecutive = very different hue) */
function hslToHex(h: number, s: number, l: number): string {
    s /= 100;
    l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
        const k = (n + h / 30) % 12;
        return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    };
    const r = Math.round(f(0) * 255);
    const g = Math.round(f(8) * 255);
    const b = Math.round(f(4) * 255);
    return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
}
const POWER_BI_PALETTE = (() => {
    const out: string[] = [];
    const goldenStep = 360 * 0.382;
    for (let i = 0; i < 30; i++) {
        const hue = (i * goldenStep) % 360;
        out.push(hslToHex(hue, 58, 72));
    }
    return out;
})();
const MATRIX_COLOR_LIGHT = '#DDEDFC';
const MATRIX_COLOR_DARK = '#2E7EDD';
const REPORT_BG = '#F9F9F9';
const REPORT_BORDER = '#DDDDDD';
const REPORT_BORDER_TOTAL = '#555555';
const REPORT_TEXT = '#333333';
const REPORT_LABEL = '#555555';
const TOTAL_LABEL = 'Total';
const TOTAL_BG = '#EEEEEE';

function lerpColor(light: string, dark: string, t: number): string {
    const parse = (hex: string) => {
        const n = parseInt(hex.slice(1), 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    };
    const [r1, g1, b1] = parse(light);
    const [r2, g2, b2] = parse(dark);
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    return `rgb(${r},${g},${b})`;
}

function getCellValue(row: string, col: string, columnLabels: string[], cells: Record<string, number>): number {
    if (col === TOTAL_LABEL) {
        return columnLabels
            .filter((c) => c !== TOTAL_LABEL)
            .reduce((sum, c) => sum + (cells[`${row}|${c}`] ?? 0), 0);
    }
    return cells[`${row}|${col}`] ?? 0;
}

function PivotTable({
    rowLabels,
    columnLabels,
    cells,
    emptyMessage,
    externalSort,
}: {
    rowLabels: string[];
    columnLabels: string[];
    cells: Record<string, number>;
    emptyMessage: string | null;
    externalSort?: ReportSortMode | null;
}) {
    const [sortColumn, setSortColumn] = useState<string | null>(null);
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

    const hasData = rowLabels.length > 0 || columnLabels.length > 0;
    if (!hasData) {
        return (
            <div className="flex min-h-[280px] items-center justify-center p-8" style={{ color: REPORT_LABEL }}>
                <p className="text-center">{emptyMessage ?? 'No data for the selected filters.'}</p>
            </div>
        );
    }

    const dataRows = rowLabels.filter((r) => r !== TOTAL_LABEL);
    const totalCol = columnLabels.includes(TOTAL_LABEL) ? TOTAL_LABEL : columnLabels[0];
    const sortedDataRows = (() => {
        if (externalSort === 'label_asc') return [...dataRows].sort((a, b) => a.localeCompare(b));
        if (externalSort === 'label_desc') return [...dataRows].sort((a, b) => b.localeCompare(a));
        if (externalSort === 'value_asc') return [...dataRows].sort((a, b) => getCellValue(a, totalCol, columnLabels, cells) - getCellValue(b, totalCol, columnLabels, cells));
        if (externalSort === 'value_desc') return [...dataRows].sort((a, b) => getCellValue(b, totalCol, columnLabels, cells) - getCellValue(a, totalCol, columnLabels, cells));
        if (sortColumn === null) return dataRows;
        return [...dataRows].sort((a, b) => {
            const va = getCellValue(a, sortColumn, columnLabels, cells);
            const vb = getCellValue(b, sortColumn, columnLabels, cells);
            if (va !== vb) return sortDir === 'asc' ? va - vb : vb - va;
            return a.localeCompare(b);
        });
    })();
    const displayRowLabels = [...sortedDataRows, TOTAL_LABEL];

    const dataCellValues = dataRows.flatMap((row) =>
        columnLabels.filter((c) => c !== TOTAL_LABEL).map((col) => cells[`${row}|${col}`] ?? 0)
    );
    const maxCell = Math.max(...dataCellValues, 1);
    const isTotalRow = (row: string) => row === TOTAL_LABEL;
    const isTotalCol = (col: string) => col === TOTAL_LABEL;
    const isTotalCell = (row: string, col: string) => isTotalRow(row) || isTotalCol(col);

    const handleColumnClick = (col: string) => {
        if (sortColumn === col) {
            setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortColumn(col);
            setSortDir('asc');
        }
    };

    return (
        <div className="overflow-auto" style={{ background: REPORT_BG }}>
            <table
                className="w-full min-w-[400px] border-collapse text-sm"
                style={{ borderColor: REPORT_BORDER }}
            >
                <thead>
                    <tr>
                        <th
                            className="sticky left-0 z-10 px-4 py-3 text-left font-semibold"
                            style={{ border: `0.5px solid ${REPORT_BORDER}`, background: REPORT_BG }}
                        />
                        {columnLabels.map((col) => (
                            <th
                                key={col}
                                role="button"
                                tabIndex={0}
                                onClick={() => handleColumnClick(col)}
                                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleColumnClick(col)}
                                className={`px-4 py-3 text-left font-semibold cursor-pointer select-none hover:opacity-80 ${col === TOTAL_LABEL ? 'font-bold' : ''}`}
                                style={{
                                    border: `0.5px solid ${REPORT_BORDER}`,
                                    background: col === TOTAL_LABEL ? TOTAL_BG : REPORT_BG,
                                    color: REPORT_LABEL,
                                }}
                                title={sortColumn === col ? `Sorted ${sortDir}` : 'Click to sort'}
                            >
                                <span className="inline-flex items-center gap-1">
                                    {col}
                                    {sortColumn === col && (
                                        <span className="text-xs" aria-hidden>
                                            {sortDir === 'asc' ? '↑' : '↓'}
                                        </span>
                                    )}
                                </span>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {displayRowLabels.map((row) => (
                        <tr key={row}>
                            <td
                                className={`sticky left-0 z-10 px-4 py-2.5 font-medium ${isTotalRow(row) ? 'font-bold' : ''}`}
                                style={{
                                    border: `0.5px solid ${REPORT_BORDER}`,
                                    background: isTotalRow(row) ? TOTAL_BG : REPORT_BG,
                                    color: REPORT_TEXT,
                                }}
                            >
                                {row}
                            </td>
                            {columnLabels.map((col) => {
                                const key = `${row}|${col}`;
                                const value = cells[key] ?? 0;
                                const totalCell = isTotalCell(row, col);
                                const cellBg = totalCell ? TOTAL_BG : (value === 0 ? MATRIX_COLOR_LIGHT : lerpColor(MATRIX_COLOR_LIGHT, MATRIX_COLOR_DARK, maxCell > 0 ? value / maxCell : 0));
                                return (
                                    <td
                                        key={key}
                                        className={`px-4 py-2.5 text-right tabular-nums ${totalCell ? 'font-bold' : ''}`}
                                        style={{
                                            border: `0.5px solid ${REPORT_BORDER}`,
                                            background: cellBg,
                                            color: REPORT_TEXT,
                                        }}
                                    >
                                        {value}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

const CHART_HEIGHT = 220;

function sortChartSeries(series: Array<{ label: string; value: number; legend?: string }>, mode: ReportSortMode | null): Array<{ label: string; value: number; legend?: string }> {
    if (!mode || series.length === 0) return series;
    const sorted = [...series];
    if (mode === 'label_asc') return sorted.sort((a, b) => a.label.localeCompare(b.label));
    if (mode === 'label_desc') return sorted.sort((a, b) => b.label.localeCompare(a.label));
    if (mode === 'value_asc') return sorted.sort((a, b) => a.value - b.value);
    if (mode === 'value_desc') return sorted.sort((a, b) => b.value - a.value);
    return series;
}

function ReportChart({
    chartType,
    series,
    emptyMessage,
    reportSort,
}: {
    chartType: string;
    series: Array<{ label: string; value: number; legend?: string }>;
    emptyMessage: string | null;
    reportSort?: ReportSortMode | null;
}) {
    const sortedSeries = sortChartSeries(series, reportSort ?? null);
    if (sortedSeries.length === 0) {
        return (
            <div className="flex min-h-[280px] items-center justify-center p-8" style={{ color: REPORT_LABEL }}>
                <p className="text-center">{emptyMessage ?? 'No data for the selected filters.'}</p>
            </div>
        );
    }
    const maxValue = Math.max(...sortedSeries.map((s) => s.value), 1);
    const isHorizontal = chartType === 'horizontal';
    const hasRealLegend = sortedSeries.some((s) => s.legend != null && String(s.legend).trim() !== '');
    const groupedByLegend = hasRealLegend
        ? (() => {
              const map = new Map<string, typeof sortedSeries>();
              for (const s of sortedSeries) {
                  const key = (s.legend != null && String(s.legend).trim() !== '') ? String(s.legend).trim() : '__no_legend__';
                  if (!map.has(key)) map.set(key, []);
                  map.get(key)!.push(s);
              }
              return Array.from(map.entries()).filter(([k]) => k !== '__no_legend__');
          })()
        : null;
    const useGroupedView = groupedByLegend && groupedByLegend.length > 0;

    function BarBlock({
        label,
        value,
        maxVal,
        isHoriz,
        colorIndex,
    }: {
        label: string;
        value: number;
        maxVal: number;
        isHoriz: boolean;
        colorIndex: number;
    }) {
        const pct = (value / maxVal) * 100;
        const barColor = POWER_BI_PALETTE[colorIndex % POWER_BI_PALETTE.length];
        if (isHoriz) {
            return (
                <div
                    className="grid w-full items-center gap-3"
                    style={{ gridTemplateColumns: '9rem minmax(120px, 1fr) 2.5rem' }}
                >
                    <span
                        className="min-w-0 truncate text-sm font-medium"
                        style={{ color: REPORT_LABEL }}
                        title={label}
                    >
                        {label}
                    </span>
                    <div
                        className="h-8 min-w-0 rounded overflow-hidden"
                        style={{ background: REPORT_BG, border: `0.5px solid ${REPORT_BORDER}` }}
                    >
                        <div
                            className="h-full rounded transition-[width]"
                            style={{
                                width: `${pct}%`,
                                minWidth: value > 0 ? '4px' : 0,
                                background: barColor,
                                boxShadow: '0 0 0 0.5px rgba(255,255,255,0.6)',
                            }}
                        />
                    </div>
                    <span className="text-right text-sm font-semibold tabular-nums" style={{ color: REPORT_TEXT }}>
                        {value}
                    </span>
                </div>
            );
        }
        const barTopPx = (pct / 100) * CHART_HEIGHT;
        return (
            <div className="flex flex-1 flex-col items-center min-w-0">
                <div className="relative w-full flex justify-center items-end" style={{ height: CHART_HEIGHT + 24 }}>
                    <span
                        className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-sm font-semibold tabular-nums leading-none"
                        style={{ color: REPORT_TEXT, bottom: barTopPx + 4 }}
                    >
                        {value}
                    </span>
                    <div
                        className="w-full max-w-[40px] rounded-t transition-[height] overflow-hidden shrink-0"
                        style={{
                            height: `${pct}%`,
                            minHeight: value > 0 ? '4px' : 0,
                            background: barColor,
                            boxShadow: '0 0 0 0.5px rgba(255,255,255,0.6)',
                        }}
                    />
                </div>
                <div className="mt-2 min-h-[2.5rem] relative flex items-end justify-center w-full overflow-visible">
                    <span
                        className="text-xs font-medium inline-block whitespace-nowrap absolute right-1/2"
                        style={{ color: REPORT_LABEL, transform: 'rotate(-45deg)', transformOrigin: 'top right', textAlign: 'right' }}
                        title={label}
                    >
                        {label}
                    </span>
                </div>
            </div>
        );
    }

    if (useGroupedView) {
        const legendLabels = groupedByLegend!.map(([legend]) => legend);
        const legendToIndex = new Map(legendLabels.map((name, idx) => [name, idx]));

        const groupedByX = new Map<string, Array<{ value: number; legend: string; colorIndex: number }>>();
        for (const [legend, items] of groupedByLegend!) {
            const colorIndex = legendToIndex.get(legend) ?? 0;
            for (const s of items) {
                const key = s.label;
                if (!groupedByX.has(key)) groupedByX.set(key, []);
                groupedByX.get(key)!.push({ value: s.value, legend, colorIndex });
            }
        }

        const xLabels = Array.from(groupedByX.keys());
        const maxTotal = Math.max(
            ...xLabels.map((x) => groupedByX.get(x)!.reduce((sum, seg) => sum + seg.value, 0)),
            1
        );

        type Segment = { value: number; legend: string; colorIndex: number };
        function StackedBarBlock({
            xLabel,
            segments,
            maxVal,
            isHoriz,
        }: {
            xLabel: string;
            segments: Segment[];
            maxVal: number;
            isHoriz: boolean;
        }) {
            const total = segments.reduce((s, seg) => s + seg.value, 0);
            const sortedSegments = [...segments].sort((a, b) => legendToIndex.get(a.legend)! - legendToIndex.get(b.legend)!);

            if (isHoriz) {
                const pctTotal = (total / maxVal) * 100;
                return (
                    <div
                        className="grid w-full items-center gap-3"
                        style={{ gridTemplateColumns: '9rem minmax(120px, 1fr) 2.5rem' }}
                    >
                        <span
                            className="min-w-0 truncate text-sm font-medium"
                            style={{ color: REPORT_LABEL }}
                            title={xLabel}
                        >
                            {xLabel}
                        </span>
                        <div
                            className="h-8 min-w-0 rounded overflow-hidden flex"
                            style={{ background: REPORT_BG, border: `0.5px solid ${REPORT_BORDER}` }}
                        >
                            {sortedSegments.map((seg, i) => {
                                const pct = total > 0 ? (seg.value / total) * 100 : 0;
                                const barColor = POWER_BI_PALETTE[seg.colorIndex % POWER_BI_PALETTE.length];
                                return (
                                    <div
                                        key={i}
                                        className="h-full transition-[width]"
                                        style={{
                                            width: `${pct}%`,
                                            minWidth: seg.value > 0 ? '2px' : 0,
                                            background: barColor,
                                            boxShadow: '0 0 0 0.5px rgba(255,255,255,0.6)',
                                        }}
                                        title={`${seg.legend}: ${seg.value}`}
                                    />
                                );
                            })}
                        </div>
                        <span className="w-10 text-right text-sm font-semibold tabular-nums shrink-0" style={{ color: REPORT_TEXT }}>
                            {total}
                        </span>
                    </div>
                );
            }

            const barHeightPct = (total / maxVal) * 100;
            const barHeightPx = (barHeightPct / 100) * CHART_HEIGHT;
            return (
                <div className="flex flex-1 flex-col items-center min-w-0">
                    <div className="relative w-full flex justify-center items-end" style={{ height: CHART_HEIGHT + 24 }}>
                        <span
                            className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-sm font-semibold tabular-nums leading-none"
                            style={{ color: REPORT_TEXT, bottom: barHeightPx + 4 }}
                        >
                            {total}
                        </span>
                        <div
                            className="w-full max-w-[40px] rounded-t overflow-hidden shrink-0 flex flex-col-reverse"
                            style={{ height: `${barHeightPct}%`, minHeight: total > 0 ? '4px' : 0 }}
                        >
                            {sortedSegments.map((seg, i) => {
                                const pct = total > 0 ? (seg.value / total) * 100 : 0;
                                const barColor = POWER_BI_PALETTE[seg.colorIndex % POWER_BI_PALETTE.length];
                                return (
                                    <div
                                        key={i}
                                        className="w-full transition-[height]"
                                        style={{
                                            height: `${pct}%`,
                                            minHeight: seg.value > 0 ? '2px' : 0,
                                            background: barColor,
                                            boxShadow: '0 0 0 0.5px rgba(255,255,255,0.6)',
                                        }}
                                        title={`${seg.legend}: ${seg.value}`}
                                    />
                                );
                            })}
                        </div>
                    </div>
                    <div className="mt-2 min-h-[2.5rem] relative flex items-end justify-center w-full overflow-visible">
                        <span
                            className="text-xs font-medium inline-block whitespace-nowrap absolute right-1/2"
                            style={{ color: REPORT_LABEL, transform: 'rotate(-45deg)', transformOrigin: 'top right', textAlign: 'right' }}
                            title={xLabel}
                        >
                            {xLabel}
                        </span>
                    </div>
                </div>
            );
        }

        return (
            <div className={`p-6 flex flex-col gap-6 ${isHorizontal ? 'w-full min-w-0' : ''}`} style={{ background: REPORT_BG }}>
                {legendLabels.length > 0 && (
                    <div className="flex flex-wrap gap-4 shrink-0" style={{ color: REPORT_TEXT }}>
                        {legendLabels.map((name, idx) => (
                            <span key={name} className="flex items-center gap-2 text-sm">
                                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: POWER_BI_PALETTE[idx % POWER_BI_PALETTE.length] }} />
                                {name}
                            </span>
                        ))}
                    </div>
                )}
                <div
                    className={
                        isHorizontal
                            ? 'flex flex-col gap-3 w-full min-w-0'
                            : 'flex items-end gap-4'
                    }
                >
                    {xLabels.map((xLabel) => (
                        <StackedBarBlock
                            key={xLabel}
                            xLabel={xLabel}
                            segments={groupedByX.get(xLabel)!}
                            maxVal={maxTotal}
                            isHoriz={isHorizontal}
                        />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className={`p-6 ${isHorizontal ? 'w-full min-w-0' : ''}`} style={{ background: REPORT_BG }}>
            <div
                className={
                    isHorizontal
                        ? 'flex flex-col gap-3 w-full min-w-0'
                        : 'flex items-end gap-4'
                }
            >
                {sortedSeries.map((s, i) => (
                    <BarBlock
                        key={i}
                        label={s.label}
                        value={s.value}
                        maxVal={maxValue}
                        isHoriz={isHorizontal}
                        colorIndex={i}
                    />
                ))}
            </div>
        </div>
    );
}

type ReportData =
    | {
          type: 'pivot';
          rowLabels: string[];
          columnLabels: string[];
          cells: Record<string, number>;
          message: string | null;
      }
    | {
          type: 'charts';
          chart_type: string;
          series: Array<{ label: string; value: number; legend?: string }>;
          message: string | null;
      };

interface ReportShowProps {
    report: {
        id: number;
        report_type: string;
        report_name: string;
        primary_module: string;
        folder_name: string;
        settings: Record<string, unknown>;
    };
    filters: {
        created_from?: string;
        created_to?: string;
        assigned_to?: string;
    };
    data: ReportData;
}

export default function ReportShow({ report, filters: initialFilters, data }: ReportShowProps) {
    const [filters, setFilters] = useState({
        created_from: initialFilters.created_from ?? '',
        created_to: initialFilters.created_to ?? '',
        assigned_to: initialFilters.assigned_to ?? 'all',
    });
    const [reportSort, setReportSort] = useState<ReportSortMode | null>(null);

    const applyFilters = () => {
        const params: Record<string, string> = {};
        if (filters.created_from) params.created_from = filters.created_from;
        if (filters.created_to) params.created_to = filters.created_to;
        if (filters.assigned_to && filters.assigned_to !== 'all') params.assigned_to = filters.assigned_to;
        router.get(`/reports/${report.id}`, params);
    };

    return (
        <AppLayout breadcrumbs={[]}>
            <Head title={`Report - ${report.report_name}`} />
            <div className="h-1 shrink-0" style={{ background: MATRIX_COLOR_DARK }} />
            <div className="flex flex-1 flex-col min-h-0 p-6">
                <div className="flex items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                        <div
                            className="flex h-9 w-9 items-center justify-center rounded-lg"
                            style={{ background: `${MATRIX_COLOR_DARK}20`, color: MATRIX_COLOR_DARK }}
                        >
                            <BarChart3 className="h-5 w-5" />
                        </div>
                        <nav className="flex items-center gap-1 text-sm" style={{ color: REPORT_LABEL }}>
                            <Link href="/reports" className="hover:opacity-80" style={{ color: REPORT_LABEL }}>
                                Reports
                            </Link>
                            <span>/</span>
                            <span className="font-medium" style={{ color: REPORT_TEXT }}>{report.report_name}</span>
                        </nav>
                    </div>
                    <Link href="/reports">
                        <Button variant="outline">Back to Reports</Button>
                    </Link>
                </div>

                <Card
                    className="flex-1 min-h-[280px] overflow-hidden flex flex-col"
                    style={{ background: REPORT_BG, borderColor: REPORT_BORDER }}
                >
                    <CardHeader
                        className="py-4 pb-2 shrink-0"
                        style={{ borderBottom: `1.5px solid ${REPORT_BORDER}` }}
                    >
                        <div className="flex flex-wrap items-center gap-2">
                            <CardTitle className="text-lg font-semibold" style={{ color: REPORT_TEXT }}>
                                {report.report_name}
                            </CardTitle>
                            <Badge
                                variant="secondary"
                                className="font-normal"
                                style={{ background: `${MATRIX_COLOR_DARK}18`, color: MATRIX_COLOR_DARK, borderColor: REPORT_BORDER }}
                            >
                                {report.report_type === 'pivot' ? (
                                    <><Table className="mr-1 h-3.5 w-3.5" /> Pivot</>
                                ) : (
                                    <><BarChart3 className="mr-1 h-3.5 w-3.5" /> Chart</>
                                )}
                            </Badge>
                            <Badge
                                variant="outline"
                                className="font-normal"
                                style={{ borderColor: REPORT_BORDER, color: REPORT_LABEL }}
                            >
                                {report.primary_module === 'leads' ? 'Leads' : 'Follow-ups'}
                            </Badge>
                            {report.folder_name && (
                                <span className="text-xs" style={{ color: REPORT_LABEL }}>
                                    {report.folder_name}
                                </span>
                            )}
                            {data.type === 'charts' && (
                                <div className="flex items-center gap-0.5 ml-auto">
                                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Sort A–Z (by label)" onClick={() => setReportSort((s) => (s === 'label_asc' ? null : 'label_asc'))}>
                                        <ArrowDownAZ className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" title={reportSort === 'value_desc' ? 'Sort ascending (by value)' : 'Sort descending (by value)'} onClick={() => setReportSort((s) => (s === 'value_desc' ? 'value_asc' : 'value_desc'))}>
                                        {reportSort === 'value_desc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 min-h-0 p-0 overflow-auto" style={{ background: REPORT_BG }}>
                    {data.type === 'pivot' && (
                        <PivotTable
                            rowLabels={data.rowLabels}
                            columnLabels={data.columnLabels}
                            cells={data.cells}
                            emptyMessage={data.message}
                            externalSort={reportSort}
                        />
                    )}
                    {data.type === 'charts' && (
                        <ReportChart
                            chartType={data.chart_type}
                            series={data.series}
                            emptyMessage={data.message}
                            reportSort={reportSort}
                        />
                    )}
                    {data.type !== 'pivot' && data.type !== 'charts' && (
                        <div className="flex min-h-[280px] items-center justify-center p-8" style={{ color: REPORT_LABEL }}>
                            <p>{data.message ?? 'No data'}</p>
                        </div>
                    )}
                    </CardContent>

                    {/* Filters inside report frame, at the bottom — each condition on its own line */}
                    <div
                        className="shrink-0 px-6 py-4 flex flex-col gap-4"
                        style={{
                            borderTop: `1.5px solid ${REPORT_BORDER}`,
                            background: REPORT_BG,
                        }}
                    >
                        <div className="grid gap-2">
                            <Label className="text-sm font-medium" style={{ color: REPORT_TEXT }}>
                                Created Time between
                            </Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="date"
                                    value={filters.created_from}
                                    onChange={(e) =>
                                        setFilters((prev) => ({
                                            ...prev,
                                            created_from: e.target.value,
                                        }))
                                    }
                                    className="flex-1 max-w-[200px]"
                                    style={{ borderColor: REPORT_BORDER }}
                                />
                                <span className="text-sm" style={{ color: REPORT_LABEL }}>to</span>
                                <Input
                                    type="date"
                                    value={filters.created_to}
                                    onChange={(e) =>
                                        setFilters((prev) => ({
                                            ...prev,
                                            created_to: e.target.value,
                                        }))
                                    }
                                    className="flex-1 max-w-[200px]"
                                    style={{ borderColor: REPORT_BORDER }}
                                />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label className="text-sm font-medium" style={{ color: REPORT_TEXT }}>
                                Assigned To
                            </Label>
                            <Select
                                value={filters.assigned_to}
                                onValueChange={(value) =>
                                    setFilters((prev) => ({ ...prev, assigned_to: value }))
                                }
                            >
                                <SelectTrigger className="max-w-[200px]" style={{ borderColor: REPORT_BORDER }}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All</SelectItem>
                                    <SelectItem value="me">Current User</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Button
                            onClick={applyFilters}
                            className="w-fit"
                            style={{ background: MATRIX_COLOR_DARK }}
                        >
                            Apply filters
                        </Button>
                    </div>
                </Card>
            </div>
        </AppLayout>
    );
}
