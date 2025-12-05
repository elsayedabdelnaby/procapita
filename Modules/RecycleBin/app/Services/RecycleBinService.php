<?php

namespace Modules\RecycleBin\app\Services;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Spatie\Activitylog\Traits\LogsActivity;

class RecycleBinService
{
    /**
     * Get all models that use SoftDeletes
     */
    public function getAvailableModels(): array
    {
        return [
            'companies' => [
                'model' => \Modules\Core\app\Models\Company::class,
                'name' => 'Companies',
                'module' => 'core',
                'display_field' => 'name',
            ],
            'lead_sources' => [
                'model' => \Modules\Drivers\app\Models\LeadSource::class,
                'name' => 'Lead Sources',
                'module' => 'drivers',
                'display_field' => 'name',
            ],
            'lead_statuses' => [
                'model' => \Modules\Drivers\app\Models\LeadStatus::class,
                'name' => 'Lead Statuses',
                'module' => 'drivers',
                'display_field' => 'name',
            ],
            'riding_companies' => [
                'model' => \Modules\RidingCarCompanies\app\Models\RidingCompany::class,
                'name' => 'Riding Companies',
                'module' => 'riding_companies',
                'display_field' => 'name',
            ],
            'campaigns' => [
                'model' => \Modules\Marketing\app\Models\Campaign::class,
                'name' => 'Campaigns',
                'module' => 'marketing',
                'display_field' => 'name',
            ],
            'campaign_types' => [
                'model' => \Modules\Marketing\app\Models\CampaignType::class,
                'name' => 'Campaign Types',
                'module' => 'marketing',
                'display_field' => 'name',
            ],
            'campaign_statuses' => [
                'model' => \Modules\Marketing\app\Models\CampaignStatus::class,
                'name' => 'Campaign Statuses',
                'module' => 'marketing',
                'display_field' => 'name',
            ],
            'campaign_channels' => [
                'model' => \Modules\Marketing\app\Models\CampaignChannel::class,
                'name' => 'Campaign Channels',
                'module' => 'marketing',
                'display_field' => 'name',
            ],
            'drivers' => [
                'model' => \Modules\Drivers\app\Models\Driver::class,
                'name' => 'Drivers',
                'module' => 'drivers',
                'display_field' => 'full_name',
            ],
            'lead_stages' => [
                'model' => \Modules\Drivers\app\Models\LeadStage::class,
                'name' => 'Lead Stages',
                'module' => 'drivers',
                'display_field' => 'name',
            ],
            'driver_stages' => [
                'model' => \Modules\Drivers\app\Models\DriverStage::class,
                'name' => 'Driver Stages',
                'module' => 'drivers',
                'display_field' => 'status', // Using status as display field
            ],
            'driver_documents' => [
                'model' => \Modules\Drivers\app\Models\DriverDocument::class,
                'name' => 'Driver Documents',
                'module' => 'drivers',
                'display_field' => 'original_filename', // Using original_filename as display field
            ],
            'company_users' => [
                'model' => \App\Models\User::class,
                'name' => 'Company Users',
                'module' => 'core',
                'display_field' => 'name',
            ],
        ];
    }

    /**
     * Get all soft deleted records for a specific model type
     */
    public function getDeletedRecords(string $modelType, ?int $companyId = null): Collection
    {
        $models = $this->getAvailableModels();
        
        if (!isset($models[$modelType])) {
            return collect([]);
        }

        $config = $models[$modelType];
        $modelClass = $config['model'];

        // Check if model uses SoftDeletes
        $usesSoftDeletes = in_array(
            \Illuminate\Database\Eloquent\SoftDeletes::class,
            class_uses_recursive($modelClass)
        );

        if (!$usesSoftDeletes) {
            // If model doesn't use SoftDeletes, return empty collection
            // These models won't have deleted records in recycle bin
            return collect([]);
        }

        $query = $modelClass::onlyTrashed();

        // Filter by company if applicable and company_id exists in the model
        if ($companyId && $this->modelHasCompanyId($modelClass)) {
            $query->where('company_id', $companyId);
        }

        return $query->orderBy('deleted_at', 'desc')->get();
    }

    /**
     * Get all deleted records grouped by model type
     */
    public function getAllDeletedRecords(?int $companyId = null): array
    {
        $models = $this->getAvailableModels();
        $result = [];

        foreach ($models as $key => $config) {
            $records = $this->getDeletedRecords($key, $companyId);
            
            if ($records->isNotEmpty()) {
                $result[$key] = [
                    'type' => $key,
                    'name' => $config['name'],
                    'module' => $config['module'],
                    'display_field' => $config['display_field'],
                    'count' => $records->count(),
                    'records' => $records->map(function ($record) use ($config) {
                        return [
                            'id' => $record->id,
                            'display_name' => $record->{$config['display_field']} ?? 'N/A',
                            'deleted_at' => $record->deleted_at,
                            'deleted_by' => $this->getDeletedBy($record),
                        ];
                    }),
                ];
            }
        }

        return $result;
    }

