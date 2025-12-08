<?php

namespace Modules\Drivers\app\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Core\app\Models\Company;
use Modules\Drivers\app\Http\Requests\DriverStoreRequest;
use Modules\Drivers\app\Http\Requests\DriverUpdateRequest;
use Modules\Drivers\app\Services\DriverService;
use Modules\Drivers\app\Models\Driver;
use Modules\Drivers\app\Models\LeadSource;
use Modules\Drivers\app\Models\LeadStatus;
use Modules\Marketing\app\Models\Campaign;
use Modules\RidingCarCompanies\app\Models\RidingCompany;
use App\Models\User;
use Illuminate\Support\Facades\Schema;

class DriverController extends Controller
{
    public function __construct(
        protected DriverService $driverService
    ) {}

    public function index(): Response
    {
        $user = Auth::user();
        $companyId = $this->getCompanyId();

        $drivers = $this->driverService->getAllDrivers($companyId, $user);

        // Prepare import available fields with types and options
        $companies = $user->isSuperAdmin() ? Company::active()->orderBy('name')->get(['id', 'name']) : collect();
        $ridingCompanies = $user->isSuperAdmin() 
            ? RidingCompany::active()->orderBy('name')->get(['id', 'name'])
            : RidingCompany::when($companyId, fn($q) => $q->where('company_id', $companyId))->active()->orderBy('name')->get(['id', 'name']);
        $campaigns = Campaign::when($companyId, fn($q) => $q->where('company_id', $companyId))->orderBy('name')->get(['id', 'name']);
        $leadSources = LeadSource::when($companyId, fn($q) => $q->where('company_id', $companyId))->active()->orderBy('name')->get(['id', 'name']);
        $leadStatuses = LeadStatus::when($companyId, fn($q) => $q->where('company_id', $companyId))->active()->ordered()->get(['id', 'name']);
        // Get users - for non-super admin, only show subordinate users
        if ($user->isSuperAdmin()) {
        $users = User::when($companyId, fn($q) => $q->where('company_id', $companyId))->where('is_active', true)->orderBy('name')->get(['id', 'name']);
        } else {
            $subordinateUserIds = $user->getSubordinateUserIds();
            $users = User::whereIn('id', $subordinateUserIds)->where('is_active', true)->orderBy('name')->get(['id', 'name']);
        }

        $importAvailableFields = [
            ['value' => 'full_name', 'label' => 'Full Name', 'type' => 'text'],
            ['value' => 'phone', 'label' => 'Phone', 'type' => 'phone'],
            ['value' => 'whatsapp_phone', 'label' => 'WhatsApp Phone', 'type' => 'phone'],
            ['value' => 'email', 'label' => 'Email', 'type' => 'email'],
            [
                'value' => 'company_id',
                'label' => 'Company',
                'type' => 'picklist',
                'options' => $companies->map(fn($c) => ['value' => $c->id, 'label' => $c->name])->toArray(),
            ],
            [
                'value' => 'riding_company_id',
                'label' => 'Riding Company',
                'type' => 'picklist',
                'options' => $ridingCompanies->map(fn($rc) => ['value' => $rc->id, 'label' => $rc->name])->toArray(),
            ],
            [
                'value' => 'campaign_id',
                'label' => 'Campaign',
                'type' => 'picklist',
                'options' => $campaigns->map(fn($c) => ['value' => $c->id, 'label' => $c->name])->toArray(),
            ],
            [
                'value' => 'lead_source_id',
                'label' => 'Lead Source',
                'type' => 'picklist',
                'options' => $leadSources->map(fn($ls) => ['value' => $ls->id, 'label' => $ls->name])->toArray(),
            ],
            [
                'value' => 'lead_status_id',
                'label' => 'Lead Status',
                'type' => 'picklist',
                'options' => $leadStatuses->map(fn($ls) => ['value' => $ls->id, 'label' => $ls->name])->toArray(),
            ],
            ['value' => 'lead_status_comment', 'label' => 'Feedback Comment', 'type' => 'textarea'],
            [
                'value' => 'assigned_to',
                'label' => 'Assigned To',
                'type' => 'picklist',
                'options' => $users->map(fn($u) => ['value' => $u->id, 'label' => $u->name])->toArray(),
            ],
            ['value' => 'notes', 'label' => 'Notes', 'type' => 'textarea'],
        ];

        return Inertia::render('Drivers/Drivers/Index', [
            'drivers' => $drivers->map(fn($driver) => [
                'id' => $driver->id,
                'uuid' => $driver->uuid,
                'driver_num' => $driver->driver_num ?? (string) $driver->id,
                'company_id' => $driver->company_id,
                'full_name' => $driver->full_name,
                'phone' => $driver->phone,
                'whatsapp_phone' => $driver->whatsapp_phone,
                'email' => $driver->email,
                'riding_company' => $driver->ridingCompany ? [
                    'id' => $driver->ridingCompany->id,
                    'name' => $driver->ridingCompany->name,
                ] : null,
                'campaign' => $driver->campaign ? [
                    'id' => $driver->campaign->id,
                    'name' => $driver->campaign->name,
                ] : null,
                'lead_source' => $driver->leadSource ? [
                    'id' => $driver->leadSource->id,
                    'name' => $driver->leadSource->name,
                ] : null,
                'assigned_to' => $driver->assignedTo ? [
                    'id' => $driver->assignedTo->id,
                    'name' => $driver->assignedTo->name,
                ] : null,
                'assigned_users' => $driver->assignedUsers->map(fn($user) => [
                    'id' => $user->id,
                    'name' => $user->name,
                ])->toArray(),
                'lead_status' => $driver->leadStatus ? [
                    'id' => $driver->leadStatus->id,
                    'name' => $driver->leadStatus->name,
                    'color' => $driver->leadStatus->color,
                ] : null,
                'lead_status_comment' => $driver->lead_status_comment,
                'next_follow_up' => $driver->next_follow_up ? $driver->next_follow_up->format('Y-m-d') : null,
                'next_time' => $driver->next_time,
                'last_follow_up' => $driver->last_follow_up ? $driver->last_follow_up->format('Y-m-d') : null,
                'lead_stage' => $driver->leadStage ? [
                    'id' => $driver->leadStage->id,
                    'name' => $driver->leadStage->name,
                    'color' => $driver->leadStage->color,
                ] : null,
                'created_at' => $driver->created_at,
                'updated_at' => $driver->updated_at,
            ]),
            'importAvailableFields' => $importAvailableFields,
            'filterOptions' => [
                'companies' => $companies->map(fn($c) => ['id' => $c->id, 'name' => $c->name])->toArray(),
                'ridingCompanies' => $ridingCompanies->map(fn($rc) => ['id' => $rc->id, 'name' => $rc->name])->toArray(),
                'campaigns' => $campaigns->map(fn($c) => ['id' => $c->id, 'name' => $c->name])->toArray(),
                'leadSources' => $leadSources->map(fn($ls) => ['id' => $ls->id, 'name' => $ls->name])->toArray(),
                'leadStatuses' => $leadStatuses->map(fn($ls) => ['id' => $ls->id, 'name' => $ls->name])->toArray(),
                'users' => $users->map(fn($u) => ['id' => $u->id, 'name' => $u->name])->toArray(),
            ],
        ]);
    }

