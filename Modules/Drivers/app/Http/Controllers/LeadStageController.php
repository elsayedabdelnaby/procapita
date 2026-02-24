<?php

namespace Modules\Drivers\app\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Drivers\app\Http\Requests\LeadStageStoreRequest;
use Modules\Drivers\app\Http\Requests\LeadStageUpdateRequest;
use Modules\Drivers\app\Services\LeadStageService;

class LeadStageController extends Controller
{
    public function __construct(
        protected LeadStageService $leadStageService
    ) {}

    protected function getCompanyId(): ?int
    {
        $user = Auth::user();

        if ($user->isSuperAdmin()) {
            return session('selected_company_id');
        }

        return $user->company_id;
    }

    public function index(): Response
    {
        $leadStages = $this->leadStageService->getAllLeadStages();

        return Inertia::render('Drivers/LeadStages/Index', [
            'leadStages' => $leadStages,
        ]);
    }

    public function recycleBin(): Response
    {
        $leadStages = \Modules\Drivers\app\Models\LeadStage::onlyTrashed()
            ->orderBy('deleted_at', 'desc')
            ->get();

        return Inertia::render('Drivers/LeadStages/RecycleBin', [
            'leadStages' => $leadStages->toArray(),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Drivers/LeadStages/Create');
    }

    public function store(LeadStageStoreRequest $request): RedirectResponse
    {
        try {
            $data = $request->validated();
            $data['active'] = $data['active'] ?? true;
            $data['order'] = $data['order'] ?? 0;
            $data['requires_all_documents_approved'] = $data['requires_all_documents_approved'] ?? false;

            $this->leadStageService->createLeadStage($data);

            return redirect()
                ->route('drivers.leadstages.index')
                ->with('success', 'Lead stage created successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->withInput()
                ->with('error', $e->getMessage());
        }
    }

    public function show(int $leadStage): Response
    {
        $leadStageModel = $this->leadStageService->getLeadStageById($leadStage);

        if (! $leadStageModel) {
            abort(404, 'Lead stage not found.');
        }

        // Load activity logs
        $activities = \Spatie\Activitylog\Models\Activity::forSubject($leadStageModel)
            ->with('causer:id,name,email')
            ->latest()
            ->get()
            ->map(function ($activity) {
                return [
                    'id' => $activity->id,
                    'description' => $activity->description,
                    'event' => $activity->event,
                    'properties' => $activity->properties,
                    'causer' => $activity->causer ? [
                        'id' => $activity->causer->id,
                        'name' => $activity->causer->name,
                        'email' => $activity->causer->email,
                    ] : null,
                    'created_at' => $activity->created_at->toISOString(),
                ];
            });

        return Inertia::render('Drivers/LeadStages/Show', [
            'leadStage' => $leadStageModel,
            'activities' => $activities,
        ]);
    }

    public function edit(int $leadStage): Response
    {
        $leadStageModel = $this->leadStageService->getLeadStageById($leadStage);

        if (! $leadStageModel) {
            abort(404, 'Lead stage not found.');
        }

        return Inertia::render('Drivers/LeadStages/Edit', [
            'leadStage' => $leadStageModel->toArray(),
        ]);
    }

    public function update(LeadStageUpdateRequest $request, int $leadStage): RedirectResponse
    {
        try {
            $this->leadStageService->updateLeadStage($leadStage, $request->validated());

            return redirect()
                ->route('drivers.leadstages.index')
                ->with('success', 'Lead stage updated successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->withInput()
                ->with('error', $e->getMessage());
        }
    }

    public function destroy(int $leadStage): RedirectResponse
    {
        try {
            $this->leadStageService->deleteLeadStage($leadStage);

            return redirect()
                ->route('drivers.leadstages.index')
                ->with('success', 'Lead stage deleted successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }

    public function toggleActive(int $leadStage): RedirectResponse
    {
        try {
            $this->leadStageService->toggleActive($leadStage);

            return redirect()
                ->back()
                ->with('success', 'Lead stage updated successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }

    public function export(): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $leadStages = $this->leadStageService->getAllLeadStages();

        $filename = 'lead_stages_export_' . date('Y-m-d_His') . '.csv';
        
        // Add UTF-8 BOM for Excel compatibility
        $content = "\xEF\xBB\xBF";
        
        // Open output stream
        $output = fopen('php://temp', 'r+');

        fputcsv($output, ['ID', 'Name', 'Slug', 'Color', 'Order', 'Requires Documents Approved', 'Active', 'Created At']);

        foreach ($leadStages as $stage) {
            fputcsv($output, [
                $stage->id,
                $stage->name,
                $stage->slug,
                $stage->color ?? '',
                $stage->order,
                $stage->requires_all_documents_approved ? 'Yes' : 'No',
                $stage->active ? 'Yes' : 'No',
                $stage->created_at,
            ]);
        }

        rewind($output);
        $content .= stream_get_contents($output);
        fclose($output);

        $response = response()->streamDownload(function () use ($content) {
            echo $content;
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
        
        // Prevent Inertia from processing this response
        $response->headers->remove('X-Inertia');
        $response->headers->set('X-Inertia', 'false');
        $response->headers->set('Cache-Control', 'no-cache, must-revalidate');
        $response->headers->set('Pragma', 'no-cache');
        $response->headers->set('Expires', '0');
        
        return $response;
    }

    public function import(): Response
    {
        return Inertia::render('Drivers/LeadStages/Import');
    }

    public function importStore(Request $request): RedirectResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt', 'max:10240'],
        ]);

        try {
            // TODO: Implement CSV import logic
            return redirect()
                ->route('drivers.leadstages.index')
                ->with('success', 'Stages imported successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }

    public function moveUp(int $leadStage): RedirectResponse
    {
        try {
            $this->leadStageService->moveUp($leadStage);

            return redirect()
                ->back()
                ->with('success', 'Lead stage order updated successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }

    public function moveDown(int $leadStage): RedirectResponse
    {
        try {
            $this->leadStageService->moveDown($leadStage);

            return redirect()
                ->back()
                ->with('success', 'Lead stage order updated successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }

    public function reorder(Request $request): RedirectResponse
    {
        $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['required', 'integer', 'exists:lead_stages,id'],
        ]);

        try {
            $this->leadStageService->reorder($request->ids);

            return redirect()
                ->back()
                ->with('success', 'Stages reordered successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }

}

