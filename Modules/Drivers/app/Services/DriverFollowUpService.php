<?php

namespace Modules\Drivers\app\Services;

use Illuminate\Database\Eloquent\Collection;
use Modules\Drivers\app\Models\DriverFollowUp;

class DriverFollowUpService
{
    public function getAllFollowUps(?int $driverId = null, ?int $companyId = null, ?\App\Models\User $user = null): Collection
    {
        $query = DriverFollowUp::with([
            'driver.ridingCompany',
            'driver.campaign',
            'driver.leadSource',
            'driver.leadStatus',
            'driver.leadStage',
            'driver.assignedTo',
            'driver.assignedUsers',
            'assignedTo'
        ])
            ->whereHas('driver', function ($q) use ($companyId) {
                // Only show follow-ups for non-deleted drivers
                $q->whereNull('deleted_at');
                
                // Filter by company_id if provided
                if ($companyId) {
                    $q->where('company_id', $companyId);
                }
            });

        if ($driverId) {
            $query->forDriver($driverId);
        }

        // Filter by assigned_to if user is not super admin
        if ($user && !$user->isSuperAdmin()) {
            $subordinateUserIds = $user->getSubordinateUserIds();
            
            // Always include current user ID to ensure they see their own data
            if (!in_array($user->id, $subordinateUserIds)) {
                $subordinateUserIds[] = $user->id;
            }
            
            // Filter by assigned_to (the user who made the change)
            $query->whereIn('assigned_to', $subordinateUserIds);
        }

        return $query->recent()->get();
    }

    public function getFollowUpById(int $id): ?DriverFollowUp
    {
        return DriverFollowUp::with(['driver', 'assignedTo'])->find($id);
    }

    public function createFollowUp(array $data): DriverFollowUp
    {
        return DriverFollowUp::create($data);
    }

    public function updateFollowUp(int $id, array $data): DriverFollowUp
    {
        $followUp = DriverFollowUp::findOrFail($id);
        $followUp->update($data);

        return $followUp->fresh(['driver', 'assignedTo']);
    }

    public function deleteFollowUp(int $id): bool
    {
        $followUp = DriverFollowUp::findOrFail($id);
        return $followUp->delete();
    }

    public function deleteMultipleFollowUps(array $ids): int
    {
        return DriverFollowUp::whereIn('id', $ids)->delete();
    }

    public function getFollowUpsByIds(array $ids): Collection
    {
        return DriverFollowUp::with([
            'driver.ridingCompany',
            'driver.campaign',
            'driver.leadSource',
            'driver.leadStatus',
            'driver.leadStage',
            'driver.assignedTo',
            'driver.assignedUsers',
            'assignedTo'
        ])
            ->whereIn('id', $ids)
            ->get();
    }

    public function updateMultipleFollowUps(array $ids, array $data): int
    {
        return DriverFollowUp::whereIn('id', $ids)->update($data);
    }
}

