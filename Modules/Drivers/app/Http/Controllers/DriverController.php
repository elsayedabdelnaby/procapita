<?php

namespace Modules\Drivers\app\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Core\app\Models\Company;
use Modules\Drivers\app\Http\Requests\DriverStoreRequest;
use Modules\Drivers\app\Http\Requests\DriverUpdateRequest;
use Modules\Drivers\app\Services\DriverService;
use Modules\Drivers\app\Models\LeadSource;
use Modules\Drivers\app\Models\LeadStatus;
use Modules\Marketing\app\Models\Campaign;
use Modules\RidingCarCompanies\app\Models\RidingCompany;
use App\Models\User;

class DriverController extends Controller
{
    public function __construct(
        protected DriverService $driverService
    ) {}

    public function index(): Response
    {
        $user = Auth::user();
        $companyId = $user->isSuperAdmin() ? null : $user->company_id;

        $drivers = $this->driverService->getAllDrivers($companyId);

        return Inertia::render('Drivers/Drivers/Index', [
            'drivers' => $drivers->map(fn($driver) => [
                'id' => $driver->id,
                'uuid' => $driver->uuid,
                'company_id' => $driver->company_id,
                'full_name' => $driver->full_name,
                'phone' => $driver->phone,
                'whatsapp_phone' => $driver->whatsapp_phone,
                'email' => $driver->email,
                'riding_company' => $driver->ridingCompany ? [
                    'id' => $driver->ridingCompany->id,
                    'name' => $driver->ridingCompany->name,
                ] : null,
                'campaign' => $driver->campaign ? [
                    'id' => $driver->campaign->id,
                    'name' => $driver->campaign->name,
                ] : null,
                'lead_source' => $driver->leadSource ? [
                    'id' => $driver->leadSource->id,
                    'name' => $driver->leadSource->name,
                ] : null,
                'assigned_to' => $driver->assignedTo ? [
                    'id' => $driver->assignedTo->id,
                    'name' => $driver->assignedTo->name,
                ] : null,
                'lead_status' => $driver->leadStatus ? [
                    'id' => $driver->leadStatus->id,
                    'name' => $driver->leadStatus->name,
                    'color' => $driver->leadStatus->color,
                ] : null,
                'created_at' => $driver->created_at,
                'updated_at' => $driver->updated_at,
            ]),
        ]);
    }

    public function create(): Response
    {
        $user = Auth::user();
        $companyId = $user->isSuperAdmin() ? null : $user->company_id;

        $companies = $user->isSuperAdmin() ? Company::active()->orderBy('name')->get() : null;
        // Only load riding companies if not super admin (for super admin, they'll be loaded dynamically)
        $ridingCompanies = $user->isSuperAdmin() ? [] : RidingCompany::when($companyId, fn($q) => $q->where('company_id', $companyId))->active()->orderBy('name')->get();
        $campaigns = Campaign::when($companyId, fn($q) => $q->where('company_id', $companyId))->orderBy('name')->get();
        $leadSources = LeadSource::when($companyId, fn($q) => $q->where('company_id', $companyId))->active()->orderBy('name')->get();
        $leadStatuses = LeadStatus::when($companyId, fn($q) => $q->where('company_id', $companyId))->active()->ordered()->get();
        $users = User::when($companyId, fn($q) => $q->where('company_id', $companyId))->orderBy('name')->get();

        return Inertia::render('Drivers/Drivers/Create', [
            'companies' => $companies,
            'ridingCompanies' => $ridingCompanies,
            'campaigns' => $campaigns,
            'leadSources' => $leadSources,
            'leadStatuses' => $leadStatuses,
            'users' => $users,
        ]);
    }

