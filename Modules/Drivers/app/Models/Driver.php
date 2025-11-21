<?php

namespace Modules\Drivers\app\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use Modules\Core\app\Models\Company;
use Modules\Marketing\app\Models\Campaign;
use Modules\RidingCarCompanies\app\Models\RidingCompany;
use Modules\RidingCarCompanies\app\Models\RidingCompanyStageTemplate;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Driver extends Model
{
    use HasFactory, SoftDeletes, LogsActivity;

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
        'lead_status_id',
        'current_stage_id',
        'notes',
    ];

    protected function casts(): array
    {
        return [];
    }

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->uuid)) {
                $model->uuid = (string) Str::uuid();
            }
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

    public function leadStatus(): BelongsTo
    {
        return $this->belongsTo(LeadStatus::class);
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
            ->with('stageTemplate')
            ->get();
    }

    /**
     * Get pending stages for this driver
     */
    public function getPendingStages()
    {
        return $this->stages()
            ->where('status', 'pending')
            ->with('stageTemplate')
            ->get();
    }

    /**
     * Get in-progress stages for this driver
     */
    public function getInProgressStages()
    {
        return $this->stages()
            ->where('status', 'in_progress')
            ->with('stageTemplate')
            ->get();
    }

    /**
     * Get rejected stages for this driver
     */
    public function getRejectedStages()
    {
        return $this->stages()
            ->where('status', 'rejected')
            ->with('stageTemplate')
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

        $completedStageIds = $this->stages()
            ->where('status', 'completed')
            ->pluck('stage_template_id')
            ->toArray();

        $requiredStageIds = $requiredStages->pluck('id')->toArray();

        // Check if all required stages are completed
        return count(array_intersect($completedStageIds, $requiredStageIds)) === count($requiredStageIds);
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

        $completedStageIds = $this->stages()
            ->where('status', 'completed')
            ->pluck('stage_template_id')
            ->toArray();

        // Find first stage that is not completed
        foreach ($requiredStages as $stage) {
            if (! in_array($stage->id, $completedStageIds)) {
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
            ->with('stageTemplate')
            ->get()
            ->keyBy('stage_template_id');

        $stagesStatus = [];

        foreach ($requiredStages as $requiredStage) {
            $driverStage = $driverStages->get($requiredStage->id);

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

        $driverStage = $this->stages()
            ->where('stage_template_id', $this->current_stage_id)
            ->first();

        return [
            'stage_template' => $currentStage,
            'driver_stage' => $driverStage,
            'status' => $driverStage ? $driverStage->status : 'not_started',
            'is_completed' => $driverStage && $driverStage->status === 'completed',
            'completed_at' => $driverStage?->completed_at,
        ];
    }
}

