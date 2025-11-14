<?php

namespace Modules\Marketing\app\Services;

use Illuminate\Database\Eloquent\Collection;
use Modules\Marketing\app\Models\CampaignStatus;

class CampaignStatusService
{
    public function getAllCampaignStatuses(?int $companyId = null): Collection
    {
        $query = CampaignStatus::with('company');

        if ($companyId) {
            $query->forCompany($companyId);
        }

        return $query->orderBy('sort_order')->get();
    }

    public function getCampaignStatusById(int $id): ?CampaignStatus
    {
        return CampaignStatus::with('company')->find($id);
    }

    public function createCampaignStatus(array $data): CampaignStatus
    {
        return CampaignStatus::create($data);
    }

    public function updateCampaignStatus(int $id, array $data): CampaignStatus
    {
        $status = CampaignStatus::findOrFail($id);
        $status->update($data);

        return $status->fresh();
    }

    public function deleteCampaignStatus(int $id): bool
    {
        $status = CampaignStatus::findOrFail($id);

        return $status->delete();
    }

    public function getActiveCampaignStatuses(?int $companyId = null): Collection
    {
        $query = CampaignStatus::active();

        if ($companyId) {
            $query->forCompany($companyId);
        }

        return $query->orderBy('sort_order')->get();
    }
}

