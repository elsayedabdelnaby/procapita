<?php

namespace Modules\Drivers\app\Services;

use Illuminate\Database\Eloquent\Collection;
use Modules\Drivers\app\Models\Driver;
use Modules\Drivers\app\Models\DriverDocument;
use Modules\Drivers\app\Models\DriverStage;
use Modules\RidingCarCompanies\app\Models\RidingCompany;

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
        $driver = Driver::create($data);

        // If riding company is selected, create stages and documents automatically
        if ($driver->riding_company_id) {
            $this->createDriverStagesFromRidingCompany($driver);
            $this->createDriverDocumentsFromRidingCompany($driver);
        }

        return $driver->fresh(['stages.stageTemplate', 'documents.documentTemplate']);
    }

    /**
     * Create driver stages from riding company stage templates
     */
    protected function createDriverStagesFromRidingCompany(Driver $driver): void
    {
        $ridingCompany = RidingCompany::find($driver->riding_company_id);

        if (! $ridingCompany) {
            return;
        }

        // Get active stage templates ordered by order
        $stageTemplates = $ridingCompany->activeStageTemplates()->get();

        if ($stageTemplates->isEmpty()) {
            return;
        }

        $stages = [];
        foreach ($stageTemplates as $template) {
            $stages[] = [
                'driver_id' => $driver->id,
                'stage_template_id' => $template->id,
                'stage_order' => $template->order,
                'status' => 'pending',
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        if (! empty($stages)) {
            DriverStage::insert($stages);

            // Set the first stage as current stage
            $firstStage = $stageTemplates->first();
            if ($firstStage) {
                $driver->update(['current_stage_id' => $firstStage->id]);
            }
        }
    }

    /**
     * Create driver documents from riding company document requirements
     */
    protected function createDriverDocumentsFromRidingCompany(Driver $driver): void
    {
        $ridingCompany = RidingCompany::find($driver->riding_company_id);

        if (! $ridingCompany) {
            return;
        }

        // Get active document requirements
        $documentRequirements = $ridingCompany->activeDocumentRequirements()->get();

        if ($documentRequirements->isEmpty()) {
            return;
        }

        $documents = [];
        foreach ($documentRequirements as $requirement) {
            $documents[] = [
                'driver_id' => $driver->id,
                'document_template_id' => $requirement->id,
                'status' => 'pending',
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        if (! empty($documents)) {
            DriverDocument::insert($documents);
        }
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

