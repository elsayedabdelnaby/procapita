<?php

namespace Modules\RidingCarCompanies\app\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;
use Modules\RidingCarCompanies\app\Http\Requests\RidingCompanyIntegrationStoreRequest;
use Modules\RidingCarCompanies\app\Http\Requests\RidingCompanyIntegrationUpdateRequest;
use Modules\RidingCarCompanies\app\Models\RidingCompany;
use Modules\RidingCarCompanies\app\Services\RidingCompanyIntegrationService;

class RidingCompanyIntegrationController extends Controller
{
    public function __construct(
        protected RidingCompanyIntegrationService $integrationService
    ) {}

    public function index(int $ridingCompanyId): Response
    {
        $ridingCompany = RidingCompany::findOrFail($ridingCompanyId);
        $integrations = $this->integrationService->getAllIntegrations($ridingCompanyId);

        return Inertia::render('RidingCarCompanies/Integrations/Index', [
            'ridingCompany' => $ridingCompany,
            'integrations' => $integrations,
        ]);
    }

    public function create(int $ridingCompanyId): Response
    {
        $ridingCompany = RidingCompany::findOrFail($ridingCompanyId);

        return Inertia::render('RidingCarCompanies/Integrations/Create', [
            'ridingCompany' => $ridingCompany,
        ]);
    }

    public function store(RidingCompanyIntegrationStoreRequest $request, int $ridingCompanyId): RedirectResponse
    {
        try {
            $data = $request->validated();
            $data['riding_company_id'] = $ridingCompanyId;
            $data['active'] = $data['active'] ?? true;

            $this->integrationService->createIntegration($data);

            return redirect()
                ->route('ridingcarcompanies.integrations.index', $ridingCompanyId)
                ->with('success', 'Integration created successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->withInput()
                ->with('error', $e->getMessage());
        }
    }

    public function edit(int $id): Response
    {
        $integration = $this->integrationService->getIntegrationById($id);

        if (! $integration) {
            abort(404, 'Integration not found.');
        }

        return Inertia::render('RidingCarCompanies/Integrations/Edit', [
            'integration' => $integration->load('ridingCompany'),
        ]);
    }

    public function update(RidingCompanyIntegrationUpdateRequest $request, int $id): RedirectResponse
    {
        try {
            $integration = $this->integrationService->getIntegrationById($id);
            
            if (! $integration) {
                abort(404, 'Integration not found.');
            }

            $this->integrationService->updateIntegration($id, $request->validated());

            return redirect()
                ->route('ridingcarcompanies.integrations.index', $integration->riding_company_id)
                ->with('success', 'Integration updated successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->withInput()
                ->with('error', $e->getMessage());
        }
    }

    public function destroy(int $id): RedirectResponse
    {
        try {
            $integration = $this->integrationService->getIntegrationById($id);
            
            if (! $integration) {
                abort(404, 'Integration not found.');
            }

            $ridingCompanyId = $integration->riding_company_id;
            $this->integrationService->deleteIntegration($id);

            return redirect()
                ->route('ridingcarcompanies.integrations.index', $ridingCompanyId)
                ->with('success', 'Integration deleted successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }

    public function toggleActive(int $id): RedirectResponse
    {
        try {
            $this->integrationService->toggleActive($id);

            return redirect()
                ->back()
                ->with('success', 'Integration status updated successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }

    public function testConnection(int $id): JsonResponse
    {
        try {
            $result = $this->integrationService->testConnection($id);

            return response()->json($result);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }
}

