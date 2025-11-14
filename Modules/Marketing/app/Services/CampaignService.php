<?php

namespace Modules\Marketing\app\Services;

use Illuminate\Database\Eloquent\Collection;
use Modules\Marketing\app\Models\Campaign;

class CampaignService
{
    public function getAllCampaigns(?int $companyId = null): Collection
    {
        $query = Campaign::with('company', 'type', 'status', 'channel', 'metrics');

        if ($companyId) {
            $query->where('company_id', $companyId);
        }

        return $query->latest()->get();
    }

    public function getCampaignById(int $id): ?Campaign
    {
        return Campaign::with('company', 'type', 'status', 'channel', 'metrics')->find($id);
    }

    public function createCampaign(array $data): Campaign
    {
        return Campaign::create($data);
    }

    public function updateCampaign(int $id, array $data): Campaign
    {
        $campaign = Campaign::findOrFail($id);
        $campaign->update($data);

        return $campaign->fresh();
    }

    public function deleteCampaign(int $id): bool
    {
        $campaign = Campaign::findOrFail($id);

        return $campaign->delete();
    }

    public function pauseCampaign(int $id): Campaign
    {
        $campaign = Campaign::findOrFail($id);
        
        // Find the "Paused" status for this company
        $pausedStatus = \Modules\Marketing\app\Models\CampaignStatus::forCompany($campaign->company_id)
            ->where('slug', 'paused')
            ->first();
            
        if ($pausedStatus) {
            $campaign->update(['campaign_status_id' => $pausedStatus->id]);
        }

        return $campaign->load('type', 'status', 'channel');
    }

    public function activateCampaign(int $id): Campaign
    {
        $campaign = Campaign::findOrFail($id);
        
        // Find the "Active" status for this company
        $activeStatus = \Modules\Marketing\app\Models\CampaignStatus::forCompany($campaign->company_id)
            ->where('slug', 'active')
            ->first();
            
        if ($activeStatus) {
            $campaign->update(['campaign_status_id' => $activeStatus->id]);
        }

        return $campaign->load('type', 'status', 'channel');
    }

    public function getCampaignsByStatus(string $status, ?int $companyId = null): Collection
    {
        $query = Campaign::where('status', $status);

        if ($companyId) {
            $query->where('company_id', $companyId);
        }

        return $query->latest()->get();
    }

    public function getActiveCampaigns(?int $companyId = null): Collection
    {
        return $this->getCampaignsByStatus('active', $companyId);
    }

    public function updateActualMetrics(int $id, array $metrics): Campaign
    {
        $campaign = Campaign::findOrFail($id);
        $campaign->updateActualMetrics($metrics);

        return $campaign->fresh();
    }
}

