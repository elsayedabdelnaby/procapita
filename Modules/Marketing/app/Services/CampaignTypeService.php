<?php

namespace Modules\Marketing\app\Services;

use Illuminate\Database\Eloquent\Collection;
use Modules\Marketing\app\Models\CampaignType;

class CampaignTypeService
{
    public function getAllCampaignTypes(?int $companyId = null): Collection
    {
        $query = CampaignType::with('channels', 'company');

        if ($companyId) {
            $query->forCompany($companyId);
        }

        return $query->orderBy('sort_order')->get();
    }

    public function getCampaignTypeById(int $id): ?CampaignType
    {
        return CampaignType::with('channels', 'company')->find($id);
    }

    public function createCampaignType(array $data): CampaignType
    {
        return CampaignType::create($data);
    }

    public function updateCampaignType(int $id, array $data): CampaignType
    {
        $type = CampaignType::findOrFail($id);
        $type->update($data);

        return $type->fresh();
    }

    public function deleteCampaignType(int $id): bool
    {
        $type = CampaignType::findOrFail($id);

        return $type->delete();
    }

    public function getActiveCampaignTypes(?int $companyId = null): Collection
    {
        $query = CampaignType::active();

        if ($companyId) {
            $query->forCompany($companyId);
        }

        return $query->orderBy('sort_order')->get();
    }
}

