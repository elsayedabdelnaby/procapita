<?php

namespace Modules\Marketing\app\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;
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
        $companyId = $user->isSuperAdmin() ? null : $user->company_id;
        
        $channels = $this->campaignChannelService->getAllCampaignChannels($companyId);

        return Inertia::render('Marketing/CampaignChannels/Index', [
            'campaignChannels' => $channels,
        ]);
    }

    public function create(): Response
    {
        $user = auth()->user();
        $companyId = $user->company_id;
        
        $campaignTypes = $this->campaignTypeService->getActiveCampaignTypes($companyId);

        return Inertia::render('Marketing/CampaignChannels/Create', [
            'campaignTypes' => $campaignTypes,
        ]);
    }

    public function store(CampaignChannelStoreRequest $request): RedirectResponse
    {
        try {
            $data = $request->validated();
            $data['company_id'] = auth()->user()->company_id;
            
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

        $user = auth()->user();
        $companyId = $user->company_id;
        
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

