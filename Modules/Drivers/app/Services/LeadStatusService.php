<?php

namespace Modules\Drivers\app\Services;

use Illuminate\Database\Eloquent\Collection;
use Modules\Drivers\app\Models\LeadStatus;

class LeadStatusService
{
    public function getAllLeadStatuses(): Collection
    {
        return LeadStatus::ordered()->get();
    }

    public function getLeadStatusById(int $id): ?LeadStatus
    {
        return LeadStatus::find($id);
    }

    public function createLeadStatus(array $data): LeadStatus
    {
        // If order is not set, assign the next available order number
        if (! isset($data['order']) || $data['order'] === 0) {
            $maxOrder = LeadStatus::max('order') ?? 0;
            $data['order'] = $maxOrder + 1;
        }

        return LeadStatus::create($data);
    }

    public function updateLeadStatus(int $id, array $data): LeadStatus
    {
        $leadStatus = LeadStatus::findOrFail($id);
        $leadStatus->update($data);

        return $leadStatus->fresh();
    }

    public function deleteLeadStatus(int $id, ?int $transferLeadStatusId = null): bool
    {
        $leadStatus = LeadStatus::findOrFail($id);
        
        // If transfer ID is provided, transfer all drivers to the new lead status
        if ($transferLeadStatusId !== null) {
            // Transfer all drivers
            if (class_exists(\Modules\Drivers\app\Models\Driver::class)) {
                \Modules\Drivers\app\Models\Driver::where('lead_status_id', $id)
                    ->update(['lead_status_id' => $transferLeadStatusId]);
            }
        }
        
        return $leadStatus->delete();
    }

    public function toggleActive(int $id): LeadStatus
    {
        $leadStatus = LeadStatus::findOrFail($id);
        $leadStatus->update(['active' => ! $leadStatus->active]);

        return $leadStatus->fresh();
    }

    public function moveUp(int $id): LeadStatus
    {
        $leadStatus = LeadStatus::findOrFail($id);

        // Find the previous status with lower order
        $previousStatus = LeadStatus::where('order', '<', $leadStatus->order)
            ->orderBy('order', 'desc')
            ->first();

        if ($previousStatus) {
            // Swap orders
            $tempOrder = $leadStatus->order;
            $leadStatus->update(['order' => $previousStatus->order]);
            $previousStatus->update(['order' => $tempOrder]);
        }

        return $leadStatus->fresh();
    }

    public function moveDown(int $id): LeadStatus
    {
        $leadStatus = LeadStatus::findOrFail($id);

        // Find the next status with higher order
        $nextStatus = LeadStatus::where('order', '>', $leadStatus->order)
            ->orderBy('order', 'asc')
            ->first();

        if ($nextStatus) {
            // Swap orders
            $tempOrder = $leadStatus->order;
            $leadStatus->update(['order' => $nextStatus->order]);
            $nextStatus->update(['order' => $tempOrder]);
        }

        return $leadStatus->fresh();
    }

    public function reorder(array $ids): void
    {
        foreach ($ids as $index => $id) {
            LeadStatus::where('id', $id)->update(['order' => $index + 1]);
        }
    }
}

