<?php

namespace Modules\Drivers\app\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Modules\Core\app\Models\Company;
use Modules\Marketing\app\Models\Campaign;
use Modules\RidingCarCompanies\app\Models\RidingCompany;
use Modules\RidingCarCompanies\app\Models\RidingCompanyStageTemplate;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Driver extends Model
{
    use HasFactory, LogsActivity, SoftDeletes;

    protected $fillable = [
        'uuid',
        'company_id',
        'full_name',
        'phone',
        'whatsapp_phone',
        'email',
        'riding_company_id',
        'campaign_id',
        'lead_source_id',
        'assigned_to',
        'team_leader_id',
        'account_manager_id',
        'resigned_leads',
        'assigned_time',
        'last_assigned_time',
        'last_assigned_by',
        'lead_status_id',
        'lead_status_comment',
        'next_follow_up',
        'last_follow_up',
        'lead_stage_id',
        'driver_stage_id',
        'current_stage_id',
        'notes',
        'cancel_reason',
        'driver_num',
        'duplicate',
        'confirm_duplicate',
        'next_time',
        'worked_with_us_before',
        'vehicle_type_and_year',
        'city',
        'feedback_count',
        'vehicle_type',
        'car_or_scooter',
        'has_worked_before',
        'governorate',
    ];

    protected function casts(): array
    {
        return [
            'next_follow_up' => 'datetime',
            'last_follow_up' => 'datetime',
            'assigned_time' => 'datetime',
            'last_assigned_time' => 'datetime',
            'confirm_duplicate' => 'boolean',
        ];
    }

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->uuid)) {
                $model->uuid = (string) Str::uuid();
            }
        });

        // Calculate duplicate count after saving
        static::saved(function ($driver) {
            $driverService = app(\Modules\Drivers\app\Services\DriverService::class);

            // Check if phone or whatsapp_phone was changed
            $phoneChanged = $driver->wasChanged('phone');
            $whatsappChanged = $driver->wasChanged('whatsapp_phone');
            $wasCreated = $driver->wasRecentlyCreated;

            // Update duplicate count for this driver
            if ($wasCreated || $phoneChanged || $whatsappChanged || ! isset($driver->duplicate)) {
                $duplicateCount = $driverService->calculateDuplicateCount($driver);
                if (($driver->duplicate ?? 0) != $duplicateCount) {
                    $driver->updateQuietly(['duplicate' => $duplicateCount]);
                }
            }

            // If phone or whatsapp_phone changed, update duplicate count for all affected drivers
            if ($phoneChanged || $whatsappChanged) {
                $oldPhone = $driver->getOriginal('phone');
                $oldWhatsapp = $driver->getOriginal('whatsapp_phone');
                $newPhone = $driver->phone;
                $newWhatsapp = $driver->whatsapp_phone;

                // Get all drivers that had the old phone or whatsapp
                $affectedIds = [];
                if ($oldPhone) {
                    $affectedIds = array_merge($affectedIds, Driver::where('id', '!=', $driver->id)
                        ->where(function ($q) use ($oldPhone) {
                            $q->where('phone', $oldPhone)->orWhere('whatsapp_phone', $oldPhone);
                        })
                        ->pluck('id')
                        ->toArray());
                }
                if ($oldWhatsapp && $oldWhatsapp !== $oldPhone) {
                    $affectedIds = array_merge($affectedIds, Driver::where('id', '!=', $driver->id)
                        ->where(function ($q) use ($oldWhatsapp) {
                            $q->where('phone', $oldWhatsapp)->orWhere('whatsapp_phone', $oldWhatsapp);
                        })
                        ->pluck('id')
                        ->toArray());
                }

                // Also get drivers with new phone/whatsapp
                if ($newPhone) {
                    $affectedIds = array_merge($affectedIds, Driver::where('id', '!=', $driver->id)
                        ->where(function ($q) use ($newPhone) {
                            $q->where('phone', $newPhone)->orWhere('whatsapp_phone', $newPhone);
                        })
                        ->pluck('id')
                        ->toArray());
                }
                if ($newWhatsapp && $newWhatsapp !== $newPhone) {
                    $affectedIds = array_merge($affectedIds, Driver::where('id', '!=', $driver->id)
                        ->where(function ($q) use ($newWhatsapp) {
                            $q->where('phone', $newWhatsapp)->orWhere('whatsapp_phone', $newWhatsapp);
                        })
                        ->pluck('id')
                        ->toArray());
                }

                // Update duplicate count for all affected drivers
                $uniqueAffectedIds = array_unique($affectedIds);
                foreach ($uniqueAffectedIds as $affectedId) {
                    $affectedDriver = Driver::find($affectedId);
                    if ($affectedDriver) {
                        $duplicateCount = $driverService->calculateDuplicateCount($affectedDriver);
                        if (($affectedDriver->duplicate ?? 0) != $duplicateCount) {
                            $affectedDriver->updateQuietly(['duplicate' => $duplicateCount]);
                        }
                    }
                }
            }
        });

        // Set driver_num to id after creation
        static::created(function ($model) {
            if (empty($model->driver_num)) {
                $model->driver_num = (string) $model->id;
                $model->saveQuietly(); // Save without triggering events
            }
        });

        // Track changes to lead_status_id, riding_company_id, lead_stage_id, lead_status_comment, next_follow_up and create follow-up
        static::updated(function ($driver) {
            // Check if lead_status_id changed BEFORE any saveQuietly calls
            $leadStatusChanged = $driver->wasChanged('lead_status_id') && $driver->lead_status_id;

            // Increment feedback_count when lead_status_id is updated
            if ($leadStatusChanged) {
                $driver->feedback_count = ($driver->getOriginal('feedback_count') ?? 0) + 1;
                $driver->saveQuietly();
            }

            // Check for changes BEFORE any modifications
            $changedFields = ['lead_status_id', 'riding_company_id', 'lead_stage_id', 'lead_status_comment', 'next_follow_up'];
            $hasRelevantChange = false;
            $shouldUpdateLastFollowUp = false;

            foreach ($changedFields as $field) {
                if ($driver->wasChanged($field)) {
                    $hasRelevantChange = true;
                    $shouldUpdateLastFollowUp = true;
                    break;
                }
            }

            // Also check if notes changed
            if ($driver->wasChanged('notes')) {
                $hasRelevantChange = true;
            }

            // Update last_follow_up if any relevant field changed
            if ($shouldUpdateLastFollowUp) {
                $driver->last_follow_up = now(); // Use now() instead of now()->toDateString() to include time
                // Save without triggering events to avoid infinite loop
                $driver->saveQuietly();
            }

            // Create follow-up when lead_status_id, next_follow_up, or lead_status_comment changes
            if ($hasRelevantChange) {
                $user = \Illuminate\Support\Facades\Auth::user();
                $userName = $user ? $user->name : 'System'; // اسم المستخدم الذي قام بالتغيير

                // assigned_to في Follow-up = assigned_to من Driver (وليس المستخدم الذي قام بالتغيير)
                $assignedToUserId = $driver->assigned_to;

                // Get current values from Driver
                $ridingCompanyName = $driver->ridingCompany ? $driver->ridingCompany->name : null;
                $leadStageName = $driver->leadStage ? $driver->leadStage->name : null;
                $leadStatusName = $driver->leadStatus ? $driver->leadStatus->name : null;
                $leadStatusComment = $driver->lead_status_comment;
                $driverNum = $driver->driver_num ?? (string) $driver->id;

                // Get Driver Stage name (current stage)
                $driverStageName = null;
                if ($driver->current_stage_id) {
                    $currentStage = $driver->currentStage;
                    if ($currentStage) {
                        // Get the actual driver stage record
                        $currentStageOrder = $currentStage->order ?? null;
                        if ($currentStageOrder) {
                            $driverStage = $driver->stages()->where('stage_order', $currentStageOrder)->first();
                            if ($driverStage) {
                                // Use the stage template name
                                $driverStageName = $currentStage->name;
                            }
                        } else {
                            // Fallback to stage template name
                            $driverStageName = $currentStage->name;
                        }
                    }
                }

                // Get Team Leader name
                $teamLeaderName = null;
                if ($driver->team_leader_id) {
                    $teamLeader = $driver->teamLeader;
                    if ($teamLeader) {
                        $teamLeaderName = $teamLeader->name;
                    }
                }

                // Get Account Manager name
                $accountManagerName = null;
                if ($driver->account_manager_id) {
                    $accountManager = $driver->accountManager;
                    if ($accountManager) {
                        $accountManagerName = $accountManager->name;
                    }
                }

                // Create follow-up record with all data from Driver
                try {
                    DriverFollowUp::create([
                        'driver_id' => $driver->id,
                        'assigned_to' => $assignedToUserId, // assigned_to من Driver (وليس المستخدم الذي قام بالتغيير)
                        'user_name' => $userName, // اسم المستخدم الذي قام بالتغيير
                        'sales_sign_2' => $userName, // اسم السيلز (نفس user_name)
                        'team_leader' => $teamLeaderName, // اسم Team Leader وقت الإنشاء
                        'account_manager' => $accountManagerName, // اسم Account Manager وقت الإنشاء
                        'created_time' => now(),
                        'riding_company' => $ridingCompanyName,
                        'lead_stage' => $leadStageName,
                        'lead_status' => $leadStatusName,
                        'lead_status_comment' => $leadStatusComment, // Feedback Comment
                        'driver_stage' => $driverStageName, // Driver Stage
                        'notes' => $driver->notes,
                        'driver_num' => $driverNum,
                    ]);
                } catch (\Exception $e) {
                    // Log error but don't break the update process
                    \Log::error('Failed to create follow-up for driver '.$driver->id.': '.$e->getMessage());
                }
            }
        });

        // When a driver is deleted (soft or hard), delete all related data
        static::deleting(function ($driver) {
            Log::info('Driver deleting event triggered', ['driver_id' => $driver->id]);

            // Use direct query to get all related data (bypassing soft delete scope if needed)
            // This ensures we get all records even if driver is soft deleted
            $stages = \Modules\Drivers\app\Models\DriverStage::where('driver_id', $driver->id)->get();
            $documents = \Modules\Drivers\app\Models\DriverDocument::where('driver_id', $driver->id)->get();

            Log::info('Found related data to delete', [
                'driver_id' => $driver->id,
                'stages_count' => $stages->count(),
                'documents_count' => $documents->count(),
            ]);

            // Delete all driver stages using DB delete for immediate deletion
            if ($stages->isNotEmpty()) {
                DB::table('driver_stages')->where('driver_id', $driver->id)->delete();
                Log::info('Deleted all driver stages from database', ['driver_id' => $driver->id, 'count' => $stages->count()]);
            }

            // Delete all driver documents and their files
            foreach ($documents as $document) {
                Log::info('Deleting driver document', [
                    'document_id' => $document->id,
                    'driver_id' => $driver->id,
                    'uploaded_path' => $document->uploaded_path,
                ]);

                // Delete the file from storage if it exists
                if ($document->uploaded_path && \Illuminate\Support\Facades\Storage::disk('public')->exists($document->uploaded_path)) {
                    \Illuminate\Support\Facades\Storage::disk('public')->delete($document->uploaded_path);
                    Log::info('Deleted file from storage', ['path' => $document->uploaded_path]);
                }
            }

            // Delete all driver documents from database using DB delete for immediate deletion
            if ($documents->isNotEmpty()) {
                DB::table('driver_documents')->where('driver_id', $driver->id)->delete();
                Log::info('Deleted all driver documents from database', ['driver_id' => $driver->id, 'count' => $documents->count()]);
            }

            Log::info('Driver deletion completed', ['driver_id' => $driver->id]);
        });

        // When a driver is force deleted (hard delete), ensure all related data is also deleted
        // Note: DriverStage and DriverDocument don't use SoftDeletes, so regular delete is sufficient
        static::forceDeleting(function ($driver) {
            Log::info('Driver force deleting event triggered', ['driver_id' => $driver->id]);

            // Get all related data before deletion
            $documents = \Modules\Drivers\app\Models\DriverDocument::where('driver_id', $driver->id)->get();

            // Delete all driver documents and their files
            foreach ($documents as $document) {
                // Delete the file from storage if it exists
                if ($document->uploaded_path && \Illuminate\Support\Facades\Storage::disk('public')->exists($document->uploaded_path)) {
                    \Illuminate\Support\Facades\Storage::disk('public')->delete($document->uploaded_path);
                    Log::info('Deleted file from storage (force delete)', ['path' => $document->uploaded_path]);
                }
            }

            // Delete all driver stages and documents from database using DB delete for immediate deletion
            DB::table('driver_stages')->where('driver_id', $driver->id)->delete();
            DB::table('driver_documents')->where('driver_id', $driver->id)->delete();

            Log::info('Driver force deletion completed', ['driver_id' => $driver->id]);
        });
    }

    protected static function newFactory()
    {
        return \Modules\Drivers\database\factories\DriverFactory::new();
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['full_name', 'phone', 'email', 'onboarding_status', 'lead_status_id', 'assigned_to'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }

    // Relationships
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function ridingCompany(): BelongsTo
    {
        return $this->belongsTo(RidingCompany::class);
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class);
    }

    public function leadSource(): BelongsTo
    {
        return $this->belongsTo(LeadSource::class);
    }

    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function teamLeader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'team_leader_id');
    }

    public function accountManager(): BelongsTo
    {
        return $this->belongsTo(User::class, 'account_manager_id');
    }

    public function lastAssignedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'last_assigned_by');
    }

    public function assignedUsers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'driver_user', 'driver_id', 'user_id')
            ->withTimestamps();
    }

    public function leadStatus(): BelongsTo
    {
        return $this->belongsTo(LeadStatus::class);
    }

    public function leadStage(): BelongsTo
    {
        return $this->belongsTo(LeadStage::class);
    }

    public function driverStage(): BelongsTo
    {
        return $this->belongsTo(DriverStage::class, 'driver_stage_id');
    }

    public function currentStage(): BelongsTo
    {
        return $this->belongsTo(RidingCompanyStageTemplate::class, 'current_stage_id');
    }

    public function stages(): HasMany
    {
        return $this->hasMany(DriverStage::class)->orderBy('stage_order');
    }

    public function documents(): HasMany
    {
        return $this->hasMany(DriverDocument::class);
    }

    public function followUps(): HasMany
    {
        return $this->hasMany(DriverFollowUp::class);
    }

    // Scopes
    public function scopeForCompany($query, int $companyId)
    {
        return $query->where('company_id', $companyId);
    }

    public function scopeForRidingCompany($query, int $ridingCompanyId)
    {
        return $query->where('riding_company_id', $ridingCompanyId);
    }

    public function scopeForCampaign($query, int $campaignId)
    {
        return $query->where('campaign_id', $campaignId);
    }

    public function scopeAssignedTo($query, int $userId)
    {
        return $query->where('assigned_to', $userId);
    }

    public function scopeWithLeadStatus($query, int $leadStatusId)
    {
        return $query->where('lead_status_id', $leadStatusId);
    }

    // Stage Progress Methods

    /**
     * Get all required stages from the riding company
     */
    public function getRequiredStages()
    {
        if (! $this->riding_company_id) {
            return collect([]);
        }

        return $this->ridingCompany
            ->activeStageTemplates()
            ->ordered()
            ->get();
    }

    /**
     * Get completed stages for this driver
     */
    public function getCompletedStages()
    {
        return $this->stages()
            ->where('status', 'completed')
            ->with('ridingCompany')
            ->get();
    }

    /**
     * Get pending stages for this driver
     */
    public function getPendingStages()
    {
        return $this->stages()
            ->where('status', 'pending')
            ->with('ridingCompany')
            ->get();
    }

    /**
     * Get in-progress stages for this driver
     */
    public function getInProgressStages()
    {
        return $this->stages()
            ->where('status', 'in_progress')
            ->with('ridingCompany')
            ->get();
    }

    /**
     * Get rejected stages for this driver
     */
    public function getRejectedStages()
    {
        return $this->stages()
            ->where('status', 'rejected')
            ->with('ridingCompany')
            ->get();
    }

    /**
     * Check if driver has completed all required stages
     */
    public function hasCompletedAllStages(): bool
    {
        $requiredStages = $this->getRequiredStages();

        if ($requiredStages->isEmpty()) {
            return false; // No stages required
        }

        $completedStageOrders = $this->stages()
            ->where('status', 'completed')
            ->pluck('stage_order')
            ->toArray();

        $requiredStageOrders = $requiredStages->pluck('order')->toArray();

        // Check if all required stages are completed
        return count(array_intersect($completedStageOrders, $requiredStageOrders)) === count($requiredStageOrders);
    }

    /**
     * Get stages progress percentage
     */
    public function getStagesProgress(): array
    {
        $requiredStages = $this->getRequiredStages();

        if ($requiredStages->isEmpty()) {
            return [
                'total' => 0,
                'completed' => 0,
                'pending' => 0,
                'in_progress' => 0,
                'rejected' => 0,
                'percentage' => 0,
            ];
        }

        $total = $requiredStages->count();
        $completed = $this->stages()->where('status', 'completed')->count();
        $pending = $this->stages()->where('status', 'pending')->count();
        $inProgress = $this->stages()->where('status', 'in_progress')->count();
        $rejected = $this->stages()->where('status', 'rejected')->count();

        $percentage = $total > 0 ? round(($completed / $total) * 100, 2) : 0;

        return [
            'total' => $total,
            'completed' => $completed,
            'pending' => $pending,
            'in_progress' => $inProgress,
            'rejected' => $rejected,
            'percentage' => $percentage,
        ];
    }

    /**
     * Get the next stage that should be completed
     */
    public function getNextStage(): ?RidingCompanyStageTemplate
    {
        $requiredStages = $this->getRequiredStages();

        if ($requiredStages->isEmpty()) {
            return null;
        }

        $completedStageOrders = $this->stages()
            ->where('status', 'completed')
            ->pluck('stage_order')
            ->toArray();

        // Find first stage that is not completed
        foreach ($requiredStages as $stage) {
            if (! in_array($stage->order, $completedStageOrders)) {
                return $stage;
            }
        }

        return null; // All stages completed
    }

    /**
     * Get detailed status of all stages with their progress
     */
    public function getStagesStatus(): array
    {
        $requiredStages = $this->getRequiredStages();
        $driverStages = $this->stages()
            ->with('ridingCompany')
            ->get()
            ->keyBy('stage_order');

        $stagesStatus = [];

        foreach ($requiredStages as $requiredStage) {
            $driverStage = $driverStages->get($requiredStage->order);

            $stagesStatus[] = [
                'stage_template' => $requiredStage,
                'driver_stage' => $driverStage,
                'status' => $driverStage ? $driverStage->status : 'not_started',
                'is_completed' => $driverStage && $driverStage->status === 'completed',
                'is_pending' => $driverStage && $driverStage->status === 'pending',
                'is_in_progress' => $driverStage && $driverStage->status === 'in_progress',
                'is_rejected' => $driverStage && $driverStage->status === 'rejected',
                'completed_at' => $driverStage?->completed_at,
                'notes' => $driverStage?->notes,
            ];
        }

        return $stagesStatus;
    }

    /**
     * Get current stage information
     */
    public function getCurrentStageInfo(): ?array
    {
        if (! $this->current_stage_id) {
            return null;
        }

        $currentStage = $this->currentStage;
        if (! $currentStage) {
            return null;
        }

        // Find driver stage by matching current_stage_id with stage template order
        $currentStageOrder = $currentStage->order ?? null;
        $driverStage = $currentStageOrder
            ? $this->stages()->where('stage_order', $currentStageOrder)->first()
            : null;

        return [
            'stage_template' => $currentStage,
            'driver_stage' => $driverStage,
            'status' => $driverStage ? $driverStage->status : 'not_started',
            'is_completed' => $driverStage && $driverStage->status === 'completed',
            'completed_at' => $driverStage?->completed_at,
        ];
    }
}
