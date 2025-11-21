<?php

namespace Modules\Drivers\app\Services;

use Illuminate\Database\Eloquent\Collection;
use Modules\Drivers\app\Models\Driver;

class DriverService
{
    public function getAllDrivers(?int $companyId = null): Collection
    {
        $query = Driver::with(['company', 'ridingCompany', 'campaign', 'leadSource', 'assignedTo', 'leadStatus', 'currentStage']);

        if ($companyId) {
            $query->where('company_id', $companyId);
        }

        return $query->orderBy('created_at', 'desc')->get();
    }

    public function getDriverById(int $id): ?Driver
    {
        return Driver::with([
            'company',
            'ridingCompany',
            'campaign',
            'leadSource',
            'assignedTo',
            'leadStatus',
            'currentStage',
            'stages.stageTemplate',
            'documents.documentTemplate',
        ])->find($id);
    }

    public function createDriver(array $data): Driver
    {
        return Driver::create($data);
    }

    public function updateDriver(int $id, array $data): Driver
    {
        $driver = Driver::findOrFail($id);
        $driver->update($data);

        return $driver->fresh();
    }

    public function deleteDriver(int $id): bool
    {
        $driver = Driver::findOrFail($id);
        return $driver->delete();
    }

    public function assignDriver(int $id, int $userId): Driver
    {
        $driver = Driver::findOrFail($id);
        $driver->update(['assigned_to' => $userId]);

        return $driver->fresh();
    }
}

