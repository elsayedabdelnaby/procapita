<?php

namespace Modules\Drivers\app\Services;

use Illuminate\Database\Eloquent\Collection;
use Modules\Drivers\app\Models\LeadStatus;

class LeadStatusService
{
    public function getAllLeadStatuses(?int $companyId = null): Collection
    {
        $query = LeadStatus::with('company');

        if ($companyId) {
            $query->where('company_id', $companyId);
        }

        return $query->ordered()->get();
    }

    public function getLeadStatusById(int $id): ?LeadStatus
    {
        return LeadStatus::with('company')->find($id);
    }

    public function createLeadStatus(array $data): LeadStatus
    {
        return LeadStatus::create($data);
    }

    public function updateLeadStatus(int $id, array $data): LeadStatus
    {
        $leadStatus = LeadStatus::findOrFail($id);
        $leadStatus->update($data);

        return $leadStatus->fresh();
    }

    public function deleteLeadStatus(int $id): bool
    {
        $leadStatus = LeadStatus::findOrFail($id);
        return $leadStatus->delete();
    }

    public function toggleActive(int $id): LeadStatus
    {
        $leadStatus = LeadStatus::findOrFail($id);
        $leadStatus->update(['active' => ! $leadStatus->active]);

        return $leadStatus->fresh();
    }
}

