<?php

namespace Modules\Marketing\app\Services;

use Illuminate\Database\Eloquent\Collection;
use Modules\Marketing\app\Models\CampaignChannel;

class CampaignChannelService
{
    public function getAllCampaignChannels(?int $companyId = null, ?int $campaignTypeId = null): Collection
    {
        $query = CampaignChannel::with('campaignType', 'company');

        if ($companyId) {
            $query->forCompany($companyId);
        }

        if ($campaignTypeId) {
            $query->forType($campaignTypeId);
        }

        return $query->orderBy('campaign_type_id')->orderBy('sort_order')->get();
    }

    public function getCampaignChannelById(int $id): ?CampaignChannel
    {
        return CampaignChannel::with('campaignType', 'company')->find($id);
    }

    public function createCampaignChannel(array $data): CampaignChannel
    {
        return CampaignChannel::create($data);
    }

    public function updateCampaignChannel(int $id, array $data): CampaignChannel
    {
        $channel = CampaignChannel::findOrFail($id);
        $channel->update($data);

        return $channel->fresh();
    }

    public function deleteCampaignChannel(int $id): bool
    {
        $channel = CampaignChannel::findOrFail($id);

        return $channel->delete();
    }

    public function getChannelsByType(int $campaignTypeId, ?int $companyId = null): Collection
    {
        $query = CampaignChannel::forType($campaignTypeId)->active();

        if ($companyId) {
            $query->forCompany($companyId);
        }

        return $query->orderBy('sort_order')->get();
    }
}

