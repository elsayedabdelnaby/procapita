<?php

namespace Modules\RidingCarCompanies\app\Services;

use Illuminate\Database\Eloquent\Collection;
use Modules\RidingCarCompanies\app\Models\RidingCompanyDocumentRequirement;

class RidingCompanyDocumentRequirementService
{
    public function getAllDocumentRequirements(int $ridingCompanyId): Collection
    {
        return RidingCompanyDocumentRequirement::forCompany($ridingCompanyId)
            ->orderBy('name')
            ->get();
    }

    public function getDocumentRequirementById(int $id): ?RidingCompanyDocumentRequirement
    {
        return RidingCompanyDocumentRequirement::find($id);
    }

    public function createDocumentRequirement(array $data, bool $triggerEvents = true): RidingCompanyDocumentRequirement
    {
        if (! $triggerEvents) {
            // Create without triggering events by using withoutEvents
            return RidingCompanyDocumentRequirement::withoutEvents(function () use ($data) {
                return RidingCompanyDocumentRequirement::create($data);
            });
        }

        return RidingCompanyDocumentRequirement::create($data);
    }

    public function addDocumentRequirementToExistingDrivers(int $documentRequirementId): void
    {
        $documentRequirement = RidingCompanyDocumentRequirement::findOrFail($documentRequirementId);

        // Only create documents if the requirement is active
        if (! $documentRequirement->active) {
            return;
        }

        // Get all drivers with the same riding company
        $drivers = \Modules\Drivers\app\Models\Driver::where('riding_company_id', $documentRequirement->riding_company_id)
            ->whereNull('deleted_at')
            ->get(['id']);

        if ($drivers->isEmpty()) {
            return;
        }

        // Check which drivers already have a document for this riding company
        $existingDocuments = \Modules\Drivers\app\Models\DriverDocument::where('riding_company_id', $documentRequirement->riding_company_id)
            ->whereIn('driver_id', $drivers->pluck('id'))
            ->pluck('driver_id')
            ->toArray();

        // Create driver documents only for drivers who don't have a document for this riding company yet
        $documents = [];
        $defaultStatus = $documentRequirement->default_status ?? 'pending';
        foreach ($drivers as $driver) {
            if (! in_array($driver->id, $existingDocuments)) {
                $documents[] = [
                    'name' => $documentRequirement->name,
                    'driver_id' => $driver->id,
                    'riding_company_id' => $documentRequirement->riding_company_id,
                    'status' => $defaultStatus,
                    'notes' => $documentRequirement->instructions,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }
        }

        if (! empty($documents)) {
            \Modules\Drivers\app\Models\DriverDocument::insert($documents);
        }
    }

    public function updateDocumentRequirement(int $id, array $data): RidingCompanyDocumentRequirement
    {
        $requirement = RidingCompanyDocumentRequirement::findOrFail($id);
        $requirement->update($data);

        return $requirement->fresh();
    }

    public function deleteDocumentRequirement(int $id): bool
    {
        $requirement = RidingCompanyDocumentRequirement::findOrFail($id);

        return $requirement->delete();
    }

    public function toggleActive(int $id): RidingCompanyDocumentRequirement
    {
        $requirement = RidingCompanyDocumentRequirement::findOrFail($id);
        $requirement->update(['active' => ! $requirement->active]);

        return $requirement->fresh();
    }
}
