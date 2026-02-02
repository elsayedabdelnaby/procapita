<?php

namespace App\Http\Controllers;

use App\Models\DashboardWidget;
use App\Models\Report;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __construct(
        protected ReportController $reportController
    ) {}

    public function index(Request $request): Response
    {
        $user = Auth::user();

        $widgets = DashboardWidget::query()
            ->where('user_id', $user->id)
            ->with('report.reportFolder')
            ->orderBy('sort_order')
            ->get();

        $widgetsData = $widgets->map(function (DashboardWidget $w) use ($user) {
            $report = $w->report;
            $canAccess = $report->user_id === $w->user_id
                || ($report->company_id && $report->company_id === ($user->company_id ?? null))
                || in_array('all', $report->share_report ?? [], true)
                || in_array((string) $w->user_id, $report->share_report ?? [], true)
                || in_array($w->user_id, $report->share_report ?? [], true);
            if (! $canAccess) {
                return null;
            }
            $filters = $w->filters ?? [];
            $filters = [
                'created_from' => $filters['created_from'] ?? null,
                'created_to' => $filters['created_to'] ?? null,
                'assigned_to' => $filters['assigned_to'] ?? 'all',
            ];
            $data = $this->reportController->getReportDataForReport($report, $filters);

            return [
                'id' => $w->id,
                'report_id' => $report->id,
                'report' => [
                    'id' => $report->id,
                    'report_type' => $report->report_type,
                    'report_name' => $report->report_name,
                    'primary_module' => $report->primary_module,
                    'folder_name' => $report->reportFolder?->name ?? '',
                    'settings' => $report->settings,
                ],
                'filters' => $filters,
                'data' => $data,
                'sort_order' => $w->sort_order,
                'width' => $w->width,
                'height' => $w->height,
                'sort_mode' => $w->sort_mode,
            ];
        })->filter()->values()->all();

        return Inertia::render('dashboard', [
            'widgets' => $widgetsData,
        ]);
    }

    public function storeWidget(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'report_id' => ['required', 'integer', 'exists:reports,id'],
        ]);

        $user = Auth::user();
        $report = Report::findOrFail($validated['report_id']);

        $canAccess = $report->user_id === $user->id
            || in_array('all', $report->share_report ?? [], true)
            || in_array((string) $user->id, $report->share_report ?? [], true)
            || in_array($user->id, $report->share_report ?? [], true);
        if (! $canAccess) {
            abort(403);
        }

        $maxOrder = DashboardWidget::where('user_id', $user->id)->max('sort_order') ?? -1;

        DashboardWidget::firstOrCreate(
            [
                'user_id' => $user->id,
                'report_id' => $report->id,
            ],
            [
                'sort_order' => $maxOrder + 1,
                'width' => 400,
                'height' => 300,
                'filters' => [],
            ]
        );

        return redirect()->route('dashboard')->with('success', 'Report pinned to dashboard.');
    }

    public function destroyWidget(Report $report): RedirectResponse
    {
        $user = Auth::user();
        DashboardWidget::where('user_id', $user->id)->where('report_id', $report->id)->delete();

        return redirect()->route('dashboard')->with('success', 'Report unpinned.');
    }

    public function updateWidgets(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'widgets' => ['required', 'array'],
            'widgets.*.id' => ['required', 'integer', 'exists:dashboard_widgets,id'],
            'widgets.*.sort_order' => ['sometimes', 'integer', 'min:0'],
            'widgets.*.width' => ['sometimes', 'integer', 'min:200'],
            'widgets.*.height' => ['sometimes', 'integer', 'min:200'],
            'widgets.*.filters' => ['sometimes', 'array'],
            'widgets.*.filters.created_from' => ['nullable', 'string'],
            'widgets.*.filters.created_to' => ['nullable', 'string'],
            'widgets.*.filters.assigned_to' => ['nullable', 'string', 'in:all,me'],
            'widgets.*.sort_mode' => ['nullable', 'string', 'in:label_asc,label_desc,value_asc,value_desc'],
        ]);

        $user = Auth::user();

        foreach ($validated['widgets'] as $item) {
            $w = DashboardWidget::where('id', $item['id'])->where('user_id', $user->id)->first();
            if ($w) {
                if (isset($item['sort_order'])) {
                    $w->sort_order = $item['sort_order'];
                }
                if (isset($item['width'])) {
                    $w->width = $item['width'];
                }
                if (isset($item['height'])) {
                    $w->height = $item['height'];
                }
                if (array_key_exists('filters', $item)) {
                    $w->filters = $item['filters'] ?? [];
                }
                if (array_key_exists('sort_mode', $item)) {
                    $w->sort_mode = $item['sort_mode'];
                }
                $w->save();
            }
        }

        return redirect()->route('dashboard')->with('success', 'Dashboard updated.');
    }
}
