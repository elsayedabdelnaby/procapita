<?php

namespace Modules\Drivers\app\Services;

use Illuminate\Database\Eloquent\Collection;
use Modules\Drivers\app\Models\LeadSource;

class LeadSourceService
{
    public function getAllLeadSources(): Collection
    {
        return LeadSource::orderBy('name')->get();
    }

    public function getLeadSourceById(int $id): ?LeadSource
    {
        return LeadSource::find($id);
    }

    public function createLeadSource(array $data): LeadSource
    {
        // Remove company_id as LeadSource is now global
        unset($data['company_id']);
        
        return LeadSource::create($data);
    }

    public function updateLeadSource(int $id, array $data): LeadSource
    {
        // Remove company_id as LeadSource is now global
        unset($data['company_id']);
        
        $leadSource = LeadSource::findOrFail($id);
        $leadSource->update($data);

        return $leadSource->fresh();
    }

    public function deleteLeadSource(int $id, ?int $transferLeadSourceId = null): bool
    {
        $leadSource = LeadSource::findOrFail($id);
        
        // If transfer ID is provided, transfer all drivers to the new lead source
        if ($transferLeadSourceId !== null) {
            // Transfer all drivers
            if (class_exists(\Modules\Drivers\app\Models\Driver::class)) {
                \Modules\Drivers\app\Models\Driver::where('lead_source_id', $id)
                    ->update(['lead_source_id' => $transferLeadSourceId]);
            }
        }
        
        return $leadSource->delete();
    }

    public function toggleActive(int $id): LeadSource
    {
        $leadSource = LeadSource::findOrFail($id);
        $leadSource->update(['active' => ! $leadSource->active]);

        return $leadSource->fresh();
    }
}

