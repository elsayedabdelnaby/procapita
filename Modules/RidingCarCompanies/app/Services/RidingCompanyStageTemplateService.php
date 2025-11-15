<?php

namespace Modules\RidingCarCompanies\app\Services;

use Illuminate\Database\Eloquent\Collection;
use Modules\RidingCarCompanies\app\Models\RidingCompanyStageTemplate;

class RidingCompanyStageTemplateService
{
    public function getAllStageTemplates(int $ridingCompanyId): Collection
    {
        return RidingCompanyStageTemplate::forCompany($ridingCompanyId)
            ->ordered()
            ->get();
    }

    public function getStageTemplateById(int $id): ?RidingCompanyStageTemplate
    {
        return RidingCompanyStageTemplate::find($id);
    }

    public function createStageTemplate(array $data): RidingCompanyStageTemplate
    {
        return RidingCompanyStageTemplate::create($data);
    }

    public function updateStageTemplate(int $id, array $data): RidingCompanyStageTemplate
    {
        $template = RidingCompanyStageTemplate::findOrFail($id);
        $template->update($data);

        return $template->fresh();
    }

    public function deleteStageTemplate(int $id): bool
    {
        $template = RidingCompanyStageTemplate::findOrFail($id);
        return $template->delete();
    }

    public function toggleActive(int $id): RidingCompanyStageTemplate
    {
        $template = RidingCompanyStageTemplate::findOrFail($id);
        $template->update(['active' => ! $template->active]);

        return $template->fresh();
    }
}

