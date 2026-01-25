<?php

namespace Modules\Drivers\app\Services;

use Illuminate\Database\Eloquent\Collection;
use Modules\Drivers\app\Models\LeadStage;

class LeadStageService
{
    public function getAllLeadStages(?int $ridingCompanyId = null, ?int $companyId = null): Collection
    {
        $query = LeadStage::query();
        
        // Check if columns exist
        $hasRidingCompanyId = \Illuminate\Support\Facades\Schema::hasColumn('lead_stages', 'riding_company_id');
        $hasRidingCompanyIds = \Illuminate\Support\Facades\Schema::hasColumn('lead_stages', 'riding_company_ids');

        if ($ridingCompanyId) {
            $query->where(function ($q) use ($ridingCompanyId, $hasRidingCompanyId, $hasRidingCompanyIds) {
                if ($hasRidingCompanyId) {
                    $q->where('riding_company_id', $ridingCompanyId);
                }
                if ($hasRidingCompanyIds) {
                    $q->orWhereJsonContains('riding_company_ids', $ridingCompanyId);
                }
            });
        } elseif ($companyId) {
            // Get all riding companies for this company
            $ridingCompanyIds = \Modules\RidingCarCompanies\app\Models\RidingCompany::where('company_id', $companyId)
                ->pluck('id')
                ->toArray();
            
            if (!empty($ridingCompanyIds)) {
                // Get all riding company IDs that are NOT in our company's riding companies
                $allOtherRidingCompanyIds = \Modules\RidingCarCompanies\app\Models\RidingCompany::where('company_id', '!=', $companyId)
                    ->pluck('id')
                    ->toArray();
                
                $query->where(function ($q) use ($ridingCompanyIds, $hasRidingCompanyId, $hasRidingCompanyIds, $allOtherRidingCompanyIds) {
                    if ($hasRidingCompanyId) {
                        // Lead stages with single riding_company_id from this company
                        $q->whereIn('riding_company_id', $ridingCompanyIds);
                    }
                    if ($hasRidingCompanyIds) {
                        // Filter lead stages that contain ONLY riding companies from this company
                        $q->orWhere(function ($q2) use ($ridingCompanyIds, $allOtherRidingCompanyIds) {
                            // Lead stage must have at least one riding company from this company
                            $q2->where(function ($q3) use ($ridingCompanyIds) {
                                foreach ($ridingCompanyIds as $rcId) {
                                    $q3->orWhereJsonContains('riding_company_ids', $rcId);
                                }
                            });
                            // Ensure ALL riding companies in riding_company_ids belong to this company
                            // Exclude lead stages that contain any riding company from other companies
                            if (!empty($allOtherRidingCompanyIds)) {
                                $q2->where(function ($q4) use ($allOtherRidingCompanyIds) {
                                    foreach ($allOtherRidingCompanyIds as $otherRcId) {
                                        $q4->whereRaw('NOT JSON_CONTAINS(COALESCE(riding_company_ids, JSON_ARRAY()), ?)', [json_encode($otherRcId)]);
                                    }
                                });
                            }
                        });
                    }
                });
            } else {
                // If company has no riding companies, show no lead stages
                $query->whereRaw('1 = 0');
            }
        }

        return $query->ordered()->get();
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

        // Check if columns exist
        $hasRidingCompanyId = \Illuminate\Support\Facades\Schema::hasColumn('lead_stages', 'riding_company_id');
        $hasRidingCompanyIds = \Illuminate\Support\Facades\Schema::hasColumn('lead_stages', 'riding_company_ids');

        // Handle riding_company_ids - set riding_company_id from first element for backward compatibility
        if (isset($data['riding_company_ids']) && is_array($data['riding_company_ids']) && !empty($data['riding_company_ids'])) {
            // Convert to integers
            $data['riding_company_ids'] = array_map('intval', $data['riding_company_ids']);
            
            // Only set riding_company_id if column exists
            if ($hasRidingCompanyId && !isset($data['riding_company_id'])) {
                $data['riding_company_id'] = $data['riding_company_ids'][0];
            } elseif (!$hasRidingCompanyId) {
                unset($data['riding_company_id']);
            }
            
            // Remove riding_company_ids if column doesn't exist
            if (!$hasRidingCompanyIds) {
                unset($data['riding_company_ids']);
            }
        } else {
            unset($data['riding_company_ids']);
            if (!$hasRidingCompanyId) {
                unset($data['riding_company_id']);
            }
        }

        return LeadStage::create($data);
    }

    public function updateLeadStage(int $id, array $data): LeadStage
    {
        // Check if columns exist
        $hasRidingCompanyId = \Illuminate\Support\Facades\Schema::hasColumn('lead_stages', 'riding_company_id');
        $hasRidingCompanyIds = \Illuminate\Support\Facades\Schema::hasColumn('lead_stages', 'riding_company_ids');

        // Handle riding_company_ids - set riding_company_id from first element for backward compatibility
        if (isset($data['riding_company_ids']) && is_array($data['riding_company_ids']) && !empty($data['riding_company_ids'])) {
            // Convert to integers
            $data['riding_company_ids'] = array_map('intval', $data['riding_company_ids']);
            
            // Only set riding_company_id if column exists
            if ($hasRidingCompanyId && !isset($data['riding_company_id'])) {
                $data['riding_company_id'] = $data['riding_company_ids'][0];
            } elseif (!$hasRidingCompanyId) {
                unset($data['riding_company_id']);
            }
            
            // Remove riding_company_ids if column doesn't exist
            if (!$hasRidingCompanyIds) {
                unset($data['riding_company_ids']);
            }
        } else {
            unset($data['riding_company_ids']);
            if (!$hasRidingCompanyId) {
                unset($data['riding_company_id']);
            }
        }

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

