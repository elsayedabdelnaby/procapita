<?php

namespace Modules\Drivers\app\Services;

use Illuminate\Database\Eloquent\Collection;
use Modules\Drivers\app\Models\Driver;
use Modules\Drivers\app\Models\DriverDocument;
use Modules\Drivers\app\Models\DriverStage;
use Modules\Drivers\app\Models\LeadStage;
use Modules\RidingCarCompanies\app\Models\RidingCompany;

class DriverService
{
    public function getAllDrivers(?int $companyId = null, ?\App\Models\User $user = null): Collection
    {
        $query = Driver::with(['company', 'ridingCompany', 'campaign', 'leadSource', 'assignedTo', 'assignedUsers', 'leadStatus', 'leadStage', 'currentStage']);

        if ($companyId) {
            $query->where('company_id', $companyId);
        }

        // Filter by assigned_to or assigned_users if user is not super admin
        if ($user && !$user->isSuperAdmin()) {
            $subordinateUserIds = $user->getSubordinateUserIds();
            
            // Always include current user ID to ensure they see their own data
            if (!in_array($user->id, $subordinateUserIds)) {
                $subordinateUserIds[] = $user->id;
            }
            
            // Filter by assigned_to OR assigned_users (multi-select)
            $query->where(function ($q) use ($subordinateUserIds) {
                $q->whereIn('assigned_to', $subordinateUserIds)
                  ->orWhereHas('assignedUsers', function ($q) use ($subordinateUserIds) {
                      $q->whereIn('users.id', $subordinateUserIds);
                  });
            });
        }

        return $query->orderBy('updated_at', 'desc')->get();
    }

    public function getDriverById(int $id): ?Driver
    {
        return Driver::with([
            'company',
            'ridingCompany',
            'campaign',
            'leadSource',
            'assignedTo',
            'assignedUsers',
            'leadStatus',
            'leadStage',
            'currentStage',
            'stages.stageTemplate',
            'documents.documentTemplate',
        ])->find($id);
    }

    public function createDriver(array $data): Driver
    {
        // Reformat phone numbers
        if (isset($data['phone'])) {
            $data['phone'] = $this->reformatPhoneNumber($data['phone']);
        }
        if (isset($data['whatsapp_phone'])) {
            $data['whatsapp_phone'] = $this->reformatPhoneNumber($data['whatsapp_phone']);
        }

        // Remove driver_num from data if present - it's auto-generated
        unset($data['driver_num']);

        // Extract assigned_users if present
        $assignedUsers = [];
        if (isset($data['assigned_users']) && is_array($data['assigned_users'])) {
            $assignedUsers = array_filter(array_map('intval', $data['assigned_users']));
            unset($data['assigned_users']);
        }

        $driver = Driver::create($data);

        // Sync assigned users
        if (!empty($assignedUsers)) {
            $driver->assignedUsers()->sync($assignedUsers);
        }

        // If riding company is selected, create stages and documents automatically
        if ($driver->riding_company_id) {
            $this->createDriverStagesFromRidingCompany($driver);
            $this->createDriverDocumentsFromRidingCompany($driver);
        }

        return $driver->fresh(['stages.stageTemplate', 'documents.documentTemplate', 'assignedUsers']);
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
        // Reformat phone numbers
        if (isset($data['phone'])) {
            $data['phone'] = $this->reformatPhoneNumber($data['phone']);
        }
        if (isset($data['whatsapp_phone'])) {
            $data['whatsapp_phone'] = $this->reformatPhoneNumber($data['whatsapp_phone']);
        }

        // Remove driver_num from data if present - it's auto-generated and read-only
        unset($data['driver_num']);

        $driver = Driver::findOrFail($id);

        // Convert empty string to null for lead_stage_id and ensure it's an integer
        if (isset($data['lead_stage_id'])) {
            if ($data['lead_stage_id'] === '' || $data['lead_stage_id'] === null) {
                $data['lead_stage_id'] = null;
            } else {
                $data['lead_stage_id'] = (int) $data['lead_stage_id'];
            }
        }

        // Extract assigned_users if present
        $assignedUsers = null;
        if (isset($data['assigned_users'])) {
            if (is_array($data['assigned_users'])) {
                $assignedUsers = array_filter(array_map('intval', $data['assigned_users']));
            } elseif ($data['assigned_users'] === '' || $data['assigned_users'] === null) {
                $assignedUsers = [];
            }
            unset($data['assigned_users']);
        }

        // Validate lead_stage_id update if requires_all_documents_approved is true
        if (isset($data['lead_stage_id']) && $data['lead_stage_id'] !== null && $data['lead_stage_id'] !== $driver->lead_stage_id) {
            $newLeadStage = LeadStage::find($data['lead_stage_id']);
            
            if ($newLeadStage && $newLeadStage->requires_all_documents_approved) {
                // Check if all driver documents are approved
                $totalDocuments = $driver->documents()->count();
                $approvedDocuments = $driver->documents()->where('status', 'approved')->count();

                if ($totalDocuments > 0 && $approvedDocuments < $totalDocuments) {
                    $pendingCount = $totalDocuments - $approvedDocuments;
                    throw new \Exception("Cannot update driver to this stage. All driver documents must be approved first. {$pendingCount} document(s) still pending approval.");
                }
            }
        }

        $driver->update($data);

        // Sync assigned users if provided
        if ($assignedUsers !== null) {
            $driver->assignedUsers()->sync($assignedUsers);
        }

        return $driver->fresh(['assignedUsers']);
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

    /**
     * Helper function to reformat phone numbers
     */
    protected function reformatPhoneNumber($phoneNumber)
    {
        // تحويل الأرقام العربية إلى إنجليزية
        $arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
        $englishNumerals = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
        $phoneNumber = str_replace($arabicNumerals, $englishNumerals, $phoneNumber);

        // ✅ إزالة جميع الرموز غير الرقمية (بما فيها النقطة ".")
        $cleanedNumber = preg_replace('/[^0-9+]/', '', $phoneNumber);

        // تطبيق قواعد التنسيق
        if (strpos($cleanedNumber, '0020') === 0 && strlen($cleanedNumber) === 14) {
            $cleanedNumber = '0' . substr($cleanedNumber, 4);
        } elseif (strpos($cleanedNumber, '+20') === 0 && strlen($cleanedNumber) === 13) {
            $cleanedNumber = '0' . substr($cleanedNumber, 3);
        } elseif (strpos($cleanedNumber, '20') === 0 && strlen($cleanedNumber) === 12) {
            $cleanedNumber = '0' . substr($cleanedNumber, 2);
        } elseif (preg_match('/^(10|11|12|15)/', $cleanedNumber) && strlen($cleanedNumber) === 10) {
            $cleanedNumber = '0' . $cleanedNumber;
        }

        // حذف علامة + من البداية إذا كانت موجودة
        if (strpos($cleanedNumber, '+') === 0) {
            $cleanedNumber = substr($cleanedNumber, 1);
        }

        return $cleanedNumber;
    }
}

