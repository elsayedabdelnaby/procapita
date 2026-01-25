<?php

namespace Modules\Drivers\app\Services;

use Illuminate\Database\Eloquent\Collection;
use Modules\Drivers\app\Models\DriverStage;

class DriverStageService
{
    public function getAllDriverStages(?int $driverId = null, ?int $companyId = null): Collection
    {
        // Driver Stages are now templates (without driver_id)
        // Only show templates, not individual driver stages
        $query = DriverStage::with(['ridingCompany'])
            ->whereNull('driver_id');

        // Filter by company's riding companies if companyId is provided
        if ($companyId) {
            $ridingCompanyIds = \Modules\RidingCarCompanies\app\Models\RidingCompany::where('company_id', $companyId)
                ->pluck('id')
                ->toArray();

            if (!empty($ridingCompanyIds)) {
                $query->where(function ($q) use ($ridingCompanyIds) {
                    $q->whereIn('riding_company_id', $ridingCompanyIds)
                        ->orWhere(function ($q2) use ($ridingCompanyIds) {
                            foreach ($ridingCompanyIds as $rcId) {
                                $q2->orWhereJsonContains('riding_company_ids', $rcId);
                            }
                        });
                });
            } else {
                // No riding companies for this company, return empty
                return collect();
            }
        }

        return $query->ordered()->get();
    }

    public function getDriverStageById(int $id): ?DriverStage
    {
        return DriverStage::with(['driver', 'ridingCompany'])->find($id);
    }

    public function createDriverStage(array $data): DriverStage
    {
        // Remove driver_id if present (Driver Stages are now templates, not tied to specific drivers)
        unset($data['driver_id']);
        
        // Handle riding_company_ids array
        if (isset($data['riding_company_ids']) && is_array($data['riding_company_ids'])) {
            // Convert to integers
            $data['riding_company_ids'] = array_map('intval', $data['riding_company_ids']);
            // Set first one as riding_company_id for backward compatibility
            if (!empty($data['riding_company_ids'])) {
                $data['riding_company_id'] = $data['riding_company_ids'][0];
            }
        }

        return DriverStage::create($data);
    }

    public function updateDriverStage(int $id, array $data): DriverStage
    {
        $driverStage = DriverStage::findOrFail($id);

        // Remove driver_id if present (Driver Stages are now templates, not tied to specific drivers)
        unset($data['driver_id']);

        // Handle riding_company_ids array
        if (isset($data['riding_company_ids']) && is_array($data['riding_company_ids'])) {
            // Convert to integers
            $data['riding_company_ids'] = array_map('intval', $data['riding_company_ids']);
            // Set first one as riding_company_id for backward compatibility
            if (!empty($data['riding_company_ids'])) {
                $data['riding_company_id'] = $data['riding_company_ids'][0];
            }
        }

        $driverStage->update($data);

        return $driverStage->fresh();
    }

    public function deleteDriverStage(int $id): bool
    {
        $driverStage = DriverStage::findOrFail($id);

        return $driverStage->delete();
    }

    public function completeStage(int $id): DriverStage
    {
        $driverStage = DriverStage::findOrFail($id);
        $driverStage->markAsCompleted();

        return $driverStage->fresh();
    }

    public function rejectStage(int $id, ?string $notes = null): DriverStage
    {
        $driverStage = DriverStage::findOrFail($id);
        $driverStage->update([
            'status' => 'rejected',
            'notes' => $notes,
        ]);

        return $driverStage->fresh();
    }
}
