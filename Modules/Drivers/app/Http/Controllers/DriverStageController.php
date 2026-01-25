<?php

namespace Modules\Drivers\app\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Drivers\app\Http\Requests\DriverStageStoreRequest;
use Modules\Drivers\app\Http\Requests\DriverStageUpdateRequest;
use Modules\Drivers\app\Models\Driver;
use Modules\Drivers\app\Services\DriverStageService;
use Modules\RidingCarCompanies\app\Models\RidingCompany;

class DriverStageController extends Controller
{
    public function __construct(
        protected DriverStageService $driverStageService
    ) {}

    public function index(): Response
    {
        $companyId = $this->getCompanyId();
        $driverStages = $this->driverStageService->getAllDriverStages(null, $companyId);

        // Map driver stages to include riding companies
        $driverStagesData = $driverStages->map(function ($stage) {
            $stageData = $stage->toArray();
            
            // Get riding companies from riding_company_ids or riding_company_id
            $ridingCompanyIds = $stage->riding_company_ids ?? [];
            if (empty($ridingCompanyIds) && $stage->riding_company_id) {
                $ridingCompanyIds = [$stage->riding_company_id];
            }
            
            if (!empty($ridingCompanyIds)) {
                $ridingCompanies = RidingCompany::whereIn('id', $ridingCompanyIds)->get(['id', 'name']);
                $stageData['riding_companies'] = $ridingCompanies->toArray();
            } else {
                $stageData['riding_companies'] = [];
            }
            
            return $stageData;
        });

        return Inertia::render('Drivers/DriverStages/Index', [
            'driverStages' => $driverStagesData,
        ]);
    }

    public function recycleBin(): Response
    {
        $companyId = $this->getCompanyId();
        
        $query = \Modules\Drivers\app\Models\DriverStage::onlyTrashed()->whereNull('driver_id');

        // Filter by company if applicable
        if ($companyId) {
            // Get riding company IDs for this company
            $ridingCompanyIds = \Modules\RidingCarCompanies\app\Models\RidingCompany::where('company_id', $companyId)->pluck('id')->toArray();
            
            if (!empty($ridingCompanyIds)) {
                $hasRidingCompanyIds = \Illuminate\Support\Facades\Schema::hasColumn('driver_stages', 'riding_company_ids');
                $hasRidingCompanyId = \Illuminate\Support\Facades\Schema::hasColumn('driver_stages', 'riding_company_id');
                
                $query->where(function ($q) use ($ridingCompanyIds, $hasRidingCompanyIds, $hasRidingCompanyId) {
                    if ($hasRidingCompanyIds) {
                        foreach ($ridingCompanyIds as $rcId) {
                            $q->orWhereJsonContains('riding_company_ids', $rcId);
                        }
                    }
                    if ($hasRidingCompanyId) {
                        $q->orWhereIn('riding_company_id', $ridingCompanyIds);
                    }
                });
            } else {
                $query->whereRaw('1 = 0');
            }
        }

        $driverStages = $query->orderBy('deleted_at', 'desc')->get();

        // Map driver stages to include riding companies
        $driverStagesData = $driverStages->map(function ($stage) {
            $stageData = $stage->toArray();
            
            // Get riding companies from riding_company_ids or riding_company_id
            $ridingCompanyIds = $stage->riding_company_ids ?? [];
            if (empty($ridingCompanyIds) && $stage->riding_company_id) {
                $ridingCompanyIds = [$stage->riding_company_id];
            }
            
            if (!empty($ridingCompanyIds)) {
                $ridingCompanies = \Modules\RidingCarCompanies\app\Models\RidingCompany::whereIn('id', $ridingCompanyIds)->get(['id', 'name']);
                $stageData['riding_companies'] = $ridingCompanies->toArray();
            } else {
                $stageData['riding_companies'] = [];
            }
            
            return $stageData;
        });

        return Inertia::render('Drivers/DriverStages/RecycleBin', [
            'driverStages' => $driverStagesData,
        ]);
    }

    public function create(): Response
    {
        $user = Auth::user();
        $companyId = $this->getCompanyId();

        $ridingCompanies = RidingCompany::when($companyId, function ($q) use ($companyId) {
            $q->where('company_id', $companyId);
        })->orderBy('name')->get();

        return Inertia::render('Drivers/DriverStages/Create', [
            'ridingCompanies' => $ridingCompanies,
        ]);
    }

