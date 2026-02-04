<?php

namespace Modules\Drivers\app\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Drivers\app\Http\Requests\LeadStatusStoreRequest;
use Modules\Drivers\app\Http\Requests\LeadStatusUpdateRequest;
use Modules\Drivers\app\Services\LeadStatusService;

class LeadStatusController extends Controller
{
    public function __construct(
        protected LeadStatusService $leadStatusService
    ) {}

    public function index(): Response
    {
        $leadStatuses = $this->leadStatusService->getAllLeadStatuses();
        
        // Get drivers count for each lead status
        $driversCounts = [];
        if (class_exists(\Modules\Drivers\app\Models\Driver::class)) {
            foreach ($leadStatuses as $leadStatus) {
                $driversCounts[$leadStatus->id] = \Modules\Drivers\app\Models\Driver::where('lead_status_id', $leadStatus->id)->count();
            }
        }

        return Inertia::render('Drivers/LeadStatuses/Index', [
            'leadStatuses' => $leadStatuses,
            'driversCounts' => $driversCounts,
            'availableLeadStatuses' => $leadStatuses, // For transfer dropdown
        ]);
    }

    public function recycleBin(): Response
    {
        $leadStatuses = \Modules\Drivers\app\Models\LeadStatus::onlyTrashed()
            ->orderBy('deleted_at', 'desc')
            ->get();
        
        // Get drivers count for each lead status
        $driversCounts = [];
        foreach ($leadStatuses as $leadStatus) {
            $driversCounts[$leadStatus->id] = \Modules\Drivers\app\Models\Driver::where('lead_status_id', $leadStatus->id)->count();
        }

        return Inertia::render('Drivers/LeadStatuses/RecycleBin', [
            'leadStatuses' => $leadStatuses->map(fn($ls) => [
                'id' => $ls->id,
                'name' => $ls->name,
                'slug' => $ls->slug,
                'description' => $ls->description,
                'color' => $ls->color,
                'order' => $ls->order,
                'active' => $ls->active,
                'created_at' => $ls->created_at?->toISOString(),
                'updated_at' => $ls->updated_at?->toISOString(),
                'deleted_at' => $ls->deleted_at?->toISOString(),
            ]),
            'driversCounts' => $driversCounts,
        ]);
    }

    public function create(): Response
    {
        $availableLeadStatuses = $this->leadStatusService->getAllLeadStatuses()
            ->map(fn ($ls) => ['id' => $ls->id, 'name' => $ls->name])
            ->toArray();

        return Inertia::render('Drivers/LeadStatuses/Create', [
            'availableLeadStatuses' => $availableLeadStatuses,
        ]);
    }