    public function create(): Response
    {
        $user = Auth::user();
        $companyId = $this->getCompanyId();

        $companies = $user->isSuperAdmin() ? Company::active()->orderBy('name')->get() : null;
        // Only load riding companies if not super admin (for super admin, they'll be loaded dynamically)
        $ridingCompanies = $user->isSuperAdmin() ? [] : RidingCompany::when($companyId, fn($q) => $q->where('company_id', $companyId))->active()->orderBy('name')->get();
        $campaigns = Campaign::when($companyId, fn($q) => $q->where('company_id', $companyId))->orderBy('name')->get();
        $leadSources = LeadSource::when($companyId, fn($q) => $q->where('company_id', $companyId))->active()->orderBy('name')->get();
        $leadStatuses = LeadStatus::when($companyId, fn($q) => $q->where('company_id', $companyId))->active()->ordered()->get();
        $users = User::when($companyId, fn($q) => $q->where('company_id', $companyId))->orderBy('name')->get();

        return Inertia::render('Drivers/Drivers/Create', [
            'companies' => $companies,
            'ridingCompanies' => $ridingCompanies,
            'campaigns' => $campaigns,
            'leadSources' => $leadSources,
            'leadStatuses' => $leadStatuses,
            'users' => $users,
        ]);
    }

    public function store(DriverStoreRequest $request): RedirectResponse
    {
        try {
            $data = $request->validated();
            $user = Auth::user();
            $companyId = $this->getCompanyId();

            if (! $user->isSuperAdmin()) {
                $data['company_id'] = $user->company_id;
            } else {
                // For super admin, use selected company from session
                if ($companyId) {
                    $data['company_id'] = $companyId;
                }
            }

            // Convert empty strings to null for nullable fields
            if (isset($data['lead_stage_id'])) {
                if ($data['lead_stage_id'] === '' || $data['lead_stage_id'] === null) {
                    $data['lead_stage_id'] = null;
                } else {
                    $data['lead_stage_id'] = (int) $data['lead_stage_id'];
                }
            }

            // Remove driver_num from data if present - it's auto-generated
            unset($data['driver_num']);

            $this->driverService->createDriver($data);

            return redirect()
                ->route('drivers.drivers.index')
                ->with('success', 'Driver created successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->withInput()
                ->with('error', $e->getMessage());
        }
    }

    public function show(int $driver): Response
    {
        try {
        $driverModel = $this->driverService->getDriverById($driver);

        if (! $driverModel) {
            abort(404, 'Driver not found.');
        }

        $stagesProgress = $driverModel->getStagesProgress();
        $stagesStatus = $driverModel->getStagesStatus();
        $nextStage = $driverModel->getNextStage();

        // Get next and previous driver IDs
        $companyId = $this->getCompanyId();
        $nextDriver = \Modules\Drivers\app\Models\Driver::where('id', '>', $driverModel->id)
            ->when($companyId, fn($q) => $q->where('company_id', $companyId))
            ->whereNull('deleted_at')
            ->orderBy('id')
            ->first(['id']);
        
        $previousDriver = \Modules\Drivers\app\Models\Driver::where('id', '<', $driverModel->id)
            ->when($companyId, fn($q) => $q->where('company_id', $companyId))
            ->whereNull('deleted_at')
            ->orderByDesc('id')
            ->first(['id']);

        // Load activity logs with relationship names
        $activities = \Spatie\Activitylog\Models\Activity::forSubject($driverModel)
            ->with('causer:id,name,email')
            ->latest()
            ->get()
            ->map(function ($activity) use ($driverModel) {
                $properties = $activity->properties;
                
                // Resolve relationship IDs to names
                if (isset($properties['old'])) {
                    $properties['old'] = $this->resolveActivityPropertyNames($properties['old']);
                }
                if (isset($properties['attributes'])) {
                    $properties['attributes'] = $this->resolveActivityPropertyNames($properties['attributes']);
                }
                
                return [
                    'id' => $activity->id,
                    'description' => $activity->description,
                    'event' => $activity->event,
                    'properties' => $properties,
                    'causer' => $activity->causer ? [
                        'id' => $activity->causer->id,
                        'name' => $activity->causer->name,
                        'email' => $activity->causer->email,
                    ] : null,
                    'created_at' => $activity->created_at->toISOString(),
                ];
            });

        // Get follow-ups for this driver
        $followUps = \Modules\Drivers\app\Models\DriverFollowUp::where('driver_id', $driverModel->id)
            ->with('assignedTo')
            ->orderBy('created_time', 'desc')
            ->get();

        return Inertia::render('Drivers/Drivers/Show', [
            'driver' => [
                'id' => $driverModel->id,
                'uuid' => $driverModel->uuid,
                'driver_num' => $driverModel->driver_num ?? (string) $driverModel->id,
                'company_id' => $driverModel->company_id,
                'full_name' => $driverModel->full_name,
                'phone' => $driverModel->phone,
                'whatsapp_phone' => $driverModel->whatsapp_phone,
                'email' => $driverModel->email,
                'riding_company' => $driverModel->ridingCompany ? [
                    'id' => $driverModel->ridingCompany->id,
                    'name' => $driverModel->ridingCompany->name,
                ] : null,
                'campaign' => $driverModel->campaign ? [
                    'id' => $driverModel->campaign->id,
                    'name' => $driverModel->campaign->name,
                ] : null,
                'lead_source' => $driverModel->leadSource ? [
                    'id' => $driverModel->leadSource->id,
                    'name' => $driverModel->leadSource->name,
                ] : null,
                'assigned_to' => $driverModel->assignedTo ? [
                    'id' => $driverModel->assignedTo->id,
                    'name' => $driverModel->assignedTo->name,
                ] : null,
                'assigned_users' => $driverModel->assignedUsers->map(fn($user) => [
                    'id' => $user->id,
                    'name' => $user->name,
                ])->toArray(),
                'lead_status' => $driverModel->leadStatus ? [
                    'id' => $driverModel->leadStatus->id,
                    'name' => $driverModel->leadStatus->name,
                    'color' => $driverModel->leadStatus->color,
                ] : null,
                'lead_status_comment' => $driverModel->lead_status_comment,
                'next_follow_up' => $driverModel->next_follow_up ? $driverModel->next_follow_up->format('Y-m-d') : null,
                'next_time' => $driverModel->next_time,
                'last_follow_up' => $driverModel->last_follow_up ? $driverModel->last_follow_up->format('Y-m-d') : null,
                'lead_stage' => $driverModel->leadStage ? [
                    'id' => $driverModel->leadStage->id,
                    'name' => $driverModel->leadStage->name,
                    'color' => $driverModel->leadStage->color,
                ] : null,
                'current_stage' => $driverModel->currentStage ? [
                    'id' => $driverModel->currentStage->id,
                    'name' => $driverModel->currentStage->name,
                ] : null,
                'notes' => $driverModel->notes,
                'stages_progress' => $stagesProgress,
                'stages_status' => $stagesStatus,
                'next_stage' => $nextStage ? [
                    'id' => $nextStage->id,
                    'name' => $nextStage->name,
                    'order' => $nextStage->order,
                ] : null,
                'has_completed_all_stages' => $driverModel->hasCompletedAllStages(),
                'stages' => $driverModel->stages->map(fn($stage) => [
                    'id' => $stage->id,
                    'stage_template' => $stage->stageTemplate ? [
                        'id' => $stage->stageTemplate->id,
                        'name' => $stage->stageTemplate->name,
                    ] : null,
                    'status' => $stage->status,
                    'completed_at' => $stage->completed_at,
                ]),
                'documents' => $driverModel->documents->map(fn($doc) => [
                    'id' => $doc->id,
                    'document_template' => $doc->documentTemplate ? [
                        'id' => $doc->documentTemplate->id,
                        'name' => $doc->documentTemplate->name,
                        'type' => $doc->documentTemplate->type,
                    ] : null,
                    'status' => $doc->status,
                    'uploaded_path' => $doc->uploaded_path,
                    'original_filename' => Schema::hasColumn('driver_documents', 'original_filename') ? $doc->original_filename : null,
                ]),
                'created_at' => $driverModel->created_at,
                'updated_at' => $driverModel->updated_at,
            ],
            'activities' => $activities,
            'follow_ups' => $followUps->map(fn($followUp) => [
                'id' => $followUp->id,
                'created_time' => $followUp->created_time?->toISOString(),
                'user_name' => $followUp->user_name,
                'riding_company' => $followUp->riding_company,
                'lead_stage' => $followUp->lead_stage,
                'lead_status' => $followUp->lead_status,
                'lead_status_comment' => $followUp->lead_status_comment,
                'notes' => $followUp->notes,
                'assigned_to_user' => $followUp->assignedTo ? [
                    'id' => $followUp->assignedTo->id,
                    'name' => $followUp->assignedTo->name,
                ] : null,
            ]),
            'next_driver_id' => $nextDriver?->id,
            'previous_driver_id' => $previousDriver?->id,
        ]);
        } catch (\Exception $e) {
            \Log::error('Error in DriverController::show: ' . $e->getMessage(), [
                'driver_id' => $driver,
                'trace' => $e->getTraceAsString(),
            ]);
            abort(500, 'Error loading driver details: ' . $e->getMessage());
        }
    }

    public function details(int $driver): \Illuminate\Http\JsonResponse
    {
        $driverModel = $this->driverService->getDriverById($driver);

        if (! $driverModel) {
            return response()->json(['error' => 'Driver not found.'], 404);
        }

        $stagesProgress = $driverModel->getStagesProgress();
        $stagesStatus = $driverModel->getStagesStatus();
        
        // Get follow-ups for this driver
        $followUps = \Modules\Drivers\app\Models\DriverFollowUp::where('driver_id', $driverModel->id)
            ->with('assignedTo')
            ->orderBy('created_time', 'desc')
            ->get();
        $nextStage = $driverModel->getNextStage();

        // Load activity logs with relationship names
        $activities = \Spatie\Activitylog\Models\Activity::forSubject($driverModel)
            ->with('causer:id,name,email')
            ->latest()
            ->get()
            ->map(function ($activity) use ($driverModel) {
                $properties = $activity->properties;
                
                // Resolve relationship IDs to names
                if (isset($properties['old'])) {
                    $properties['old'] = $this->resolveActivityPropertyNames($properties['old']);
                }
                if (isset($properties['attributes'])) {
                    $properties['attributes'] = $this->resolveActivityPropertyNames($properties['attributes']);
                }
                
                return [
                    'id' => $activity->id,
                    'description' => $activity->description,
                    'event' => $activity->event,
                    'properties' => $properties,
                    'causer' => $activity->causer ? [
                        'id' => $activity->causer->id,
                        'name' => $activity->causer->name,
                        'email' => $activity->causer->email,
                    ] : null,
                    'created_at' => $activity->created_at->toISOString(),
                ];
            });

        return response()->json([
            'driver' => [
                'id' => $driverModel->id,
                'uuid' => $driverModel->uuid,
                'company_id' => $driverModel->company_id,
                'full_name' => $driverModel->full_name,
                'phone' => $driverModel->phone,
                'whatsapp_phone' => $driverModel->whatsapp_phone,
                'email' => $driverModel->email,
                'riding_company' => $driverModel->ridingCompany ? [
                    'id' => $driverModel->ridingCompany->id,
                    'name' => $driverModel->ridingCompany->name,
                ] : null,
                'campaign' => $driverModel->campaign ? [
                    'id' => $driverModel->campaign->id,
                    'name' => $driverModel->campaign->name,
                ] : null,
                'lead_source' => $driverModel->leadSource ? [
                    'id' => $driverModel->leadSource->id,
                    'name' => $driverModel->leadSource->name,
                ] : null,
                'assigned_to' => $driverModel->assignedTo ? [
                    'id' => $driverModel->assignedTo->id,
                    'name' => $driverModel->assignedTo->name,
                ] : null,
                'assigned_users' => $driverModel->assignedUsers->map(fn($user) => [
                    'id' => $user->id,
                    'name' => $user->name,
                ])->toArray(),
                'lead_status' => $driverModel->leadStatus ? [
                    'id' => $driverModel->leadStatus->id,
                    'name' => $driverModel->leadStatus->name,
                    'color' => $driverModel->leadStatus->color,
                ] : null,
                'lead_status_comment' => $driverModel->lead_status_comment,
                'next_follow_up' => $driverModel->next_follow_up ? $driverModel->next_follow_up->format('Y-m-d') : null,
                'next_time' => $driverModel->next_time,
                'last_follow_up' => $driverModel->last_follow_up ? $driverModel->last_follow_up->format('Y-m-d') : null,
                'lead_stage' => $driverModel->leadStage ? [
                    'id' => $driverModel->leadStage->id,
                    'name' => $driverModel->leadStage->name,
                    'color' => $driverModel->leadStage->color,
                ] : null,
                'current_stage' => $driverModel->currentStage ? [
                    'id' => $driverModel->currentStage->id,
                    'name' => $driverModel->currentStage->name,
                ] : null,
                'notes' => $driverModel->notes,
                'stages_progress' => $stagesProgress,
                'stages_status' => $stagesStatus,
                'next_stage' => $nextStage ? [
                    'id' => $nextStage->id,
                    'name' => $nextStage->name,
                    'order' => $nextStage->order,
                ] : null,
                'has_completed_all_stages' => $driverModel->hasCompletedAllStages(),
                'stages' => $driverModel->stages->map(fn($stage) => [
                    'id' => $stage->id,
                    'stage_template' => $stage->stageTemplate ? [
                        'id' => $stage->stageTemplate->id,
                        'name' => $stage->stageTemplate->name,
                    ] : null,
                    'status' => $stage->status,
                    'completed_at' => $stage->completed_at,
                ]),
                'documents' => $driverModel->documents->map(fn($doc) => [
                    'id' => $doc->id,
                    'document_template' => $doc->documentTemplate ? [
                        'id' => $doc->documentTemplate->id,
                        'name' => $doc->documentTemplate->name,
                        'type' => $doc->documentTemplate->type,
                    ] : null,
                    'status' => $doc->status,
                    'uploaded_path' => $doc->uploaded_path,
                    'original_filename' => Schema::hasColumn('driver_documents', 'original_filename') ? $doc->original_filename : null,
                ]),
                'created_at' => $driverModel->created_at,
                'updated_at' => $driverModel->updated_at,
            ],
            'activities' => $activities,
            'follow_ups' => $followUps->map(fn($followUp) => [
                'id' => $followUp->id,
                'created_time' => $followUp->created_time?->toISOString(),
                'user_name' => $followUp->user_name,
                'riding_company' => $followUp->riding_company,
                'lead_stage' => $followUp->lead_stage,
                'lead_status' => $followUp->lead_status,
                'lead_status_comment' => $followUp->lead_status_comment,
                'notes' => $followUp->notes,
                'assigned_to_user' => $followUp->assignedTo ? [
                    'id' => $followUp->assignedTo->id,
                    'name' => $followUp->assignedTo->name,
                ] : null,
            ]),
        ]);
    }

    public function edit(int $driver): Response
    {
        $driverModel = $this->driverService->getDriverById($driver);

        if (! $driverModel) {
            abort(404, 'Driver not found.');
        }

        $user = Auth::user();
        $companyId = $this->getCompanyId();

        $companies = $user->isSuperAdmin() ? Company::active()->orderBy('name')->get() : null;
        $ridingCompanies = RidingCompany::when($companyId, fn($q) => $q->where('company_id', $companyId))->active()->orderBy('name')->get();
        $campaigns = Campaign::when($companyId, fn($q) => $q->where('company_id', $companyId))->orderBy('name')->get();
        $leadSources = LeadSource::when($companyId, fn($q) => $q->where('company_id', $companyId))->active()->orderBy('name')->get();
        $leadStatuses = LeadStatus::when($companyId, fn($q) => $q->where('company_id', $companyId))->active()->ordered()->get();
        $users = User::when($companyId, fn($q) => $q->where('company_id', $companyId))->orderBy('name')->get();

        return Inertia::render('Drivers/Drivers/Edit', [
            'driver' => [
                'id' => $driverModel->id,
                'company_id' => $driverModel->company_id,
                'full_name' => $driverModel->full_name,
                'phone' => $driverModel->phone,
                'whatsapp_phone' => $driverModel->whatsapp_phone,
                'email' => $driverModel->email,
                'riding_company_id' => $driverModel->riding_company_id,
                'campaign_id' => $driverModel->campaign_id,
                'lead_source_id' => $driverModel->lead_source_id,
                'assigned_to' => $driverModel->assigned_to,
                'assigned_users' => $driverModel->assignedUsers->pluck('id')->toArray(),
                'lead_status_id' => $driverModel->lead_status_id,
                'lead_status_comment' => $driverModel->lead_status_comment,
                'next_follow_up' => $driverModel->next_follow_up ? $driverModel->next_follow_up->format('Y-m-d') : null,
                'next_time' => $driverModel->next_time,
                'last_follow_up' => $driverModel->last_follow_up ? $driverModel->last_follow_up->format('Y-m-d') : null,
                'lead_stage_id' => $driverModel->lead_stage_id,
                'current_stage_id' => $driverModel->current_stage_id,
                'notes' => $driverModel->notes,
            ],
            'companies' => $companies,
            'ridingCompanies' => $ridingCompanies,
            'campaigns' => $campaigns,
            'leadSources' => $leadSources,
            'leadStatuses' => $leadStatuses,
            'users' => $users,
        ]);
    }

    public function update(DriverUpdateRequest $request, int $driver): RedirectResponse
    {
        try {
            $data = $request->validated();
            $user = Auth::user();
            $companyId = $this->getCompanyId();

            if (! $user->isSuperAdmin()) {
                $data['company_id'] = $user->company_id;
            } else {
                // For super admin, use selected company from session
                if ($companyId) {
                    $data['company_id'] = $companyId;
                }
            }

            // Convert empty strings to null for nullable fields
            if (isset($data['lead_stage_id'])) {
                if ($data['lead_stage_id'] === '' || $data['lead_stage_id'] === null) {
                    $data['lead_stage_id'] = null;
                } else {
                    $data['lead_stage_id'] = (int) $data['lead_stage_id'];
                }
            }

            $this->driverService->updateDriver($driver, $data);

            return redirect()
                ->back()
                ->with('success', 'Driver updated successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->withInput()
                ->with('error', $e->getMessage());
        }
    }

    public function destroy(int $driver): RedirectResponse
    {
        try {
            $this->driverService->deleteDriver($driver);

            return redirect()
                ->route('drivers.drivers.index')
                ->with('success', 'Driver deleted successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }

    public function assign(Request $request, int $driver): RedirectResponse
    {
        $request->validate([
            'user_id' => ['required', 'exists:users,id'],
        ]);

        try {
            $this->driverService->assignDriver($driver, $request->user_id);

            return redirect()
                ->back()
                ->with('success', 'Driver assigned successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }

    public function export(Request $request): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $user = Auth::user();
        $companyId = $this->getCompanyId();
        
        // Check if specific IDs are requested
        $ids = $request->input('ids');
        if ($ids) {
            // Export selected drivers only
            $idsArray = is_array($ids) ? $ids : explode(',', $ids);
            $drivers = Driver::whereIn('id', $idsArray)
                ->with(['ridingCompany', 'campaign', 'leadSource', 'leadStatus', 'assignedTo'])
                ->get();
        } else {
            // Export all visible drivers
        $drivers = $this->driverService->getAllDrivers($companyId);
        }

        // Create CSV
        $filename = 'drivers_export_' . date('Y-m-d_His') . '.csv';
        
        // Add UTF-8 BOM for Excel compatibility
        $content = "\xEF\xBB\xBF";
        
        // Open output stream
        $output = fopen('php://temp', 'r+');

        // Headers
        fputcsv($output, ['ID', 'Full Name', 'Phone', 'WhatsApp', 'Email', 'Riding Company', 'Campaign', 'Lead Source', 'Lead Status', 'Feedback Comment', 'Next Follow-up', 'Next Time', 'Last Follow-up', 'Assigned To', 'Created At']);

        // Data
        foreach ($drivers as $driver) {
            fputcsv($output, [
                $driver->id,
                $driver->full_name,
                $driver->phone,
                $driver->whatsapp_phone ?? '',
                $driver->email ?? '',
                $driver->ridingCompany?->name ?? '',
                $driver->campaign?->name ?? '',
                $driver->leadSource?->name ?? '',
                $driver->leadStatus?->name ?? '',
                $driver->lead_status_comment ?? '',
                $driver->next_follow_up ? $driver->next_follow_up->format('Y-m-d') : '',
                $driver->next_time ?? '',
                $driver->last_follow_up ? $driver->last_follow_up->format('Y-m-d') : '',
                $driver->assignedTo?->name ?? '',
                $driver->created_at,
            ]);
        }

        rewind($output);
        $content .= stream_get_contents($output);
        fclose($output);

        $response = response()->streamDownload(function () use ($content) {
            echo $content;
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
        
        // Prevent Inertia from processing this response
        $response->headers->remove('X-Inertia');
        $response->headers->set('X-Inertia', 'false');
        $response->headers->set('Cache-Control', 'no-cache, must-revalidate');
        $response->headers->set('Pragma', 'no-cache');
        $response->headers->set('Expires', '0');
        
        return $response;
    }


    public function importStore(Request $request): RedirectResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt', 'max:10240'],
            'has_header' => ['nullable', 'boolean'],
            'encoding' => ['nullable', 'string', 'in:UTF-8,ISO-8859-1,Windows-1252'],
            'delimiter' => ['nullable', 'string', 'in:comma,semicolon,pipe,caret'],
            'duplicate_handling' => ['nullable', 'string', 'in:skip,update,create'],
            'matching_fields' => ['nullable', 'string'],
            'field_mapping' => ['nullable', 'string'],
        ]);

        try {
            $file = $request->file('file');
            $hasHeader = $request->boolean('has_header', true);
            $encoding = $request->input('encoding', 'UTF-8');
            $delimiter = $request->input('delimiter', 'comma');
            $duplicateHandling = $request->input('duplicate_handling', 'skip');
            $matchingFields = json_decode($request->input('matching_fields', '[]'), true) ?? [];
            $fieldMapping = json_decode($request->input('field_mapping', '{}'), true) ?? [];
            $headersOrder = json_decode($request->input('headers_order', '[]'), true) ?? [];
            $defaultValues = json_decode($request->input('default_values', '{}'), true) ?? [];

            $delimiterMap = [
                'comma' => ',',
                'semicolon' => ';',
                'pipe' => '|',
                'caret' => '^',
            ];
            $delimiterChar = $delimiterMap[$delimiter] ?? ',';

            // Read CSV file
            $content = file_get_contents($file->getRealPath());
            if ($encoding !== 'UTF-8') {
                $content = mb_convert_encoding($content, 'UTF-8', $encoding);
            }

            $lines = array_filter(array_map('trim', explode("\n", $content)));
            if (empty($lines)) {
                throw new \Exception('CSV file is empty');
            }

            // Get CSV headers
            $csvHeaders = [];
            if ($hasHeader && ! empty($lines)) {
                $firstLine = str_getcsv(array_shift($lines), $delimiterChar);
                $csvHeaders = array_map('trim', $firstLine);
            } else {
                // If no header, use headers_order or create default headers
                if (! empty($headersOrder)) {
                    $csvHeaders = $headersOrder;
                } else {
                    // Try to infer from first row
                    if (! empty($lines)) {
                        $firstRow = str_getcsv($lines[0], $delimiterChar);
                        $csvHeaders = array_map(fn($i) => "Column " . ($i + 1), array_keys($firstRow));
                    }
                }
            }

            $imported = 0;
            $skipped = 0;
            $updated = 0;
            $errors = [];
            $createdRecords = [];
            $skippedRecords = [];
            $updatedRecords = [];
            $totalScanned = 0;

            $user = Auth::user();
            // Get company_id - for super admin, use selected company from session, otherwise use user's company
            $companyId = $this->getCompanyId();
            
            // If user doesn't have company_id and is not super admin, we can't proceed
            if (empty($companyId) && ! $user->isSuperAdmin()) {
            return redirect()
                    ->back()
                    ->with('error', 'Your user account must have a company assigned to import drivers. Please contact your administrator.');
            }
            
            // For super admin, if no company is selected, show error
            if ($user->isSuperAdmin() && ! $companyId) {
                return redirect()
                    ->back()
                    ->with('error', 'Please select a company from the sidebar to import drivers.');
            }

            foreach ($lines as $lineNumber => $line) {
                try {
                    $row = str_getcsv($line, $delimiterChar);
                    if (empty(array_filter($row))) {
                        continue;
                    }

                    // Map CSV columns to fields using headers order
                    $data = [];
                    foreach ($csvHeaders as $columnIndex => $csvHeader) {
                        if (! isset($fieldMapping[$csvHeader])) {
                            continue;
                        }

                        $field = $fieldMapping[$csvHeader];
                        if (empty($field) || $field === '__skip__' || $field === '-- Skip --') {
                            continue;
                        }

                        $value = isset($row[$columnIndex]) ? trim($row[$columnIndex]) : null;

                        // Skip driver_num field - it's auto-generated
                        if ($field === 'driver_num') {
                            continue;
                        }

                        // Handle default values
                        if ((empty($value) || $value === '') && isset($defaultValues[$csvHeader])) {
                            $value = $defaultValues[$csvHeader];
                        }

                        if ($value !== null && $value !== '') {
                            // Handle relationship fields - need to find IDs by name
                            if (in_array($field, ['company_id', 'riding_company_id', 'campaign_id', 'lead_source_id', 'lead_status_id', 'assigned_to'])) {
                                $originalValue = $value;
                                $value = $this->resolveRelationshipId($field, $value, $companyId, $user);
                                if ($value === null && ! empty(trim($row[$columnIndex]))) {
                                    $errors[] = "Row " . ($lineNumber + ($hasHeader ? 2 : 1)) . ": Could not find {$field} for value: '" . trim($row[$columnIndex]) . "'. Please check that the value exists in the database.";
                                }
                            }
                            
                            if ($value !== null) {
                                $data[$field] = $value;
                            }
                        }
                    }

                    // Reformat phone numbers
                    if (isset($data['phone'])) {
                        $data['phone'] = $this->reformatPhoneNumber($data['phone']);
                    }
                    if (isset($data['whatsapp_phone'])) {
                        $data['whatsapp_phone'] = $this->reformatPhoneNumber($data['whatsapp_phone']);
                    }

                    // Ensure company_id is set - it's required in the database
                    // Always use the current user's company_id automatically (restricted to user's company)
                    if (empty($data['company_id'])) {
                        // Use user's company_id if available
                        if ($user->company_id) {
                            $data['company_id'] = $user->company_id;
                        } elseif ($user->isSuperAdmin()) {
                            // For super admin, use selected company from session
                            if ($companyId) {
                                $data['company_id'] = $companyId;
                            } else {
                                $errors[] = "Row " . ($lineNumber + ($hasHeader ? 2 : 1)) . ": Please select a company from the sidebar to import drivers.";
                                continue;
                            }
                        } else {
                            $errors[] = "Row " . ($lineNumber + ($hasHeader ? 2 : 1)) . ": Unable to determine company_id. Please ensure your user account has a company assigned.";
                            continue;
                        }
                    } else {
                        // Ensure user can only import to their own company
                        if (!$user->isSuperAdmin() && $data['company_id'] != $user->company_id) {
                            $errors[] = "Row " . ($lineNumber + ($hasHeader ? 2 : 1)) . ": You can only import drivers to your own company.";
                            continue;
                        }
                    }
                    
                    // Validate and set assigned_to
                    // User can assign to themselves or users below them in hierarchy
                    if (isset($data['assigned_to']) && !empty($data['assigned_to'])) {
                        $assignedUserId = $data['assigned_to'];
                        
                        // Check if assigned user is a subordinate or the current user
                        if (!$user->isSuperAdmin() && !$user->isSubordinate($assignedUserId)) {
                            // If user is not subordinate, still allow import but assign to current user
                            // The record will be created but won't be visible to the importing user
                            $data['assigned_to'] = $user->id;
                        }
                    } else {
                        // If not provided, use current user
                        $data['assigned_to'] = $user->id;
                    }

                    // Handle duplicates
                    $existing = null;
                    if ($duplicateHandling !== 'create' && ! empty($matchingFields)) {
                        $query = Driver::query();
                        foreach ($matchingFields as $field) {
                            if (isset($data[$field])) {
                                $query->where($field, $data[$field]);
                            }
                        }
                        $existing = $query->first();
                    }

                    // Validate required fields
                    $missingFields = [];
                    if (empty($data['full_name'])) {
                        $missingFields[] = 'Full Name';
                    }
                    if (empty($data['phone'])) {
                        $missingFields[] = 'Phone';
                    }
                    
                    if (!empty($missingFields)) {
                        $errors[] = "Row " . ($lineNumber + ($hasHeader ? 2 : 1)) . ": Missing required fields (" . implode(', ', $missingFields) . ")";
                        continue;
                    }

                    // Ensure company_id is set
                    if (empty($data['company_id'])) {
                        if ($user->isSuperAdmin()) {
                            $errors[] = "Row " . ($lineNumber + ($hasHeader ? 2 : 1)) . ": company_id is required";
                            continue;
                        } else {
                            $data['company_id'] = $companyId;
                        }
                    }

                    // Remove driver_num from data if present - it's auto-generated
                    unset($data['driver_num']);

                    if ($existing) {
                        if ($duplicateHandling === 'skip') {
                            $skipped++;
                            $skippedRecords[] = [
                                'row' => $lineNumber + ($hasHeader ? 2 : 1),
                                'data' => $data,
                                'existing_id' => $existing->id,
                                'reason' => 'Duplicate found based on matching fields',
                            ];
                            continue;
                        } elseif ($duplicateHandling === 'update') {
                            $existing->update($data);
                            $updated++;
                            $updatedRecords[] = [
                                'row' => $lineNumber + ($hasHeader ? 2 : 1),
                                'data' => $data,
                                'driver_id' => $existing->id,
                            ];
                        }
                    } else {
                        $driver = $this->driverService->createDriver($data);
                        $imported++;
                        $createdRecords[] = [
                            'row' => $lineNumber + ($hasHeader ? 2 : 1),
                            'data' => $data,
                            'driver_id' => $driver->id,
                        ];
                    }
        } catch (\Exception $e) {
                    $errors[] = "Row " . ($lineNumber + ($hasHeader ? 2 : 1)) . ": " . $e->getMessage();
                }
            }

            // Store import results in session for the results page
            $importResults = [
                'total_scanned' => $totalScanned,
                'imported' => $imported,
                'updated' => $updated,
                'skipped' => $skipped,
                'errors_count' => count($errors),
                'created_records' => $createdRecords,
                'skipped_records' => $skippedRecords,
                'updated_records' => $updatedRecords,
                'errors' => $errors,
            ];

            // Redirect to import results page
            return redirect()
                ->route('drivers.drivers.import.results')
                ->with('importResults', $importResults);
        } catch (\Exception $e) {
            \Log::error('Import error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);
            
            return redirect()
                ->back()
                ->with('error', 'Import failed: ' . $e->getMessage());
        }
    }

    /**
     * Resolve relationship ID from name/value
     */
    protected function resolveRelationshipId(string $field, string $value, ?int $companyId, $user): ?int
    {
        $value = trim($value);
        if (empty($value) || $value === '-') {
            return null;
        }

        try {
            switch ($field) {
                case 'company_id':
                    // Try exact match first
                    $model = Company::where('name', $value)->first();
                    if ($model) {
                        return $model->id;
                    }
                    // Try trimmed match
                    $model = Company::where('name', trim($value))->first();
                    if ($model) {
                        return $model->id;
                    }
                    // Try case-insensitive match
                    $model = Company::whereRaw('LOWER(name) = LOWER(?)', [trim($value)])->first();
                    if ($model) {
                        return $model->id;
                    }
                    // Try partial match (contains)
                    $model = Company::where('name', 'LIKE', '%' . trim($value) . '%')->first();
                    return $model?->id;

                case 'riding_company_id':
                    $query = RidingCompany::where('name', $value);
                    if ($companyId) {
                        $query->where('company_id', $companyId);
                    }
                    $model = $query->first();
                    return $model?->id;

                case 'campaign_id':
                    $query = Campaign::where('name', $value);
                    if ($companyId) {
                        $query->where('company_id', $companyId);
                    }
                    $model = $query->first();
                    return $model?->id;

                case 'lead_source_id':
                    $query = LeadSource::where('name', $value);
                    if ($companyId) {
                        $query->where('company_id', $companyId);
                    }
                    $model = $query->first();
                    return $model?->id;

                case 'lead_status_id':
                    $query = LeadStatus::where('name', $value);
                    if ($companyId) {
                        $query->where('company_id', $companyId);
                    }
                    $model = $query->first();
                    return $model?->id;

                case 'assigned_to':
                    $query = User::where('name', $value);
                    if ($companyId) {
                        $query->where('company_id', $companyId);
                    }
                    $model = $query->first();
                    return $model?->id;

                default:
                    // Try to parse as integer if it looks like an ID
                    if (is_numeric($value)) {
                        return (int) $value;
                    }
                    return null;
            }
        } catch (\Exception $e) {
            \Log::error("Failed to resolve {$field} for value: {$value}", [
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    /**
     * Resolve relationship IDs to names in activity log properties
     */
    protected function resolveActivityPropertyNames(array $properties): array
    {
        $resolved = [];
        
        foreach ($properties as $key => $value) {
            if ($value === null || $value === '') {
                $resolved[$key] = $value;
                continue;
            }
            
            switch ($key) {
                case 'assigned_to':
                    if (is_numeric($value)) {
                        $user = User::find($value);
                        $resolved[$key] = $user ? $user->name : "User #{$value}";
                    } else {
                        $resolved[$key] = $value;
                    }
                    break;
                    
                case 'company_id':
                    if (is_numeric($value)) {
                        $company = Company::find($value);
                        $resolved[$key] = $company ? $company->name : "Company #{$value}";
                    } else {
                        $resolved[$key] = $value;
                    }
                    break;
                    
                case 'riding_company_id':
                    if (is_numeric($value)) {
                        $ridingCompany = RidingCompany::find($value);
                        $resolved[$key] = $ridingCompany ? $ridingCompany->name : "Riding Company #{$value}";
                    } else {
                        $resolved[$key] = $value;
                    }
                    break;
                    
                case 'campaign_id':
                    if (is_numeric($value)) {
                        $campaign = Campaign::find($value);
                        $resolved[$key] = $campaign ? $campaign->name : "Campaign #{$value}";
                    } else {
                        $resolved[$key] = $value;
                    }
                    break;
                    
                case 'lead_source_id':
                    if (is_numeric($value)) {
                        $leadSource = LeadSource::find($value);
                        $resolved[$key] = $leadSource ? $leadSource->name : "Lead Source #{$value}";
                    } else {
                        $resolved[$key] = $value;
                    }
                    break;
                    
                case 'lead_status_id':
                    if (is_numeric($value)) {
                        $leadStatus = LeadStatus::find($value);
                        $resolved[$key] = $leadStatus ? $leadStatus->name : "Lead Status #{$value}";
                    } else {
                        $resolved[$key] = $value;
                    }
                    break;
                    
                default:
                    $resolved[$key] = $value;
                    break;
            }
        }
        
        return $resolved;
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

    public function importResults(): RedirectResponse|Response
    {
        $importResults = session('importResults');
        
        if (! $importResults) {
            return redirect()
                ->route('drivers.drivers.index');
        }

        return Inertia::render('Drivers/Drivers/ImportResults', [
            'importResults' => $importResults,
        ]);
    }

    public function downloadImportDetails(string $type): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        // Get import results from session
        $importResults = session('importResults');
        
        // If not in session, try to get from request (in case session expired)
        if (! $importResults && request()->has('results')) {
            $importResults = json_decode(request()->input('results'), true);
        }
        
        if (! $importResults) {
            abort(404, 'Import results not found. Please run the import again.');
        }

        $filename = "import_{$type}_" . date('Y-m-d_His') . '.csv';
        $records = [];
        
        switch ($type) {
            case 'created':
                $records = $importResults['created_records'] ?? [];
                break;
            case 'skipped':
                $records = $importResults['skipped_records'] ?? [];
                break;
            case 'updated':
                $records = $importResults['updated_records'] ?? [];
                break;
            default:
                abort(404, 'Invalid type');
        }

        // Create CSV - same approach as export()
        // Add UTF-8 BOM for Excel compatibility
        $content = "\xEF\xBB\xBF";
        
        // Open output stream
        $output = fopen('php://temp', 'r+');
        
        // Headers
        fputcsv($output, ['Row', 'Full Name', 'Phone', 'Email', 'Riding Company', 'Campaign', 'Lead Source', 'Lead Status', 'Assigned To', 'Driver ID']);
        
        // Data
        foreach ($records as $record) {
            $data = $record['data'] ?? [];
            fputcsv($output, [
                $record['row'] ?? '',
                $data['full_name'] ?? '',
                $data['phone'] ?? '',
                $data['email'] ?? '',
                $data['riding_company_id'] ?? '',
                $data['campaign_id'] ?? '',
                $data['lead_source_id'] ?? '',
                $data['lead_status_id'] ?? '',
                $data['assigned_to'] ?? '',
                $record['driver_id'] ?? $record['existing_id'] ?? '',
            ]);
        }
        
        rewind($output);
        $content .= stream_get_contents($output);
        fclose($output);
        
        $response = response()->streamDownload(function () use ($content) {
            echo $content;
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
        
        // Prevent Inertia from processing this response - same as export()
        $response->headers->remove('X-Inertia');
        $response->headers->set('X-Inertia', 'false');
        $response->headers->set('Cache-Control', 'no-cache, must-revalidate');
        $response->headers->set('Pragma', 'no-cache');
        $response->headers->set('Expires', '0');
        
        return $response;
    }

    public function massDelete(Request $request): RedirectResponse
    {
        $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['required', 'integer', 'exists:drivers,id'],
        ]);

        $user = Auth::user();
        $companyId = $this->getCompanyId();

        $query = Driver::whereIn('id', $request->ids);
        
        if ($companyId) {
            $query->where('company_id', $companyId);
        }

        // Get all drivers first to trigger individual delete events
        $drivers = $query->get();
        $count = $drivers->count();

        // Delete each driver individually to trigger event handlers
        // This ensures all related data (stages, documents, files) are deleted
        foreach ($drivers as $driver) {
            $driver->delete();
        }

        return redirect()
            ->route('drivers.drivers.index')
            ->with('success', "{$count} driver(s) deleted successfully.");
    }

    public function massEdit(Request $request): Response
    {
        // Get ids from query string or request
        $ids = $request->input('ids');
        if (is_string($ids)) {
            $ids = explode(',', $ids);
        }
        
        $request->merge(['ids' => $ids]);
        
        $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['required', 'integer', 'exists:drivers,id'],
        ]);

        $user = Auth::user();
        $companyId = $this->getCompanyId();

        $drivers = Driver::whereIn('id', $ids);
        
        if ($companyId) {
            $drivers->where('company_id', $companyId);
        }

        $drivers = $drivers->get();

        // Get all available options for mass edit
        $companies = $user->isSuperAdmin() 
            ? Company::active()->orderBy('name')->get(['id', 'name'])
            : collect([$user->company])->filter();

        $ridingCompanies = $user->isSuperAdmin() 
            ? RidingCompany::active()->orderBy('name')->get(['id', 'name'])
            : RidingCompany::when($companyId, fn($q) => $q->where('company_id', $companyId))->active()->orderBy('name')->get(['id', 'name']);

        $campaigns = $user->isSuperAdmin()
            ? Campaign::orderBy('name')->get(['id', 'name'])
            : Campaign::when($companyId, fn($q) => $q->where('company_id', $companyId))->orderBy('name')->get(['id', 'name']);

        $leadSources = $user->isSuperAdmin()
            ? LeadSource::active()->orderBy('name')->get(['id', 'name'])
            : LeadSource::when($companyId, fn($q) => $q->where('company_id', $companyId))->active()->orderBy('name')->get(['id', 'name']);

        $leadStatuses = $user->isSuperAdmin()
            ? LeadStatus::active()->ordered()->get(['id', 'name', 'color'])
            : LeadStatus::when($companyId, fn($q) => $q->where('company_id', $companyId))->active()->ordered()->get(['id', 'name', 'color']);

        $users = $user->isSuperAdmin()
            ? User::where('is_active', true)->orderBy('name')->get(['id', 'name'])
            : User::when($companyId, fn($q) => $q->where('company_id', $companyId))->where('is_active', true)->orderBy('name')->get(['id', 'name']);

        return Inertia::render('Drivers/Drivers/MassEdit', [
            'drivers' => $drivers,
            'ids' => $ids,
            'companies' => $companies,
            'ridingCompanies' => $ridingCompanies,
            'campaigns' => $campaigns,
            'leadSources' => $leadSources,
            'leadStatuses' => $leadStatuses,
            'users' => $users,
        ]);
    }

    public function massUpdate(Request $request): RedirectResponse
    {
        $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['required', 'integer', 'exists:drivers,id'],
            'company_id' => ['nullable', 'string'],
            'riding_company_id' => ['nullable', 'string'],
            'campaign_id' => ['nullable', 'string'],
            'lead_source_id' => ['nullable', 'string'],
            'lead_status_id' => ['nullable', 'string'],
            'lead_status_comment' => ['nullable', 'string'],
            'next_follow_up' => [
                'nullable',
                'date',
                function ($attribute, $value, $fail) {
                    if ($value) {
                        $selectedDate = \Carbon\Carbon::parse($value)->startOfDay();
                        $today = \Carbon\Carbon::today();
                        if ($selectedDate->lt($today)) {
                            $fail('Next Follow-up date must be today or a future date.');
                        }
                    }
                },
            ],
            'next_time' => ['nullable', 'string', 'max:10'],
            'assigned_to' => ['nullable', 'string'],
            'assigned_users' => ['nullable', 'array'],
            'assigned_users.*' => ['required', 'integer', 'exists:users,id'],
            'notes' => ['nullable', 'string'],
            'clear_fields' => ['nullable', 'array'],
        ]);

        $user = Auth::user();
        $companyId = $this->getCompanyId();

        $drivers = Driver::whereIn('id', $request->ids);
        
        if ($companyId) {
            $drivers->where('company_id', $companyId);
        }

        $drivers = $drivers->get();

        if ($drivers->isEmpty()) {
            return redirect()
                ->back()
                ->with('error', 'No drivers found to update.');
        }

        $updateData = [];
        $clearFields = $request->input('clear_fields', []);
        
        // Handle clear fields (set to null)
        foreach ($clearFields as $field) {
            $updateData[$field] = null;
        }
        
        // Only include fields that have values (not empty) and are not in clear_fields
        if ($request->filled('company_id') && ! in_array('company_id', $clearFields)) {
            $updateData['company_id'] = $request->company_id ? (int) $request->company_id : null;
        }
        if ($request->filled('riding_company_id') && ! in_array('riding_company_id', $clearFields)) {
            $updateData['riding_company_id'] = $request->riding_company_id ? (int) $request->riding_company_id : null;
        }
        if ($request->filled('campaign_id') && ! in_array('campaign_id', $clearFields)) {
            $updateData['campaign_id'] = $request->campaign_id ? (int) $request->campaign_id : null;
        }
        if ($request->filled('lead_source_id') && ! in_array('lead_source_id', $clearFields)) {
            $updateData['lead_source_id'] = $request->lead_source_id ? (int) $request->lead_source_id : null;
        }
        if ($request->filled('lead_status_id') && ! in_array('lead_status_id', $clearFields)) {
            $updateData['lead_status_id'] = $request->lead_status_id ? (int) $request->lead_status_id : null;
        }
        if ($request->filled('lead_status_comment') && ! in_array('lead_status_comment', $clearFields)) {
            $updateData['lead_status_comment'] = $request->lead_status_comment;
        }
        if ($request->filled('next_follow_up') && ! in_array('next_follow_up', $clearFields)) {
            $updateData['next_follow_up'] = $request->next_follow_up;
        }
        if ($request->filled('next_time') && ! in_array('next_time', $clearFields)) {
            $updateData['next_time'] = $request->next_time;
        }
        if ($request->filled('assigned_to') && ! in_array('assigned_to', $clearFields)) {
            $updateData['assigned_to'] = $request->assigned_to ? (int) $request->assigned_to : null;
        }

        // Handle assigned_users separately (sync for each driver)
        if (in_array('assigned_users', $clearFields)) {
            foreach ($drivers as $driver) {
                $driver->assignedUsers()->sync([]);
                // Also clear assigned_to when clearing assigned_users
                if (!isset($updateData['assigned_to'])) {
                    $driver->update(['assigned_to' => null]);
                }
            }
        } elseif ($request->filled('assigned_users') && is_array($request->assigned_users)) {
            $assignedUsers = array_filter(array_map('intval', $request->assigned_users));
            // Set assigned_to to the first user in assigned_users if not explicitly set
            if (!isset($updateData['assigned_to']) && !empty($assignedUsers)) {
                $updateData['assigned_to'] = $assignedUsers[0];
            }
            foreach ($drivers as $driver) {
                $driver->assignedUsers()->sync($assignedUsers);
            }
        }

        // Handle notes separately (append to existing notes, or clear if in clear_fields)
        if (in_array('notes', $clearFields)) {
            $updateData['notes'] = null;
        } elseif ($request->filled('notes')) {
            $notes = $request->notes;
            foreach ($drivers as $driver) {
                $existingNotes = $driver->notes ?? '';
                $newNotes = $existingNotes 
                    ? $existingNotes . "\n\n" . date('Y-m-d H:i:s') . ': ' . $notes
                    : date('Y-m-d H:i:s') . ': ' . $notes;
                $driver->update(['notes' => $newNotes]);
            }
        }

        // Update all drivers with the same data
        if (! empty($updateData)) {
            // Use individual updates to trigger events (for follow-up creation)
            foreach ($drivers as $driver) {
                $driver->update($updateData);
            }
        }

        $count = $drivers->count();
        return redirect()
            ->route('drivers.drivers.index')
            ->with('success', "{$count} driver(s) updated successfully.");
    }
}

