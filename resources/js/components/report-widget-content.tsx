/**
 * Shared report display (pivot table + chart) for Reports/Show and dashboard widgets.
 * 30 light colors, ~30° hue spread; order avoids gradient (consecutive indices = very different hue).
 */
import { useState } from 'react';
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
    const goldenStep = 360 * 0.382; // ~137.5° so consecutive colors are far apart
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
    return `rgb(${Math.round(r1 + (r2 - r1) * t)},${Math.round(g1 + (g2 - g1) * t)},${Math.round(b1 + (b2 - b1) * t)})`;
}

function getCellValue(row: string, col: string, columnLabels: string[], cells: Record<string, number>): number {
    if (col === TOTAL_LABEL) {
        return columnLabels
            .filter((c) => c !== TOTAL_LABEL)
            .reduce((sum, c) => sum + (cells[`${row}|${c}`] ?? 0), 0);
    }
    return cells[`${row}|${col}`] ?? 0;
}

export type ReportSortMode = 'label_asc' | 'label_desc' | 'value_asc' | 'value_desc';

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
            <div className="flex min-h-[120px] items-center justify-center p-4 text-sm" style={{ color: REPORT_LABEL }}>
                {emptyMessage ?? 'No data for the selected filters.'}
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
        <div className="overflow-auto h-full" style={{ background: REPORT_BG }}>
            <table className="w-full min-w-[200px] border-collapse text-xs" style={{ borderColor: REPORT_BORDER }}>
                <thead>
                    <tr>
                        <th className="sticky left-0 z-10 px-2 py-2 text-left font-semibold" style={{ border: `0.5px solid ${REPORT_BORDER}`, background: REPORT_BG }} />
                        {columnLabels.map((col) => (
                            <th
                                key={col}
                                role="button"
                                tabIndex={0}
                                onClick={() => handleColumnClick(col)}
                                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleColumnClick(col)}
                                className={`px-2 py-2 text-left font-semibold cursor-pointer select-none hover:opacity-80 ${col === TOTAL_LABEL ? 'font-bold' : ''}`}
                                style={{ border: `0.5px solid ${REPORT_BORDER}`, background: col === TOTAL_LABEL ? TOTAL_BG : REPORT_BG, color: REPORT_LABEL }}
                                title={sortColumn === col ? `Sorted ${sortDir}` : 'Click to sort'}
                            >
                                <span className="inline-flex items-center gap-0.5">
                                    {col}
                                    {sortColumn === col && (
                                        <span className="text-[10px]" aria-hidden>
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
                                className={`sticky left-0 z-10 px-2 py-1.5 font-medium ${isTotalRow(row) ? 'font-bold' : ''}`}
                                style={{ border: `0.5px solid ${REPORT_BORDER}`, background: isTotalRow(row) ? TOTAL_BG : REPORT_BG, color: REPORT_TEXT }}
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
                                        className={`px-2 py-1.5 text-right tabular-nums ${totalCell ? 'font-bold' : ''}`}
                                        style={{ border: `0.5px solid ${REPORT_BORDER}`, background: cellBg, color: REPORT_TEXT }}
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

const CHART_HEIGHT = 160;

function sortSeriesByMode(series: Array<{ label: string; value: number; legend?: string }>, mode: ReportSortMode | null | undefined): Array<{ label: string; value: number; legend?: string }> {
    if (!mode || series.length === 0) return series;
    const sorted = [...series];
    if (mode === 'label_asc') return sorted.sort((a, b) => a.label.localeCompare(b.label));
    if (mode === 'label_desc') return sorted.sort((a, b) => b.label.localeCompare(a.label));
    if (mode === 'value_asc') return sorted.sort((a, b) => a.value - b.value);
    if (mode === 'value_desc') return sorted.sort((a, b) => b.value - a.value);
    return series;
}

function ReportChart({ chartType, series, emptyMessage, reportSort }: { chartType: string; series: Array<{ label: string; value: number; legend?: string }>; emptyMessage: string | null; reportSort?: ReportSortMode | null }) {
    const sortedSeries = sortSeriesByMode(series, reportSort);
    if (sortedSeries.length === 0) {
        return (
            <div className="flex min-h-[120px] items-center justify-center p-4 text-sm" style={{ color: REPORT_LABEL }}>
                {emptyMessage ?? 'No data for the selected filters.'}
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

    function BarBlock({ label, value, maxVal, isHoriz, colorIndex }: { label: string; value: number; maxVal: number; isHoriz: boolean; colorIndex: number }) {
        const pct = (value / maxVal) * 100;
        const barColor = POWER_BI_PALETTE[colorIndex % POWER_BI_PALETTE.length];
        if (isHoriz) {
            return (
                <div
                    className="grid w-full items-center gap-2"
                    style={{ gridTemplateColumns: '6rem minmax(80px, 1fr) 2rem' }}
                >
                    <span className="min-w-0 truncate text-xs font-medium" style={{ color: REPORT_LABEL }} title={label}>{label}</span>
                    <div className="h-6 min-w-0 rounded overflow-hidden" style={{ background: REPORT_BG, border: `0.5px solid ${REPORT_BORDER}` }}>
                        <div
                            className="h-full rounded"
                            style={{ width: `${pct}%`, minWidth: value > 0 ? '4px' : 0, background: barColor, boxShadow: '0 0 0 0.5px rgba(255,255,255,0.6)' }}
                        />
                    </div>
                    <span className="text-right text-xs font-semibold tabular-nums" style={{ color: REPORT_TEXT }}>{value}</span>
                </div>
            );
        }
        const barTopPx = (pct / 100) * CHART_HEIGHT;
        return (
            <div className="flex flex-1 flex-col items-center min-w-0">
                <div className="relative w-full flex justify-center items-end" style={{ height: CHART_HEIGHT + 20 }}>
                    <span
                        className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-semibold tabular-nums leading-none"
                        style={{ color: REPORT_TEXT, bottom: barTopPx + 3 }}
                    >
                        {value}
                    </span>
                    <div
                        className="w-full max-w-[28px] rounded-t overflow-hidden shrink-0"
                        style={{ height: `${pct}%`, minHeight: value > 0 ? '4px' : 0, background: barColor, boxShadow: '0 0 0 0.5px rgba(255,255,255,0.6)' }}
                    />
                </div>
                <div className="mt-1 min-h-[2.5rem] relative flex items-end justify-center w-full overflow-visible">
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
                return (
                    <div
                        className="grid w-full items-center gap-2"
                        style={{ gridTemplateColumns: '6rem minmax(80px, 1fr) 2rem' }}
                    >
                        <span className="min-w-0 truncate text-xs font-medium" style={{ color: REPORT_LABEL }} title={xLabel}>{xLabel}</span>
                        <div className="h-6 min-w-0 rounded overflow-hidden flex" style={{ background: REPORT_BG, border: `0.5px solid ${REPORT_BORDER}` }}>
                            {sortedSegments.map((seg, i) => {
                                const pct = total > 0 ? (seg.value / total) * 100 : 0;
                                const barColor = POWER_BI_PALETTE[seg.colorIndex % POWER_BI_PALETTE.length];
                                return (
                                    <div
                                        key={i}
                                        className="h-full transition-[width]"
                                        style={{ width: `${pct}%`, minWidth: seg.value > 0 ? '2px' : 0, background: barColor, boxShadow: '0 0 0 0.5px rgba(255,255,255,0.6)' }}
                                        title={`${seg.legend}: ${seg.value}`}
                                    />
                                );
                            })}
                        </div>
                        <span className="w-8 text-right text-xs font-semibold tabular-nums shrink-0" style={{ color: REPORT_TEXT }}>{total}</span>
                    </div>
                );
            }

            const barHeightPct = (total / maxVal) * 100;
            return (
                <div className="flex flex-1 flex-col items-center min-w-0">
                    <div className="relative w-full flex justify-center items-end" style={{ height: CHART_HEIGHT + 20 }}>
                        <span
                            className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-semibold tabular-nums leading-none"
                            style={{ color: REPORT_TEXT, bottom: (barHeightPct / 100) * CHART_HEIGHT + 3 }}
                        >
                            {total}
                        </span>
                        <div
                            className="w-full max-w-[28px] rounded-t overflow-hidden shrink-0 flex flex-col-reverse"
                            style={{ height: `${barHeightPct}%`, minHeight: total > 0 ? '4px' : 0 }}
                        >
                            {sortedSegments.map((seg, i) => {
                                const pct = total > 0 ? (seg.value / total) * 100 : 0;
                                const barColor = POWER_BI_PALETTE[seg.colorIndex % POWER_BI_PALETTE.length];
                                return (
                                    <div
                                        key={i}
                                        className="w-full transition-[height]"
                                        style={{ height: `${pct}%`, minHeight: seg.value > 0 ? '2px' : 0, background: barColor, boxShadow: '0 0 0 0.5px rgba(255,255,255,0.6)' }}
                                        title={`${seg.legend}: ${seg.value}`}
                                    />
                                );
                            })}
                        </div>
                    </div>
                    <div className="mt-1 min-h-[2.5rem] relative flex items-end justify-center w-full overflow-visible">
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
            <div className={`p-4 flex flex-col gap-4 ${isHorizontal ? 'w-full min-w-0' : ''}`} style={{ background: REPORT_BG }}>
                {legendLabels.length > 0 && (
                    <div className="flex flex-wrap gap-3 shrink-0" style={{ color: REPORT_TEXT }}>
                        {legendLabels.map((name, idx) => (
                            <span key={name} className="flex items-center gap-1.5 text-xs">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: POWER_BI_PALETTE[idx % POWER_BI_PALETTE.length] }} />
                                {name}
                            </span>
                        ))}
                    </div>
                )}
                <div className={isHorizontal ? 'flex flex-col gap-2 w-full min-w-0' : 'flex items-end gap-2'}>
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
        <div className={`p-4 ${isHorizontal ? 'w-full min-w-0' : ''}`} style={{ background: REPORT_BG }}>
            <div className={isHorizontal ? 'flex flex-col gap-2 w-full min-w-0' : 'flex items-end gap-2'}>
                {sortedSeries.map((s, i) => (
                    <BarBlock key={i} label={s.label} value={s.value} maxVal={maxValue} isHoriz={isHorizontal} colorIndex={i} />
                ))}
            </div>
        </div>
    );
}

export type ReportData =
    | { type: 'pivot'; rowLabels: string[]; columnLabels: string[]; cells: Record<string, number>; message: string | null }
    | { type: 'charts'; chart_type: string; series: Array<{ label: string; value: number; legend?: string }>; message: string | null };

export function ReportWidgetContent({ data, reportSort }: { data: ReportData; reportSort?: ReportSortMode | null }) {
    if (data.type === 'pivot') {
        return (
            <PivotTable
                key={reportSort ?? 'none'}
                rowLabels={data.rowLabels}
                columnLabels={data.columnLabels}
                cells={data.cells}
                emptyMessage={data.message}
                externalSort={reportSort}
            />
        );
    }
    if (data.type === 'charts') {
        return <ReportChart chartType={data.chart_type} series={data.series} emptyMessage={data.message} reportSort={reportSort} />;
    }
    return (
        <div className="flex min-h-[120px] items-center justify-center p-4 text-sm" style={{ color: REPORT_LABEL }}>
            {(data as { message?: string | null }).message ?? 'No data'}
        </div>
    );
}
