<?php

namespace Modules\RidingCarCompanies\app\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;
use Modules\RidingCarCompanies\app\Http\Requests\RidingCompanyIntegrationSettingStoreRequest;
use Modules\RidingCarCompanies\app\Http\Requests\RidingCompanyIntegrationSettingUpdateRequest;
use Modules\RidingCarCompanies\app\Models\RidingCompany;
use Modules\RidingCarCompanies\app\Services\RidingCompanyIntegrationSettingService;

class RidingCompanyIntegrationSettingController extends Controller
{
    public function __construct(
        protected RidingCompanyIntegrationSettingService $integrationSettingService
    ) {}

    public function index(int $ridingCompanyId): Response
    {
        $ridingCompany = RidingCompany::findOrFail($ridingCompanyId);
        $integrationSettings = $this->integrationSettingService->getAllIntegrationSettings($ridingCompanyId);

        // Hide sensitive values for display
        $integrationSettings = $integrationSettings->map(function ($setting) {
            $config = $setting->config;
            $sensitiveKeys = ['api_key', 'secret', 'password', 'token', 'access_token', 'refresh_token'];
            
            foreach ($sensitiveKeys as $key) {
                if (isset($config[$key])) {
                    $config[$key] = '••••••••';
                }
            }
            
            $setting->config = $config;
            return $setting;
        });

        return Inertia::render('RidingCarCompanies/IntegrationSettings/Index', [
            'ridingCompany' => $ridingCompany,
            'integrationSettings' => $integrationSettings,
        ]);
    }

    public function create(int $ridingCompanyId): Response
    {
        $ridingCompany = RidingCompany::findOrFail($ridingCompanyId);

        return Inertia::render('RidingCarCompanies/IntegrationSettings/Create', [
            'ridingCompany' => $ridingCompany,
        ]);
    }

    public function store(RidingCompanyIntegrationSettingStoreRequest $request, int $ridingCompanyId): RedirectResponse
    {
        try {
            $data = $request->validated();
            $data['riding_company_id'] = $ridingCompanyId;
            $data['active'] = $data['active'] ?? true;

            $this->integrationSettingService->createIntegrationSetting($data);

            return redirect()
                ->route('ridingcarcompanies.integrationsettings.index', $ridingCompanyId)
                ->with('success', 'Integration setting created successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->withInput()
                ->with('error', $e->getMessage());
        }
    }

    public function edit(int $id): Response
    {
        $integrationSetting = $this->integrationSettingService->getIntegrationSettingById($id);

        if (! $integrationSetting) {
            abort(404, 'Integration setting not found.');
        }

        // Decrypt sensitive values for editing
        $decryptedConfig = $this->integrationSettingService->getDecryptedConfig($integrationSetting);
        $integrationSetting->config = $decryptedConfig;

        return Inertia::render('RidingCarCompanies/IntegrationSettings/Edit', [
            'integrationSetting' => $integrationSetting->load('ridingCompany'),
        ]);
    }

    public function update(RidingCompanyIntegrationSettingUpdateRequest $request, int $id): RedirectResponse
    {
        try {
            $integrationSetting = $this->integrationSettingService->getIntegrationSettingById($id);
            
            if (! $integrationSetting) {
                abort(404, 'Integration setting not found.');
            }

            $this->integrationSettingService->updateIntegrationSetting($id, $request->validated());

            return redirect()
                ->route('ridingcarcompanies.integrationsettings.index', $integrationSetting->riding_company_id)
                ->with('success', 'Integration setting updated successfully.');
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
            $integrationSetting = $this->integrationSettingService->getIntegrationSettingById($id);
            
            if (! $integrationSetting) {
                abort(404, 'Integration setting not found.');
            }

            $ridingCompanyId = $integrationSetting->riding_company_id;
            $this->integrationSettingService->deleteIntegrationSetting($id);

            return redirect()
                ->route('ridingcarcompanies.integrationsettings.index', $ridingCompanyId)
                ->with('success', 'Integration setting deleted successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }

    public function toggleActive(int $id): RedirectResponse
    {
        try {
            $this->integrationSettingService->toggleActive($id);

            return redirect()
                ->back()
                ->with('success', 'Integration setting status updated successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }

    public function testAccess(int $id): JsonResponse
    {
        try {
            $result = $this->integrationSettingService->testAccess($id);

            return response()->json($result);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }
}

