<?php

namespace App\Http\Controllers;

use App\Models\DashboardWidget;
use App\Models\Report;
use App\Models\ReportFolder;
use App\Models\ReportUserPreference;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Drivers\app\Models\Driver;
use Modules\Drivers\app\Models\DriverFollowUp;

class ReportController extends Controller
{
    public function index(Request $request): Response|RedirectResponse
    {
        $user = Auth::user();
        $companyId = $this->getCompanyId();

        $folders = $this->getFoldersForUser($companyId);

        $folderId = $request->query('folder_id', 'all');
        $perPage = (int) $request->query('per_page', 50);
        $perPage = in_array($perPage, [10, 25, 50, 100], true) ? $perPage : 50;
        $page = max(1, (int) $request->query('page', 1));

        $reportsQuery = Report::query()
            ->with('reportFolder')
            ->where(function ($q) use ($companyId) {
                if ($companyId !== null) {
                    $q->where('company_id', $companyId);
                } else {
                    $q->whereNull('company_id');
                }
            })
            ->where(function ($q) use ($user) {
                $q->where('user_id', $user->id)
                    ->orWhereJsonContains('share_report', 'all')
                    ->orWhereJsonContains('share_report', (string) $user->id)
                    ->orWhereJsonContains('share_report', $user->id);
            });

        if ($folderId !== 'all') {
            if ($folderId === 'shared') {
                $reportsQuery->where(function ($q) use ($user) {
                    $q->whereJsonContains('share_report', 'all')
                        ->orWhereJsonContains('share_report', (string) $user->id)
                        ->orWhereJsonContains('share_report', $user->id);
                })->where('user_id', '!=', $user->id);
            } else {
                $reportsQuery->where('report_folder_id', (int) $folderId);
            }
        }

        if ($request->filled('report_type')) {
            $reportsQuery->where('report_type', $request->query('report_type'));
        }
        if ($request->filled('report_name')) {
            $reportsQuery->where('report_name', 'like', '%' . $request->query('report_name') . '%');
        }
        if ($request->filled('primary_module')) {
            $reportsQuery->where('primary_module', $request->query('primary_module'));
        }
        if ($request->filled('folder_name')) {
            $reportsQuery->whereHas('reportFolder', function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->query('folder_name') . '%');
            });
        }

        $sortColumn = $request->query('sort', 'updated_at');
        $allowedSort = ['report_name', 'report_type', 'primary_module', 'folder_name', 'updated_at'];
        if (! in_array($sortColumn, $allowedSort, true)) {
            $sortColumn = 'updated_at';
        }
        $dir = strtolower((string) $request->query('dir', 'desc'));
        $dir = $dir === 'asc' ? 'asc' : 'desc';
        if ($sortColumn === 'folder_name') {
            $reportsQuery->leftJoin('report_folders', 'reports.report_folder_id', '=', 'report_folders.id')
                ->orderBy('report_folders.name', $dir)
                ->select('reports.*');
        } else {
            $reportsQuery->orderBy($sortColumn, $dir);
        }
        $total = $reportsQuery->count();
        $reports = $reportsQuery->skip(($page - 1) * $perPage)->take($perPage)->get();

        $reportsData = $reports->map(function (Report $r) {
            return [
                'id' => $r->id,
                'report_type' => $r->report_type,
                'report_name' => $r->report_name,
                'primary_module' => ucfirst(str_replace('_', ' ', $r->primary_module)),
                'folder_name' => $r->reportFolder?->name ?? '',
                'folder_id' => $r->report_folder_id,
            ];
        });

        $from = $total === 0 ? 0 : ($page - 1) * $perPage + 1;
        $to = min($page * $perPage, $total);

        $folderOptions = $folders->map(function ($f) use ($folderId) {
            return [
                'id' => (string) $f['id'],
                'name' => $f['name'],
                'active' => (string) $f['id'] === $folderId,
            ];
        })->values()->all();

        $pinnedReportIds = DashboardWidget::where('user_id', $user->id)->pluck('report_id')->all();

        return Inertia::render('Reports/Index', [
            'folders' => $folderOptions,
            'reports' => $reportsData,
            'pagination' => [
                'from' => $from,
                'to' => $to,
                'total' => $total,
                'per_page' => $perPage,
                'current_page' => $page,
            ],
            'filters' => [
                'folder_id' => $folderId,
                'report_type' => $request->query('report_type', ''),
                'report_name' => $request->query('report_name', ''),
                'primary_module' => $request->query('primary_module', ''),
                'folder_name' => $request->query('folder_name', ''),
            ],
            'sort' => $sortColumn,
            'sort_dir' => $dir,
            'pinnedReportIds' => array_values($pinnedReportIds),
        ]);
    }

    /**
     * @return \Illuminate\Support\Collection<int, array{id: string|int, name: string}>
     */
    private function getFoldersForUser(?int $companyId): \Illuminate\Support\Collection
    {
        $query = ReportFolder::query()->orderBy('sort_order')->orderBy('name');
        if ($companyId !== null) {
            $query->where(function ($q) use ($companyId) {
                $q->where('company_id', $companyId)->orWhereNull('company_id');
            });
        } else {
            $query->whereNull('company_id');
        }
        $folders = $query->get(['id', 'name', 'sort_order']);

        $result = collect([
            ['id' => 'all', 'name' => 'All Reports'],
            ...$folders->map(fn ($f) => ['id' => (string) $f->id, 'name' => $f->name])->toArray(),
            ['id' => 'shared', 'name' => 'Shared With Me'],
        ]);

        return $result;
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'report_name' => ['required', 'string', 'max:255'],
            'report_folder_id' => ['required', 'string'],
            'primary_module' => ['required', 'string', 'in:leads,follow_ups'],
            'related_modules' => ['nullable', 'array'],
            'related_modules.*' => ['string', 'in:leads,follow_ups'],
            'description' => ['nullable', 'string', 'max:1000'],
            'share_report' => ['nullable', 'array'],
            'share_report.*' => ['string'],
            'report_type' => ['required', 'in:pivot,charts'],
            'settings' => ['required', 'array'],
        ]);

        $user = Auth::user();
        $companyId = $this->getCompanyId();

        $folderId = $validated['report_folder_id'];
        if ($folderId === 'all' || $folderId === 'shared') {
            $firstFolder = ReportFolder::when($companyId, fn ($q) => $q->where('company_id', $companyId))
                ->orderBy('sort_order')
                ->first();
            $folderId = $firstFolder?->id ?? $this->createDefaultFolder($companyId);
        } else {
            $folderId = (int) $folderId;
        }

        $report = Report::create([
            'report_folder_id' => $folderId,
            'report_type' => $validated['report_type'],
            'report_name' => $validated['report_name'],
            'primary_module' => $validated['primary_module'],
            'related_modules' => $validated['related_modules'] ?? [],
            'description' => $validated['description'] ?? null,
            'share_report' => $validated['share_report'] ?? ['all'],
            'settings' => $validated['settings'],
            'user_id' => $user->id,
            'company_id' => $companyId,
        ]);

        return redirect()->route('reports.index')->with('success', 'Report created successfully.');
    }

    private function createDefaultFolder(?int $companyId): int
    {
        $folder = ReportFolder::create([
            'name' => 'General',
            'company_id' => $companyId,
            'sort_order' => 0,
        ]);

        return $folder->id;
    }

    public function show(Request $request, Report $report): Response
    {
        $user = Auth::user();
        $canAccess = $report->user_id === $user->id
            || ($report->company_id && $report->company_id === $user->company_id)
            || in_array('all', $report->share_report ?? [], true)
            || in_array((string) $user->id, $report->share_report ?? [], true)
            || in_array($user->id, $report->share_report ?? [], true);
        if (! $canAccess) {
            abort(403);
        }

        $filters = [
            'created_from' => $request->query('created_from'),
            'created_to' => $request->query('created_to'),
            'assigned_to' => $request->query('assigned_to', 'all'),
        ];

        $preference = ReportUserPreference::query()
            ->where('user_id', $user->id)
            ->where('report_id', $report->id)
            ->first();

        return Inertia::render('Reports/Show', [
            'report' => [
                'id' => $report->id,
                'report_type' => $report->report_type,
                'report_name' => $report->report_name,
                'primary_module' => $report->primary_module,
                'folder_name' => $report->reportFolder?->name ?? '',
                'settings' => $report->settings,
            ],
            'filters' => $filters,
            'data' => $this->getReportData($report, $filters),
            'sort_mode' => $preference?->sort_mode,
        ]);
    }

    public function updatePreference(Request $request, Report $report): RedirectResponse
    {
        $user = Auth::user();
        $canAccess = $report->user_id === $user->id
            || ($report->company_id && $report->company_id === $user->company_id)
            || in_array('all', $report->share_report ?? [], true)
            || in_array((string) $user->id, $report->share_report ?? [], true)
            || in_array($user->id, $report->share_report ?? [], true);
        if (! $canAccess) {
            abort(403);
        }

        $validated = $request->validate([
            'sort_mode' => ['nullable', 'string', 'in:label_asc,label_desc,value_asc,value_desc'],
        ]);

        ReportUserPreference::updateOrCreate(
            ['user_id' => $user->id, 'report_id' => $report->id],
            ['sort_mode' => $validated['sort_mode'] ?? null]
        );

        return redirect()->back();
    }

    /**
     * Public accessor for report data (used by DashboardController).
     *
     * @param  array{created_from?: string, created_to?: string, assigned_to?: string}  $filters
     * @return array<string, mixed>
     */
    public function getReportDataForReport(Report $report, array $filters): array
    {
        return $this->getReportData($report, $filters);
    }

    /**
     * @param  array{created_from?: string, created_to?: string, assigned_to?: string}  $filters
     * @return array<string, mixed>
     */
    private function getReportData(Report $report, array $filters): array
    {
        $settings = $report->settings ?? [];
        $module = $report->primary_module ?? 'leads';
        $user = Auth::user();
        $companyId = $this->getCompanyId();

        if ($report->report_type === 'pivot') {
            $xAxis = $settings['x_axis'] ?? null;
            $yAxis = $settings['y_axis'] ?? null;
            if (! $xAxis || ! $yAxis) {
                return [
                    'type' => 'pivot',
                    'settings' => $settings,
                    'rowLabels' => [],
                    'columnLabels' => [],
                    'cells' => [],
                    'message' => null,
                ];
            }
            $result = $this->buildPivotData($module, $xAxis, $yAxis, $filters, $companyId, $user);
            return [
                'type' => 'pivot',
                'settings' => $settings,
                'rowLabels' => $result['rowLabels'],
                'columnLabels' => $result['columnLabels'],
                'cells' => $result['cells'],
                'message' => null,
            ];
        }

        if ($report->report_type === 'charts') {
            $xAxis = $settings['x_axis'] ?? null;
            $legend = $settings['legend'] ?? null;
            if (! $xAxis) {
                return [
                    'type' => 'charts',
                    'settings' => $settings,
                    'chart_type' => $settings['chart_type'] ?? 'vertical',
                    'series' => [],
                    'message' => null,
                ];
            }
            $series = $this->buildChartData($module, $xAxis, $legend, $filters, $companyId, $user);
            return [
                'type' => 'charts',
                'settings' => $settings,
                'chart_type' => $settings['chart_type'] ?? 'vertical',
                'series' => $series,
                'message' => null,
            ];
        }

        return [
            'type' => $report->report_type,
            'settings' => $settings,
            'rows' => [],
            'message' => null,
        ];
    }

    /**
     * @param  array{created_from?: string, created_to?: string, assigned_to?: string}  $filters
     * @return array{rowLabels: array<int, string>, columnLabels: array<int, string>, cells: array<string, int>}
     */
    private function buildPivotData(string $module, string $xAxis, string $yAxis, array $filters, ?int $companyId, $user): array
    {
        $query = $module === 'follow_ups'
            ? $this->baseFollowUpsQuery($filters, $companyId, $user)
            : $this->baseDriversQuery($filters, $companyId, $user);

        $xSelect = $this->getSelectForField($module, $xAxis, 'x');
        $ySelect = $this->getSelectForField($module, $yAxis, 'y');
        if (! $xSelect || ! $ySelect) {
            return ['rowLabels' => [], 'columnLabels' => [], 'cells' => []];
        }

        $query = $this->applyJoinsForFields($query, $module, [$xSelect, $ySelect]);

        $rows = $query->clone()
            ->selectRaw($xSelect['select'].' as x_label, '.$ySelect['select'].' as y_label, COUNT(*) as cnt')
            ->groupBy('x_label', 'y_label')
            ->get();

        $rowLabels = $rows->pluck('x_label')->unique()->filter()->values()->map(fn ($v) => (string) $v)->sort()->values()->all();
        $columnLabels = $rows->pluck('y_label')->unique()->filter()->values()->map(fn ($v) => (string) $v)->sort()->values()->all();
        $cells = [];
        foreach ($rows as $r) {
            $key = (string) $r->x_label.'|'.(string) $r->y_label;
            $cells[$key] = (int) $r->cnt;
        }

        $totalLabel = 'Total';

        foreach ($rowLabels as $row) {
            $rowSum = 0;
            foreach ($columnLabels as $col) {
                $rowSum += $cells[$row.'|'.$col] ?? 0;
            }
            $cells[$row.'|'.$totalLabel] = $rowSum;
        }
        $columnLabels[] = $totalLabel;

        foreach ($columnLabels as $col) {
            $colSum = 0;
            foreach ($rowLabels as $row) {
                $colSum += $cells[$row.'|'.$col] ?? 0;
            }
            $cells[$totalLabel.'|'.$col] = $colSum;
        }
        $rowLabels[] = $totalLabel;

        return ['rowLabels' => array_values($rowLabels), 'columnLabels' => array_values($columnLabels), 'cells' => $cells];
    }

    /**
     * @param  array{created_from?: string, created_to?: string, assigned_to?: string}  $filters
     * @return array<int, array{label: string, value: int, legend?: string}>
     */
    private function buildChartData(string $module, string $xAxis, ?string $legend, array $filters, ?int $companyId, $user): array
    {
        $query = $module === 'follow_ups'
            ? $this->baseFollowUpsQuery($filters, $companyId, $user)
            : $this->baseDriversQuery($filters, $companyId, $user);

        $xSelect = $this->getSelectForField($module, $xAxis, 'x');
        if (! $xSelect) {
            return [];
        }

        $fields = [$xSelect];
        if ($legend) {
            $legSelect = $this->getSelectForField($module, $legend, 'leg');
            if ($legSelect) {
                $fields[] = $legSelect;
            }
        }
        $query = $this->applyJoinsForFields($query, $module, $fields);

        $groupSelect = $xSelect['select'].' as label, COUNT(*) as value';
        $groupBy = ['label'];
        if ($legend) {
            $legSelect = $this->getSelectForField($module, $legend, 'leg');
            if ($legSelect) {
                $groupSelect .= ', '.$legSelect['select'].' as legend';
                $groupBy[] = 'legend';
            }
        }

        $rows = $query->clone()
            ->selectRaw($groupSelect)
            ->groupBy($groupBy)
            ->get();

        $series = [];
        foreach ($rows as $r) {
            $item = ['label' => (string) ($r->label ?? '-'), 'value' => (int) $r->value];
            if (isset($r->legend)) {
                $item['legend'] = (string) $r->legend;
            }
            $series[] = $item;
        }
        return $series;
    }

    /**
     * @param  array<int, array{select: string, join: array}>  $fieldDefs
     */
    private function applyJoinsForFields(\Illuminate\Database\Eloquent\Builder $query, string $module, array $fieldDefs): \Illuminate\Database\Eloquent\Builder
    {
        $applied = [];
        foreach ($fieldDefs as $def) {
            foreach ($def['join'] ?? [] as $table => $on) {
                if (! isset($applied[$table])) {
                    $query->leftJoin(DB::raw($table), function ($j) use ($on) {
                        $j->whereRaw($on);
                    });
                    $applied[$table] = true;
                }
            }
        }
        return $query;
    }

    /**
     * @param  array{created_from?: string, created_to?: string, assigned_to?: string}  $filters
     */
    private function baseDriversQuery(array $filters, ?int $companyId, $user): \Illuminate\Database\Eloquent\Builder
    {
        $q = Driver::query();
        if ($companyId !== null) {
            $q->where('drivers.company_id', $companyId);
        }
        if (! empty($filters['created_from'])) {
            $q->whereDate('drivers.created_at', '>=', $filters['created_from']);
        }
        if (! empty($filters['created_to'])) {
            $q->whereDate('drivers.created_at', '<=', $filters['created_to']);
        }
        if (isset($filters['assigned_to']) && $filters['assigned_to'] === 'me') {
            $q->where('drivers.assigned_to', $user->id);
        }
        return $q;
    }

    /**
     * @param  array{created_from?: string, created_to?: string, assigned_to?: string}  $filters
     */
    private function baseFollowUpsQuery(array $filters, ?int $companyId, $user): \Illuminate\Database\Eloquent\Builder
    {
        $q = DriverFollowUp::query()->join('drivers', 'driver_follow_ups.driver_id', '=', 'drivers.id');
        if ($companyId !== null) {
            $q->where('drivers.company_id', $companyId);
        }
        if (! empty($filters['created_from'])) {
            $q->whereDate('driver_follow_ups.created_time', '>=', $filters['created_from']);
        }
        if (! empty($filters['created_to'])) {
            $q->whereDate('driver_follow_ups.created_time', '<=', $filters['created_to']);
        }
        if (isset($filters['assigned_to']) && $filters['assigned_to'] === 'me') {
            $q->where('driver_follow_ups.assigned_to', $user->id);
        }
        return $q;
    }

    /**
     * @return array{select: string, join: array}|null
     */
    private function getSelectForField(string $module, string $field, string $alias): ?array
    {
        if ($module === 'leads') {
            $drivers = 'drivers';
            $map = [
                'full_name' => ['select' => "COALESCE({$drivers}.full_name, '')", 'join' => []],
                'city' => ['select' => "COALESCE({$drivers}.city, '')", 'join' => []],
                'governorate' => ['select' => "COALESCE({$drivers}.governorate, '')", 'join' => []],
                'campaign' => ['select' => 'COALESCE(campaigns.name, \'(none)\')', 'join' => ['campaigns' => "{$drivers}.campaign_id = campaigns.id"]],
                'lead_source' => ['select' => 'COALESCE(lead_sources.name, \'(none)\')', 'join' => ['lead_sources' => "{$drivers}.lead_source_id = lead_sources.id"]],
                'assigned_to' => ['select' => 'COALESCE(assigned_user.name, \'(none)\')', 'join' => ['users as assigned_user' => "{$drivers}.assigned_to = assigned_user.id"]],
                'team_leader' => ['select' => 'COALESCE(team_leader_user.name, \'(none)\')', 'join' => ['users as team_leader_user' => "{$drivers}.team_leader_id = team_leader_user.id"]],
                'account_manager' => ['select' => 'COALESCE(account_manager_user.name, \'(none)\')', 'join' => ['users as account_manager_user' => "{$drivers}.account_manager_id = account_manager_user.id"]],
                'lead_status' => ['select' => 'COALESCE(lead_statuses.name, \'(none)\')', 'join' => ['lead_statuses' => "{$drivers}.lead_status_id = lead_statuses.id"]],
                'lead_stage' => ['select' => 'COALESCE(lead_stages.name, \'(none)\')', 'join' => ['lead_stages' => "{$drivers}.lead_stage_id = lead_stages.id"]],
                'riding_company' => ['select' => 'COALESCE(riding_companies.name, \'(none)\')', 'join' => ['riding_companies' => "{$drivers}.riding_company_id = riding_companies.id"]],
            ];
            $def = $map[$field] ?? null;
            if ($def) {
                return $def;
            }
        }
        if ($module === 'follow_ups') {
            $t = 'driver_follow_ups';
            $map = [
                'assigned_to' => ['select' => "COALESCE(assigned_user.name, '')", 'join' => ['users as assigned_user' => "{$t}.assigned_to = assigned_user.id"]],
                'user_name' => ['select' => "COALESCE({$t}.user_name, '')", 'join' => []],
                'team_leader' => ['select' => "COALESCE({$t}.team_leader, '')", 'join' => []],
                'account_manager' => ['select' => "COALESCE({$t}.account_manager, '')", 'join' => []],
                'lead_stage' => ['select' => "COALESCE({$t}.lead_stage, '')", 'join' => []],
                'lead_status' => ['select' => "COALESCE({$t}.lead_status, '')", 'join' => []],
                'created_time' => ['select' => "DATE_FORMAT({$t}.created_time, '%Y-%m-%d')", 'join' => []],
            ];
            $def = $map[$field] ?? null;
            if ($def) {
                return $def;
            }
        }
        return null;
    }

    public function edit(Report $report): Response
    {
        $user = Auth::user();
        if ($report->user_id !== $user->id) {
            abort(403);
        }

        $folders = $this->getFoldersForUser($report->company_id);

        return Inertia::render('Reports/Edit', [
            'report' => [
                'id' => $report->id,
                'report_name' => $report->report_name,
                'report_folder_id' => (string) $report->report_folder_id,
                'primary_module' => $report->primary_module,
                'related_modules' => $report->related_modules ?? [],
                'description' => $report->description ?? '',
                'share_report' => $report->share_report ?? ['all'],
                'report_type' => $report->report_type,
                'settings' => $report->settings ?? [],
            ],
            'folders' => $folders->map(fn ($f) => ['id' => (string) $f['id'], 'name' => $f['name']])->filter(fn ($f) => $f['id'] !== 'all' && $f['id'] !== 'shared')->values()->all(),
        ]);
    }

    public function update(Request $request, Report $report): RedirectResponse
    {
        $user = Auth::user();
        if ($report->user_id !== $user->id) {
            abort(403);
        }

        $validated = $request->validate([
            'report_name' => ['sometimes', 'string', 'max:255'],
            'report_folder_id' => ['sometimes', 'integer', 'exists:report_folders,id'],
            'primary_module' => ['sometimes', 'string', 'in:leads,follow_ups'],
            'related_modules' => ['nullable', 'array'],
            'description' => ['nullable', 'string', 'max:1000'],
            'share_report' => ['nullable', 'array'],
            'settings' => ['sometimes', 'array'],
        ]);

        $report->update($validated);

        return redirect()->route('reports.index')->with('success', 'Report updated successfully.');
    }

    public function destroy(Report $report): RedirectResponse
    {
        $user = Auth::user();
        if ($report->user_id !== $user->id) {
            abort(403);
        }
        $report->delete();

        return redirect()->back()->with('success', 'Report deleted.');
    }

    public function duplicate(Report $report): RedirectResponse
    {
        $user = Auth::user();
        $canAccess = $report->user_id === $user->id
            || in_array('all', $report->share_report ?? [], true)
            || in_array((string) $user->id, $report->share_report ?? [], true);
        if (! $canAccess) {
            abort(403);
        }

        $newReport = $report->replicate();
        $newReport->report_name = $report->report_name . ' (Copy)';
        $newReport->user_id = $user->id;
        $newReport->company_id = $this->getCompanyId();
        $newReport->save();

        return redirect()->route('reports.index')->with('success', 'Report duplicated.');
    }

    public function massDelete(Request $request): RedirectResponse
    {
        $ids = $request->validate(['ids' => ['required', 'array'], 'ids.*' => ['integer', 'exists:reports,id']])['ids'];
        $user = Auth::user();
        Report::whereIn('id', $ids)->where('user_id', $user->id)->delete();

        return redirect()->back()->with('success', count($ids) . ' report(s) deleted.');
    }
}
