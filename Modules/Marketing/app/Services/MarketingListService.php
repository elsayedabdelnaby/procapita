<?php

namespace Modules\Marketing\app\Services;

use Illuminate\Database\Eloquent\Collection;
use Modules\Marketing\app\Models\MarketingList;

class MarketingListService
{
    public function getAllMarketingLists(?int $companyId = null): Collection
    {
        $query = MarketingList::with('company');

        if ($companyId) {
            $query->where('company_id', $companyId);
        }

        return $query->latest()->get();
    }

    public function getMarketingListById(int $id): ?MarketingList
    {
        return MarketingList::with('company')->find($id);
    }

    public function createMarketingList(array $data): MarketingList
    {
        return MarketingList::create($data);
    }

    public function updateMarketingList(int $id, array $data): MarketingList
    {
        $list = MarketingList::findOrFail($id);
        $list->update($data);

        return $list->fresh();
    }

    public function deleteMarketingList(int $id): bool
    {
        $list = MarketingList::findOrFail($id);

        return $list->delete();
    }

    public function getMarketingListsByType(string $type, ?int $companyId = null): Collection
    {
        $query = MarketingList::where('type', $type);

        if ($companyId) {
            $query->where('company_id', $companyId);
        }

        return $query->latest()->get();
    }
}

