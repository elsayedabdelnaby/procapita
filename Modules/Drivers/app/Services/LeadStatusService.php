<?php

namespace Modules\Drivers\app\Services;

use Illuminate\Database\Eloquent\Collection;
use Modules\Drivers\app\Models\LeadStatus;

class LeadStatusService
{
    public function getAllLeadStatuses(?int $companyId = null): Collection
    {
        $query = LeadStatus::with('company');

        if ($companyId) {
            $query->where('company_id', $companyId);
        }

        return $query->ordered()->get();
    }

    public function getLeadStatusById(int $id): ?LeadStatus
    {
        return LeadStatus::with('company')->find($id);
    }

    public function createLeadStatus(array $data): LeadStatus
    {
        // If order is not set, assign the next available order number
        if (! isset($data['order']) || $data['order'] === 0) {
            $companyId = $data['company_id'] ?? null;
            $query = LeadStatus::query();
            if ($companyId) {
                $query->where('company_id', $companyId);
            }
            $maxOrder = $query->max('order') ?? 0;
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

    public function deleteLeadStatus(int $id): bool
    {
        $leadStatus = LeadStatus::findOrFail($id);
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
        $companyId = $leadStatus->company_id;

        // Find the previous status with lower order
        $previousStatus = LeadStatus::where('company_id', $companyId)
            ->where('order', '<', $leadStatus->order)
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
        $companyId = $leadStatus->company_id;

        // Find the next status with higher order
        $nextStatus = LeadStatus::where('company_id', $companyId)
            ->where('order', '>', $leadStatus->order)
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