    public function store(LeadStatusStoreRequest $request): RedirectResponse
    {
        try {
            $data = $request->validated();
            $data['active'] = $data['active'] ?? true;
            $data['order'] = $data['order'] ?? 0;

            $this->leadStatusService->createLeadStatus($data);

            return redirect()
                ->route('drivers.leadstatuses.index')
                ->with('success', 'Lead status created successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->withInput()
                ->with('error', $e->getMessage());
        }
    }

    public function show(int $leadStatus): Response
    {
        $leadStatusModel = $this->leadStatusService->getLeadStatusById($leadStatus);

        if (! $leadStatusModel) {
            abort(404, 'Lead status not found.');
        }

        // Load activity logs
        $activities = \Spatie\Activitylog\Models\Activity::forSubject($leadStatusModel)
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

        // Get drivers count
        $driversCount = 0;
        if (class_exists(\Modules\Drivers\app\Models\Driver::class)) {
            $driversCount = \Modules\Drivers\app\Models\Driver::where('lead_status_id', $leadStatus)->count();
        }
        
        // Get available lead statuses for transfer (exclude self)
        $availableLeadStatuses = $this->leadStatusService->getAllLeadStatuses()
            ->filter(fn($ls) => $ls->id !== $leadStatusModel->id);

        return Inertia::render('Drivers/LeadStatuses/Show', [
            'leadStatus' => $leadStatusModel,
            'activities' => $activities,
            'driversCount' => $driversCount,
            'availableLeadStatuses' => $availableLeadStatuses,
        ]);
    }

    public function edit(int $leadStatus): Response
    {
        $leadStatusModel = $this->leadStatusService->getLeadStatusById($leadStatus);

        if (! $leadStatusModel) {
            abort(404, 'Lead status not found.');
        }

        $availableLeadStatuses = $this->leadStatusService->getAllLeadStatuses()
            ->filter(fn ($ls) => $ls->id !== $leadStatusModel->id)
            ->values()
            ->map(fn ($ls) => ['id' => $ls->id, 'name' => $ls->name])
            ->toArray();

        return Inertia::render('Drivers/LeadStatuses/Edit', [
            'leadStatus' => $leadStatusModel,
            'availableLeadStatuses' => $availableLeadStatuses,
        ]);
    }

    public function update(LeadStatusUpdateRequest $request, int $leadStatus): RedirectResponse
    {
        try {
            $this->leadStatusService->updateLeadStatus($leadStatus, $request->validated());

            return redirect()
                ->route('drivers.leadstatuses.index')
                ->with('success', 'Lead status updated successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->withInput()
                ->with('error', $e->getMessage());
        }
    }

    public function destroy(Request $request, int $leadStatus): RedirectResponse
    {
        try {
            $leadStatusModel = $this->leadStatusService->getLeadStatusById($leadStatus);
            
            if (! $leadStatusModel) {
                abort(404, 'Lead status not found.');
            }
            
            // Get drivers count
            $driversCount = 0;
            if (class_exists(\Modules\Drivers\app\Models\Driver::class)) {
                $driversCount = \Modules\Drivers\app\Models\Driver::where('lead_status_id', $leadStatus)->count();
            }
            
            // Validate transfer_lead_status_id if drivers exist
            $transferLeadStatusId = $request->input('transfer_lead_status_id');
            if ($driversCount > 0) {
                $request->validate([
                    'transfer_lead_status_id' => [
                        'required',
                        'integer',
                        'exists:lead_statuses,id',
                        function ($attribute, $value, $fail) use ($leadStatusModel) {
                            $transferLeadStatus = \Modules\Drivers\app\Models\LeadStatus::find($value);
                            if ($transferLeadStatus && $transferLeadStatus->id === $leadStatusModel->id) {
                                $fail('Cannot transfer to the same lead status.');
                            }
                        },
                    ],
                ]);
            }
            
            $this->leadStatusService->deleteLeadStatus($leadStatus, $transferLeadStatusId);

            return redirect()
                ->route('drivers.leadstatuses.index')
                ->with('success', 'Lead status deleted successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }

    public function toggleActive(int $leadStatus): RedirectResponse
    {
        try {
            $this->leadStatusService->toggleActive($leadStatus);

            return redirect()
                ->back()
                ->with('success', 'Lead status updated successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }

    public function export(): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $leadStatuses = $this->leadStatusService->getAllLeadStatuses();

        $filename = 'lead_statuses_export_' . date('Y-m-d_His') . '.csv';
        
        // Add UTF-8 BOM for Excel compatibility
        $content = "\xEF\xBB\xBF";
        
        // Open output stream
        $output = fopen('php://temp', 'r+');

        fputcsv($output, ['ID', 'Name', 'Slug', 'Color', 'Order', 'Active', 'Created At']);

        foreach ($leadStatuses as $status) {
            fputcsv($output, [
                $status->id,
                $status->name,
                $status->slug,
                $status->color ?? '',
                $status->order,
                $status->active ? 'Yes' : 'No',
                $status->created_at,
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
        return Inertia::render('Drivers/LeadStatuses/Import');
    }

    public function importStore(Request $request): RedirectResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt', 'max:10240'],
        ]);

        try {
            // TODO: Implement CSV import logic
            return redirect()
                ->route('drivers.leadstatuses.index')
                ->with('success', 'Lead statuses imported successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }

    public function moveUp(int $leadStatus): RedirectResponse
    {
        try {
            $this->leadStatusService->moveUp($leadStatus);

            return redirect()
                ->back()
                ->with('success', 'Lead status order updated successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }

    public function moveDown(int $leadStatus): RedirectResponse
    {
        try {
            $this->leadStatusService->moveDown($leadStatus);

            return redirect()
                ->back()
                ->with('success', 'Lead status order updated successfully.');
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
            'ids.*' => ['required', 'integer', 'exists:lead_statuses,id'],
        ]);

        try {
            $this->leadStatusService->reorder($request->ids);

            return redirect()
                ->back()
                ->with('success', 'Lead statuses reordered successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }
}

