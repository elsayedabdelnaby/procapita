<?php

namespace Modules\Marketing\app\Services;

use Illuminate\Database\Eloquent\Collection;
use Modules\Marketing\app\Models\MarketingTemplate;

class MarketingTemplateService
{
    public function getAllTemplates(?int $companyId = null): Collection
    {
        $query = MarketingTemplate::with('company');

        if ($companyId) {
            $query->where('company_id', $companyId);
        }

        return $query->latest()->get();
    }

    public function getTemplateById(int $id): ?MarketingTemplate
    {
        return MarketingTemplate::with('company')->find($id);
    }

    public function createTemplate(array $data): MarketingTemplate
    {
        return MarketingTemplate::create($data);
    }

    public function updateTemplate(int $id, array $data): MarketingTemplate
    {
        $template = MarketingTemplate::findOrFail($id);
        $template->update($data);

        return $template->fresh();
    }

    public function deleteTemplate(int $id): bool
    {
        $template = MarketingTemplate::findOrFail($id);

        return $template->delete();
    }

    public function getTemplatesByType(string $type, ?int $companyId = null): Collection
    {
        $query = MarketingTemplate::where('type', $type);

        if ($companyId) {
            $query->where('company_id', $companyId);
        }

        return $query->latest()->get();
    }
}