    public function store(DriverStoreRequest $request): RedirectResponse
    {
        try {
            $data = $request->validated();
            $user = Auth::user();

            if (! $user->isSuperAdmin()) {
                $data['company_id'] = $user->company_id;
            }

            $this->driverService->createDriver($data);

            return redirect()
                ->route('drivers.drivers.index')
                ->with('success', 'Driver created successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->withInput()
                ->with('error', $e->getMessage());
        }
    }

    public function show(int $driver): Response
    {
        $driverModel = $this->driverService->getDriverById($driver);

        if (! $driverModel) {
            abort(404, 'Driver not found.');
        }

        $stagesProgress = $driverModel->getStagesProgress();
        $stagesStatus = $driverModel->getStagesStatus();
        $nextStage = $driverModel->getNextStage();

        return Inertia::render('Drivers/Drivers/Show', [
            'driver' => [
                'id' => $driverModel->id,
                'uuid' => $driverModel->uuid,
                'company_id' => $driverModel->company_id,
                'full_name' => $driverModel->full_name,
                'phone' => $driverModel->phone,
                'whatsapp_phone' => $driverModel->whatsapp_phone,
                'email' => $driverModel->email,
                'riding_company' => $driverModel->ridingCompany ? [
                    'id' => $driverModel->ridingCompany->id,
                    'name' => $driverModel->ridingCompany->name,
                ] : null,
                'campaign' => $driverModel->campaign ? [
                    'id' => $driverModel->campaign->id,
                    'name' => $driverModel->campaign->name,
                ] : null,
                'lead_source' => $driverModel->leadSource ? [
                    'id' => $driverModel->leadSource->id,
                    'name' => $driverModel->leadSource->name,
                ] : null,
                'assigned_to' => $driverModel->assignedTo ? [
                    'id' => $driverModel->assignedTo->id,
                    'name' => $driverModel->assignedTo->name,
                ] : null,
                'lead_status' => $driverModel->leadStatus ? [
                    'id' => $driverModel->leadStatus->id,
                    'name' => $driverModel->leadStatus->name,
                    'color' => $driverModel->leadStatus->color,
                ] : null,
                'current_stage' => $driverModel->currentStage ? [
                    'id' => $driverModel->currentStage->id,
                    'name' => $driverModel->currentStage->name,
                ] : null,
                'notes' => $driverModel->notes,
                'stages_progress' => $stagesProgress,
                'stages_status' => $stagesStatus,
                'next_stage' => $nextStage ? [
                    'id' => $nextStage->id,
                    'name' => $nextStage->name,
                    'order' => $nextStage->order,
                ] : null,
                'has_completed_all_stages' => $driverModel->hasCompletedAllStages(),
                'stages' => $driverModel->stages->map(fn($stage) => [
                    'id' => $stage->id,
                    'stage_template' => $stage->stageTemplate ? [
                        'id' => $stage->stageTemplate->id,
                        'name' => $stage->stageTemplate->name,
                    ] : null,
                    'status' => $stage->status,
                    'completed_at' => $stage->completed_at,
                ]),
                'documents' => $driverModel->documents->map(fn($doc) => [
                    'id' => $doc->id,
                    'document_template' => $doc->documentTemplate ? [
                        'id' => $doc->documentTemplate->id,
                        'name' => $doc->documentTemplate->name,
                        'type' => $doc->documentTemplate->type,
                    ] : null,
                    'status' => $doc->status,
                    'uploaded_path' => $doc->uploaded_path,
                ]),
                'created_at' => $driverModel->created_at,
                'updated_at' => $driverModel->updated_at,
            ],
        ]);
    }

    public function edit(int $driver): Response
    {
        $driverModel = $this->driverService->getDriverById($driver);

        if (! $driverModel) {
            abort(404, 'Driver not found.');
        }

        $user = Auth::user();
        $companyId = $user->isSuperAdmin() ? null : $user->company_id;

        $companies = $user->isSuperAdmin() ? Company::active()->orderBy('name')->get() : null;
        $ridingCompanies = RidingCompany::when($companyId, fn($q) => $q->where('company_id', $companyId))->active()->orderBy('name')->get();
        $campaigns = Campaign::when($companyId, fn($q) => $q->where('company_id', $companyId))->orderBy('name')->get();
        $leadSources = LeadSource::when($companyId, fn($q) => $q->where('company_id', $companyId))->active()->orderBy('name')->get();
        $leadStatuses = LeadStatus::when($companyId, fn($q) => $q->where('company_id', $companyId))->active()->ordered()->get();
        $users = User::when($companyId, fn($q) => $q->where('company_id', $companyId))->orderBy('name')->get();

        return Inertia::render('Drivers/Drivers/Edit', [
            'driver' => $driverModel,
            'companies' => $companies,
            'ridingCompanies' => $ridingCompanies,
            'campaigns' => $campaigns,
            'leadSources' => $leadSources,
            'leadStatuses' => $leadStatuses,
            'users' => $users,
        ]);
    }

    public function update(DriverUpdateRequest $request, int $driver): RedirectResponse
    {
        try {
            $data = $request->validated();
            $user = Auth::user();

            if (! $user->isSuperAdmin()) {
                $data['company_id'] = $user->company_id;
            }

            $this->driverService->updateDriver($driver, $data);

            return redirect()
                ->route('drivers.drivers.index')
                ->with('success', 'Driver updated successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->withInput()
                ->with('error', $e->getMessage());
        }
    }

    public function destroy(int $driver): RedirectResponse
    {
        try {
            $this->driverService->deleteDriver($driver);

            return redirect()
                ->route('drivers.drivers.index')
                ->with('success', 'Driver deleted successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }

    public function assign(Request $request, int $driver): RedirectResponse
    {
        $request->validate([
            'user_id' => ['required', 'exists:users,id'],
        ]);

        try {
            $this->driverService->assignDriver($driver, $request->user_id);

            return redirect()
                ->back()
                ->with('success', 'Driver assigned successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }

    public function export(): \Symfony\Component\HttpFoundation\BinaryFileResponse
    {
        $user = Auth::user();
        $companyId = $user->isSuperAdmin() ? null : $user->company_id;
        $drivers = $this->driverService->getAllDrivers($companyId);

        // Create CSV
        $filename = 'drivers_export_' . date('Y-m-d_His') . '.csv';
        $file = fopen('php://temp', 'r+');

        // Headers
        fputcsv($file, ['ID', 'Full Name', 'Phone', 'WhatsApp', 'Email', 'Riding Company', 'Campaign', 'Lead Source', 'Lead Status', 'Assigned To', 'Created At']);

        // Data
        foreach ($drivers as $driver) {
            fputcsv($file, [
                $driver->id,
                $driver->full_name,
                $driver->phone,
                $driver->whatsapp_phone ?? '',
                $driver->email ?? '',
                $driver->ridingCompany?->name ?? '',
                $driver->campaign?->name ?? '',
                $driver->leadSource?->name ?? '',
                $driver->leadStatus?->name ?? '',
                $driver->assignedTo?->name ?? '',
                $driver->created_at,
            ]);
        }

        rewind($file);
        $content = stream_get_contents($file);
        fclose($file);

        return response()->streamDownload(function () use ($content) {
            echo $content;
        }, $filename, [
            'Content-Type' => 'text/csv',
        ]);
    }

    public function import(): Response
    {
        return Inertia::render('Drivers/Drivers/Import');
    }

    public function importStore(Request $request): RedirectResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt', 'max:10240'],
        ]);

        try {
            // TODO: Implement CSV import logic
            return redirect()
                ->route('drivers.drivers.index')
                ->with('success', 'Drivers imported successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }
}