    public function store(DriverStageStoreRequest $request): RedirectResponse
    {
        try {
            $data = $request->validated();
            $data['status'] = $data['status'] ?? 'pending';

            $this->driverStageService->createDriverStage($data);

            return redirect()
                ->route('drivers.driverstages.index')
                ->with('success', 'Driver stage created successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->withInput()
                ->with('error', $e->getMessage());
        }
    }

    public function show(int $driverStage): Response
    {
        $driverStageModel = $this->driverStageService->getDriverStageById($driverStage);

        if (! $driverStageModel) {
            abort(404, 'Driver stage not found.');
        }

        // Load activity logs
        $activities = \Spatie\Activitylog\Models\Activity::forSubject($driverStageModel)
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

        return Inertia::render('Drivers/DriverStages/Show', [
            'driverStage' => $driverStageModel,
            'activities' => $activities,
        ]);
    }

    public function edit(int $driverStage): Response
    {
        $driverStageModel = $this->driverStageService->getDriverStageById($driverStage);

        if (! $driverStageModel) {
            abort(404, 'Driver stage not found.');
        }

        $user = Auth::user();
        $companyId = $this->getCompanyId();

        $ridingCompanies = RidingCompany::when($companyId, function ($q) use ($companyId) {
            $q->where('company_id', $companyId);
        })->orderBy('name')->get();

        // Prepare driver stage data with riding_company_ids
        $driverStageData = $driverStageModel->toArray();
        if ($driverStageModel->riding_company_id) {
            $driverStageData['riding_company_ids'] = [$driverStageModel->riding_company_id];
        }

        return Inertia::render('Drivers/DriverStages/Edit', [
            'driverStage' => $driverStageData,
            'ridingCompanies' => $ridingCompanies,
        ]);
    }

    public function update(DriverStageUpdateRequest $request, int $driverStage): RedirectResponse
    {
        try {
            $this->driverStageService->updateDriverStage($driverStage, $request->validated());

            return redirect()
                ->route('drivers.driverstages.index')
                ->with('success', 'Driver stage updated successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->withInput()
                ->with('error', $e->getMessage());
        }
    }

    public function destroy(int $driverStage): RedirectResponse
    {
        try {
            $this->driverStageService->deleteDriverStage($driverStage);

            return redirect()
                ->route('drivers.driverstages.index')
                ->with('success', 'Driver stage deleted successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }

    public function complete(int $driverStage): RedirectResponse
    {
        try {
            $this->driverStageService->completeStage($driverStage);

            return redirect()
                ->back()
                ->with('success', 'Stage marked as completed.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }

    public function reject(Request $request, int $driverStage): RedirectResponse
    {
        $request->validate([
            'notes' => ['nullable', 'string'],
        ]);

        try {
            $this->driverStageService->rejectStage($driverStage, $request->notes);

            return redirect()
                ->back()
                ->with('success', 'Stage rejected.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }

    public function export(): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $companyId = $this->getCompanyId();
        $driverStages = $this->driverStageService->getAllDriverStages(null, $companyId);

        $filename = 'driver_stages_export_'.date('Y-m-d_His').'.csv';

        // Add UTF-8 BOM for Excel compatibility
        $content = "\xEF\xBB\xBF";

        // Open output stream
        $output = fopen('php://temp', 'r+');

        fputcsv($output, ['ID', 'Driver', 'Riding Company', 'Order', 'Status', 'Completed At', 'Created At']);

        foreach ($driverStages as $stage) {
            fputcsv($output, [
                $stage->id,
                $stage->driver?->full_name ?? '',
                $stage->ridingCompany?->name ?? '',
                $stage->stage_order,
                $stage->status,
                $stage->completed_at ?? '',
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
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);

        // Prevent Inertia from processing this response
        $response->headers->remove('X-Inertia');
        $response->headers->set('X-Inertia', 'false');
        $response->headers->set('Cache-Control', 'no-cache, must-revalidate');
        $response->headers->set('Pragma', 'no-cache');
        $response->headers->set('Expires', '0');

        return $response;
    }

    protected function getCompanyId(): ?int
    {
        $user = Auth::user();
        if ($user && $user->is_super_admin) {
            return null; // Super admin can see all
        }
        return $user?->company_id;
    }
}
