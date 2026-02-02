<?php

namespace Modules\Drivers\app\Services;

use Illuminate\Database\Eloquent\Collection;
use Modules\Drivers\app\Models\LeadStage;

class LeadStageService
{
    public function getAllLeadStages(): Collection
    {
        return LeadStage::query()->ordered()->get();
    }

    public function getLeadStageById(int $id): ?LeadStage
    {
        return LeadStage::find($id);
    }

    public function createLeadStage(array $data): LeadStage
    {
        // If order is not set, assign the next available order number
        if (! isset($data['order']) || $data['order'] === 0) {
            $maxOrder = LeadStage::max('order') ?? 0;
            $data['order'] = $maxOrder + 1;
        }

        return LeadStage::create($data);
    }

    public function updateLeadStage(int $id, array $data): LeadStage
    {
        $leadStage = LeadStage::findOrFail($id);
        $leadStage->update($data);

        return $leadStage->fresh();
    }

    public function deleteLeadStage(int $id): bool
    {
        $leadStage = LeadStage::findOrFail($id);
        return $leadStage->delete();
    }

    public function toggleActive(int $id): LeadStage
    {
        $leadStage = LeadStage::findOrFail($id);
        $leadStage->update(['active' => ! $leadStage->active]);

        return $leadStage->fresh();
    }

    public function moveUp(int $id): LeadStage
    {
        $leadStage = LeadStage::findOrFail($id);

        // Find the previous stage with lower order
        $previousStage = LeadStage::where('order', '<', $leadStage->order)
            ->orderBy('order', 'desc')
            ->first();

        if ($previousStage) {
            // Swap orders
            $tempOrder = $leadStage->order;
            $leadStage->update(['order' => $previousStage->order]);
            $previousStage->update(['order' => $tempOrder]);
        }

        return $leadStage->fresh();
    }

    public function moveDown(int $id): LeadStage
    {
        $leadStage = LeadStage::findOrFail($id);

        // Find the next stage with higher order
        $nextStage = LeadStage::where('order', '>', $leadStage->order)
            ->orderBy('order', 'asc')
            ->first();

        if ($nextStage) {
            // Swap orders
            $tempOrder = $leadStage->order;
            $leadStage->update(['order' => $nextStage->order]);
            $nextStage->update(['order' => $tempOrder]);
        }

        return $leadStage->fresh();
    }

    public function reorder(array $ids): void
    {
        foreach ($ids as $index => $id) {
            LeadStage::where('id', $id)->update(['order' => $index + 1]);
        }
    }
}