    /**
     * Restore a soft deleted record
     */
    public function restoreRecord(string $modelType, int $recordId, ?int $userId = null): bool
    {
        $models = $this->getAvailableModels();
        
        if (!isset($models[$modelType])) {
            return false;
        }

        $modelClass = $models[$modelType]['model'];
        
        // Check if model uses SoftDeletes
        $usesSoftDeletes = in_array(
            \Illuminate\Database\Eloquent\SoftDeletes::class,
            class_uses_recursive($modelClass)
        );

        if (!$usesSoftDeletes) {
            \Log::warning('Attempted to restore record from model that does not use SoftDeletes', [
                'model_type' => $modelType,
                'record_id' => $recordId,
            ]);
            return false;
        }
        
        $record = $modelClass::onlyTrashed()->find($recordId);
        
        if (!$record) {
            return false;
        }

        DB::beginTransaction();
        
        try {
            $record->restore();

            // Log the restore activity
            if (in_array(LogsActivity::class, class_uses_recursive($modelClass))) {
                activity()
                    ->performedOn($record)
                    ->causedBy($userId ? \App\Models\User::find($userId) : auth()->user())
                    ->withProperties([
                        'action' => 'restored',
                        'model_type' => $modelType,
                        'restored_at' => now(),
                    ])
                    ->log('Record restored from recycle bin');
            }

            DB::commit();
            return true;
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Failed to restore record', [
                'model_type' => $modelType,
                'record_id' => $recordId,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Permanently delete a record
     */
    public function forceDeleteRecord(string $modelType, int $recordId, ?int $userId = null): bool
    {
        $models = $this->getAvailableModels();
        
        if (!isset($models[$modelType])) {
            return false;
        }

        $modelClass = $models[$modelType]['model'];
        
        // Check if model uses SoftDeletes
        $usesSoftDeletes = in_array(
            \Illuminate\Database\Eloquent\SoftDeletes::class,
            class_uses_recursive($modelClass)
        );

        if (!$usesSoftDeletes) {
            \Log::warning('Attempted to permanently delete record from model that does not use SoftDeletes', [
                'model_type' => $modelType,
                'record_id' => $recordId,
            ]);
            return false;
        }
        
        $record = $modelClass::onlyTrashed()->find($recordId);
        
        if (!$record) {
            return false;
        }

        DB::beginTransaction();
        
        try {
            // Log before deletion
            if (in_array(LogsActivity::class, class_uses_recursive($modelClass))) {
                activity()
                    ->performedOn($record)
                    ->causedBy($userId ? \App\Models\User::find($userId) : auth()->user())
                    ->withProperties([
                        'action' => 'permanently_deleted',
                        'model_type' => $modelType,
                        'deleted_at' => now(),
                    ])
                    ->log('Record permanently deleted from recycle bin');
            }

            $record->forceDelete();

            DB::commit();
            return true;
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Failed to permanently delete record', [
                'model_type' => $modelType,
                'record_id' => $recordId,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Check if model has company_id field
     */
    protected function modelHasCompanyId(string $modelClass): bool
    {
        $model = new $modelClass;
        return in_array('company_id', $model->getFillable()) || 
               in_array('company_id', $model->getGuarded() === [] ? [] : array_keys($model->getAttributes()));
    }

    /**
     * Get who deleted the record (from activity log)
     */
    public function getDeletedBy(Model $record): ?array
    {
        try {
            $activity = \Spatie\Activitylog\Models\Activity::where('subject_type', get_class($record))
                ->where('subject_id', $record->id)
                ->where('description', 'deleted')
                ->latest()
                ->first();

            if ($activity && $activity->causer) {
                return [
                    'id' => $activity->causer->id,
                    'name' => $activity->causer->name ?? $activity->causer->email,
                ];
            }
        } catch (\Exception $e) {
            \Log::error('Failed to get deleted by info', ['error' => $e->getMessage()]);
        }

        return null;
    }

    /**
     * Get full record details for display
     */
    public function getRecordDetails(string $modelType, int $recordId): ?array
    {
        $models = $this->getAvailableModels();
        
        if (!isset($models[$modelType])) {
            return null;
        }

        $modelClass = $models[$modelType]['model'];
        $config = $models[$modelType];
        
        // Check if model uses SoftDeletes
        $usesSoftDeletes = in_array(
            \Illuminate\Database\Eloquent\SoftDeletes::class,
            class_uses_recursive($modelClass)
        );

        if (!$usesSoftDeletes) {
            return null;
        }
        
        $record = $modelClass::onlyTrashed()->find($recordId);
        
        if (!$record) {
            return null;
        }

        return [
            'id' => $record->id,
            'type' => $modelType,
            'name' => $config['name'],
            'display_name' => $record->{$config['display_field']} ?? 'N/A',
            'deleted_at' => $record->deleted_at,
            'deleted_by' => $this->getDeletedBy($record),
            'data' => $record->toArray(),
        ];
    }
}

