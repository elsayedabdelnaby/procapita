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

    public function createDocumentRequirement(array $data): RidingCompanyDocumentRequirement
    {
        return RidingCompanyDocumentRequirement::create($data);
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

