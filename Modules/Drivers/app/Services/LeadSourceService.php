<?php

namespace Modules\Drivers\app\Services;

use Illuminate\Database\Eloquent\Collection;
use Modules\Drivers\app\Models\LeadSource;

class LeadSourceService
{
    public function getAllLeadSources(?int $companyId = null): Collection
    {
        $query = LeadSource::with('company');

        if ($companyId) {
            $query->where('company_id', $companyId);
        }

        return $query->orderBy('name')->get();
    }

    public function getLeadSourceById(int $id): ?LeadSource
    {
        return LeadSource::with('company')->find($id);
    }

    public function createLeadSource(array $data): LeadSource
    {
        return LeadSource::create($data);
    }

    public function updateLeadSource(int $id, array $data): LeadSource
    {
        $leadSource = LeadSource::findOrFail($id);
        $leadSource->update($data);

        return $leadSource->fresh();
    }

    public function deleteLeadSource(int $id): bool
    {
        $leadSource = LeadSource::findOrFail($id);
        return $leadSource->delete();
    }

    public function toggleActive(int $id): LeadSource
    {
        $leadSource = LeadSource::findOrFail($id);
        $leadSource->update(['active' => ! $leadSource->active]);

        return $leadSource->fresh();
    }
}

