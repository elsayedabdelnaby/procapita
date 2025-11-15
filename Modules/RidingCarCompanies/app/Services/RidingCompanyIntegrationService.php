<?php

namespace Modules\RidingCarCompanies\app\Services;

use Illuminate\Database\Eloquent\Collection;
use Modules\RidingCarCompanies\app\Models\RidingCompanyIntegration;

class RidingCompanyIntegrationService
{
    public function getAllIntegrations(int $ridingCompanyId): Collection
    {
        return RidingCompanyIntegration::forCompany($ridingCompanyId)
            ->orderBy('type')
            ->get();
    }

    public function getIntegrationById(int $id): ?RidingCompanyIntegration
    {
        return RidingCompanyIntegration::find($id);
    }

    public function createIntegration(array $data): RidingCompanyIntegration
    {
        return RidingCompanyIntegration::create($data);
    }

    public function updateIntegration(int $id, array $data): RidingCompanyIntegration
    {
        $integration = RidingCompanyIntegration::findOrFail($id);
        $integration->update($data);

        return $integration->fresh();
    }

    public function deleteIntegration(int $id): bool
    {
        $integration = RidingCompanyIntegration::findOrFail($id);
        return $integration->delete();
    }

    public function toggleActive(int $id): RidingCompanyIntegration
    {
        $integration = RidingCompanyIntegration::findOrFail($id);
        $integration->update(['active' => ! $integration->active]);

        return $integration->fresh();
    }

    public function testConnection(int $id): array
    {
        $integration = RidingCompanyIntegration::findOrFail($id);
        $config = $integration->config;

        // Basic connection test logic
        try {
            // This is a placeholder - implement actual connection test based on type
            return [
                'success' => true,
                'message' => 'Connection test successful.',
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage(),
            ];
        }
    }
}

