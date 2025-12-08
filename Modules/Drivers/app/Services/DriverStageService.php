<?php

namespace Modules\Drivers\app\Services;

use Illuminate\Database\Eloquent\Collection;
use Modules\Drivers\app\Models\DriverStage;

class DriverStageService
{
    public function getAllDriverStages(?int $driverId = null, ?int $companyId = null): Collection
    {
        $query = DriverStage::with(['driver', 'stageTemplate'])
            ->whereHas('driver', function ($q) use ($companyId) {
                // Only show stages for non-deleted drivers
                $q->whereNull('deleted_at');
                
                // Filter by company_id if provided
                if ($companyId) {
                    $q->where('company_id', $companyId);
                }
            });

        if ($driverId) {
            $query->where('driver_id', $driverId);
        }

        return $query->ordered()->get();
    }

    public function getDriverStageById(int $id): ?DriverStage
    {
        return DriverStage::with(['driver', 'stageTemplate'])->find($id);
    }

    public function createDriverStage(array $data): DriverStage
    {
        return DriverStage::create($data);
    }

    public function updateDriverStage(int $id, array $data): DriverStage
    {
        $driverStage = DriverStage::findOrFail($id);
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

