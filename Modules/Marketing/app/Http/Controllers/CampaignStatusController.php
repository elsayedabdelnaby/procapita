<?php

namespace Modules\Marketing\app\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Marketing\app\Http\Requests\CampaignStatusStoreRequest;
use Modules\Marketing\app\Http\Requests\CampaignStatusUpdateRequest;
use Modules\Marketing\app\Services\CampaignStatusService;

class CampaignStatusController extends Controller
{
    public function __construct(
        protected CampaignStatusService $campaignStatusService
    ) {}

    public function index(): Response
    {
        $user = auth()->user();
        $companyId = $user->isSuperAdmin() ? null : $user->company_id;
        
        $statuses = $this->campaignStatusService->getAllCampaignStatuses($companyId);

        return Inertia::render('Marketing/CampaignStatuses/Index', [
            'campaignStatuses' => $statuses,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Marketing/CampaignStatuses/Create');
    }

    public function store(CampaignStatusStoreRequest $request): RedirectResponse
    {
        try {
            $data = $request->validated();
            $data['company_id'] = auth()->user()->company_id;
            
            $this->campaignStatusService->createCampaignStatus($data);

            return redirect()
                ->route('marketing.campaign-statuses.index')
                ->with('success', 'Campaign status created successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->withInput()
                ->with('error', $e->getMessage());
        }
    }

    public function edit(int $id): Response
    {
        $status = $this->campaignStatusService->getCampaignStatusById($id);

        if (! $status) {
            abort(404, 'Campaign status not found.');
        }

        return Inertia::render('Marketing/CampaignStatuses/Edit', [
            'campaignStatus' => $status,
        ]);
    }

    public function update(CampaignStatusUpdateRequest $request, int $id): RedirectResponse
    {
        try {
            $data = $request->validated();
            $this->campaignStatusService->updateCampaignStatus($id, $data);

            return redirect()
                ->route('marketing.campaign-statuses.index')
                ->with('success', 'Campaign status updated successfully.');
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
            $this->campaignStatusService->deleteCampaignStatus($id);

            return redirect()
                ->route('marketing.campaign-statuses.index')
                ->with('success', 'Campaign status deleted successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }
}

