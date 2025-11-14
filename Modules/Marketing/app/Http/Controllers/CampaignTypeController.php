<?php

namespace Modules\Marketing\app\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Core\app\Models\Company;
use Modules\Marketing\app\Http\Requests\CampaignTypeStoreRequest;
use Modules\Marketing\app\Http\Requests\CampaignTypeUpdateRequest;
use Modules\Marketing\app\Services\CampaignTypeService;

class CampaignTypeController extends Controller
{
    public function __construct(
        protected CampaignTypeService $campaignTypeService
    ) {}

    public function index(): Response
    {
        $user = auth()->user();
        $companyId = $user->isSuperAdmin() ? null : $user->company_id;
        
        $types = $this->campaignTypeService->getAllCampaignTypes($companyId);

        return Inertia::render('Marketing/CampaignTypes/Index', [
            'campaignTypes' => $types,
        ]);
    }

    public function create(): Response
    {
        $user = Auth::user();
        $companies = null;
        
        if ($user->isSuperAdmin()) {
            $companies = Company::active()->get();
        }

        return Inertia::render('Marketing/CampaignTypes/Create', [
            'companies' => $companies,
            'company' => $user->company,
        ]);
    }

    public function store(CampaignTypeStoreRequest $request): RedirectResponse
    {
        try {
            $data = $request->validated();
            
            // If not super admin, force their company_id
            if (! Auth::user()->isSuperAdmin()) {
                $data['company_id'] = Auth::user()->company_id;
            }
            
            $this->campaignTypeService->createCampaignType($data);

            return redirect()
                ->route('marketing.campaign-types.index')
                ->with('success', 'Campaign type created successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->withInput()
                ->with('error', $e->getMessage());
        }
    }

    public function edit(int $id): Response
    {
        $type = $this->campaignTypeService->getCampaignTypeById($id);

        if (! $type) {
            abort(404, 'Campaign type not found.');
        }

        return Inertia::render('Marketing/CampaignTypes/Edit', [
            'campaignType' => $type,
        ]);
    }

    public function update(CampaignTypeUpdateRequest $request, int $id): RedirectResponse
    {
        try {
            $data = $request->validated();
            $this->campaignTypeService->updateCampaignType($id, $data);

            return redirect()
                ->route('marketing.campaign-types.index')
                ->with('success', 'Campaign type updated successfully.');
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
            $this->campaignTypeService->deleteCampaignType($id);

            return redirect()
                ->route('marketing.campaign-types.index')
                ->with('success', 'Campaign type deleted successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }
}

