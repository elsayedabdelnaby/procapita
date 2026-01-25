<?php

namespace Modules\Drivers\app\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Drivers\app\Http\Requests\LeadSourceStoreRequest;
use Modules\Drivers\app\Http\Requests\LeadSourceUpdateRequest;
use Modules\Drivers\app\Services\LeadSourceService;

class LeadSourceController extends Controller
{
    public function __construct(
        protected LeadSourceService $leadSourceService
    ) {}

    public function index(): Response
    {
        $leadSources = $this->leadSourceService->getAllLeadSources();
        
        // Get drivers count for each lead source
        $driversCounts = [];
        if (class_exists(\Modules\Drivers\app\Models\Driver::class)) {
            foreach ($leadSources as $leadSource) {
                $driversCounts[$leadSource->id] = \Modules\Drivers\app\Models\Driver::where('lead_source_id', $leadSource->id)->count();
            }
        }

        return Inertia::render('Drivers/LeadSources/Index', [
            'leadSources' => $leadSources,
            'driversCounts' => $driversCounts,
            'availableLeadSources' => $leadSources, // For transfer dropdown
        ]);
    }

    public function recycleBin(): Response
    {
        $leadSources = \Modules\Drivers\app\Models\LeadSource::onlyTrashed()
            ->orderBy('deleted_at', 'desc')
            ->get();
        
        // Get drivers count for each lead source
        $driversCounts = [];
        foreach ($leadSources as $leadSource) {
            $driversCounts[$leadSource->id] = \Modules\Drivers\app\Models\Driver::where('lead_source_id', $leadSource->id)->count();
        }

        return Inertia::render('Drivers/LeadSources/RecycleBin', [
            'leadSources' => $leadSources->map(fn($ls) => [
                'id' => $ls->id,
                'name' => $ls->name,
                'slug' => $ls->slug,
                'description' => $ls->description,
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
        return Inertia::render('Drivers/LeadSources/Create');
    }

    public function store(LeadSourceStoreRequest $request): RedirectResponse
    {
        try {
            $data = $request->validated();
            $data['active'] = $data['active'] ?? true;

            $this->leadSourceService->createLeadSource($data);

            return redirect()
                ->route('drivers.leadsources.index')
                ->with('success', 'Lead source created successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->withInput()
                ->with('error', $e->getMessage());
        }
    }

    public function show(int $leadSource): Response
    {
        $leadSourceModel = $this->leadSourceService->getLeadSourceById($leadSource);

        if (! $leadSourceModel) {
            abort(404, 'Lead source not found.');
        }

        // Load activity logs
        $activities = \Spatie\Activitylog\Models\Activity::forSubject($leadSourceModel)
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
            $driversCount = \Modules\Drivers\app\Models\Driver::where('lead_source_id', $leadSource)->count();
        }
        
        // Get available lead sources for transfer (exclude self)
        $availableLeadSources = $this->leadSourceService->getAllLeadSources()
            ->filter(fn($ls) => $ls->id !== $leadSourceModel->id);

        return Inertia::render('Drivers/LeadSources/Show', [
            'leadSource' => $leadSourceModel,
            'activities' => $activities,
            'driversCount' => $driversCount,
            'availableLeadSources' => $availableLeadSources,
        ]);
    }

    public function edit(int $leadSource): Response
    {
        $leadSourceModel = $this->leadSourceService->getLeadSourceById($leadSource);

        if (! $leadSourceModel) {
            abort(404, 'Lead source not found.');
        }

        return Inertia::render('Drivers/LeadSources/Edit', [
            'leadSource' => $leadSourceModel,
        ]);
    }

    public function update(LeadSourceUpdateRequest $request, int $leadSource): RedirectResponse
    {
        try {
            $this->leadSourceService->updateLeadSource($leadSource, $request->validated());

            return redirect()
                ->route('drivers.leadsources.index')
                ->with('success', 'Lead source updated successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->withInput()
                ->with('error', $e->getMessage());
        }
    }

    public function destroy(Request $request, int $leadSource): RedirectResponse
    {
        try {
            $leadSourceModel = $this->leadSourceService->getLeadSourceById($leadSource);
            
            if (! $leadSourceModel) {
                abort(404, 'Lead source not found.');
            }
            
            // Get drivers count
            $driversCount = 0;
            if (class_exists(\Modules\Drivers\app\Models\Driver::class)) {
                $driversCount = \Modules\Drivers\app\Models\Driver::where('lead_source_id', $leadSource)->count();
            }
            
            // Validate transfer_lead_source_id if drivers exist
            $transferLeadSourceId = $request->input('transfer_lead_source_id');
            if ($driversCount > 0) {
                $request->validate([
                    'transfer_lead_source_id' => [
                        'required',
                        'integer',
                        'exists:lead_sources,id',
                        function ($attribute, $value, $fail) use ($leadSourceModel) {
                            $transferLeadSource = \Modules\Drivers\app\Models\LeadSource::find($value);
                            if ($transferLeadSource && $transferLeadSource->id === $leadSourceModel->id) {
                                $fail('Cannot transfer to the same lead source.');
                            }
                        },
                    ],
                ]);
            }
            
            $this->leadSourceService->deleteLeadSource($leadSource, $transferLeadSourceId);

            return redirect()
                ->route('drivers.leadsources.index')
                ->with('success', 'Lead source deleted successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }

    public function toggleActive(int $leadSource): RedirectResponse
    {
        try {
            $this->leadSourceService->toggleActive($leadSource);

            return redirect()
                ->back()
                ->with('success', 'Lead source status updated successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }

    public function export(): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $leadSources = $this->leadSourceService->getAllLeadSources();

        $filename = 'lead_sources_export_' . date('Y-m-d_His') . '.csv';
        
        // Add UTF-8 BOM for Excel compatibility
        $content = "\xEF\xBB\xBF";
        
        // Open output stream
        $output = fopen('php://temp', 'r+');

        fputcsv($output, ['ID', 'Name', 'Slug', 'Description', 'Active', 'Created At']);

        foreach ($leadSources as $source) {
            fputcsv($output, [
                $source->id,
                $source->name,
                $source->slug,
                $source->description ?? '',
                $source->active ? 'Yes' : 'No',
                $source->created_at,
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
        return Inertia::render('Drivers/LeadSources/Import');
    }

    public function importStore(Request $request): RedirectResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt', 'max:10240'],
        ]);

        try {
            // TODO: Implement CSV import logic
            return redirect()
                ->route('drivers.leadsources.index')
                ->with('success', 'Lead sources imported successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }
}

