<?php

namespace Modules\Marketing\app\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Core\app\Models\Company;
use Modules\Marketing\app\Http\Requests\CampaignChannelStoreRequest;
use Modules\Marketing\app\Http\Requests\CampaignChannelUpdateRequest;
use Modules\Marketing\app\Services\CampaignChannelService;
use Modules\Marketing\app\Services\CampaignTypeService;

class CampaignChannelController extends Controller
{
    public function __construct(
        protected CampaignChannelService $campaignChannelService,
        protected CampaignTypeService $campaignTypeService
    ) {}

    public function index(): Response
    {
        $user = auth()->user();
        $companyId = $this->getCompanyId();
        
        $channels = $this->campaignChannelService->getAllCampaignChannels($companyId);

        return Inertia::render('Marketing/CampaignChannels/Index', [
            'campaignChannels' => $channels,
        ]);
    }

    public function create(): Response
    {
        $user = Auth::user();
        $companies = null;
        $companyId = $this->getCompanyId();
        
        $campaignTypes = $this->campaignTypeService->getActiveCampaignTypes($companyId);

        if ($user->isSuperAdmin()) {
            $companies = Company::active()->get();
        }

        return Inertia::render('Marketing/CampaignChannels/Create', [
            'campaignTypes' => $campaignTypes,
            'companies' => $companies,
            'company' => $user->company,
        ]);
    }

    public function store(CampaignChannelStoreRequest $request): RedirectResponse
    {
        try {
            $data = $request->validated();
            
            // If not super admin, force their company_id
            if (! Auth::user()->isSuperAdmin()) {
                $data['company_id'] = Auth::user()->company_id;
            }
            
            $this->campaignChannelService->createCampaignChannel($data);

            return redirect()
                ->route('marketing.campaign-channels.index')
                ->with('success', 'Campaign channel created successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->withInput()
                ->with('error', $e->getMessage());
        }
    }

    public function edit(int $id): Response
    {
        $channel = $this->campaignChannelService->getCampaignChannelById($id);

        if (! $channel) {
            abort(404, 'Campaign channel not found.');
        }

        $user = Auth::user();
        $companyId = $this->getCompanyId();
        
        $campaignTypes = $this->campaignTypeService->getActiveCampaignTypes($companyId);

        return Inertia::render('Marketing/CampaignChannels/Edit', [
            'campaignChannel' => $channel,
            'campaignTypes' => $campaignTypes,
        ]);
    }

    public function update(CampaignChannelUpdateRequest $request, int $id): RedirectResponse
    {
        try {
            $data = $request->validated();
            $this->campaignChannelService->updateCampaignChannel($id, $data);

            return redirect()
                ->route('marketing.campaign-channels.index')
                ->with('success', 'Campaign channel updated successfully.');
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
            $this->campaignChannelService->deleteCampaignChannel($id);

            return redirect()
                ->route('marketing.campaign-channels.index')
                ->with('success', 'Campaign channel deleted successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }
}

