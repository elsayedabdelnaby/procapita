<?php

namespace Modules\Drivers\app\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Core\app\Models\Company;
use Modules\Drivers\app\Http\Requests\DriverStoreRequest;
use Modules\Drivers\app\Http\Requests\DriverUpdateRequest;
use Modules\Drivers\app\Models\Driver;
use Modules\Drivers\app\Models\DriverDocument;
use Modules\Drivers\app\Models\DriverFollowUp;
use Modules\Drivers\app\Models\LeadSource;
use Modules\Drivers\app\Models\LeadStage;
use Modules\Drivers\app\Models\LeadStatus;
use Modules\Drivers\app\Services\DriverListService;
use Modules\Drivers\app\Services\DriverService;
use Modules\Marketing\app\Models\Campaign;
use Modules\RidingCarCompanies\app\Models\RidingCompany;

class DriverController extends Controller
{
    public function __construct(
        protected DriverService $driverService,
        protected DriverListService $driverListService
    ) {}

    public function index(): Response
    {
        try {
            $user = Auth::user();
            $companyId = $this->getCompanyId();

            $drivers = $this->driverService->getAllDrivers($companyId, $user);

            // Prepare import available fields with types and options
            $companies = $user->isSuperAdmin() ? Company::active()->orderBy('name')->get(['id', 'name']) : collect();

            $campaigns = Campaign::when($companyId, fn ($q) => $q->where('company_id', $companyId))->orderBy('name')->get(['id', 'name']);
            $leadSources = LeadSource::active()->orderBy('name')->get(['id', 'name']);
            $leadStatuses = LeadStatus::active()->ordered()->get(['id', 'name']);
            $ridingCompanies = $this->getRidingCompaniesForUser($user, $companyId);
            // Get users - for non-super admin, only show subordinate users; for super admin include self so they can assign to themselves
            if ($user->isSuperAdmin()) {
                $users = User::when($companyId, fn ($q) => $q->where('company_id', $companyId))->where('is_active', true)->orderBy('name')->get(['id', 'name']);
                if (! $users->contains('id', $user->id)) {
                    $users->push($user);
                    $users = $users->sortBy('name')->values();
                }
            } else {
                $subordinateUserIds = $user->getSubordinateUserIds() ?? [];
                if (empty($subordinateUserIds)) {
                    $subordinateUserIds = [$user->id];
                }
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
                    'options' => $companies->map(fn ($c) => ['value' => $c->id, 'label' => $c->name])->toArray(),
                ],
                [
                    'value' => 'campaign_id',
                    'label' => 'Campaign',
                    'type' => 'picklist',
                    'options' => $campaigns->map(fn ($c) => ['value' => $c->id, 'label' => $c->name])->toArray(),
                ],
                [
                    'value' => 'lead_source_id',
                    'label' => 'Lead Source',
                    'type' => 'picklist',
                    'options' => $leadSources->map(fn ($ls) => ['value' => $ls->id, 'label' => $ls->name])->toArray(),
                ],
                [
                    'value' => 'lead_status_id',
                    'label' => 'Lead Status',
                    'type' => 'picklist',
                    'options' => $leadStatuses->map(fn ($ls) => ['value' => $ls->id, 'label' => $ls->name])->toArray(),
                ],
                ['value' => 'lead_status_comment', 'label' => 'Feedback Comment', 'type' => 'textarea'],
                [
                    'value' => 'assigned_to',
                    'label' => 'Assigned To',
                    'type' => 'picklist',
                    'options' => $users->map(fn ($u) => ['value' => $u->id, 'label' => $u->name])->toArray(),
                ],
                ['value' => 'notes', 'label' => 'Notes', 'type' => 'textarea'],
                [
                    'value' => 'cancel_reason',
                    'label' => 'Cancel Reason',
                    'type' => 'picklist',
                    'options' => $this->getCustomDropdownOptions('cancel_reason', $companyId),
                ],
                ['value' => 'city', 'label' => 'City', 'type' => 'text'],
                [
                    'value' => 'governorate',
                    'label' => 'Governorate',
                    'type' => 'picklist',
                    'options' => $this->getCustomDropdownOptions('governorate', $companyId),
                ],
                ['value' => 'feedback_count', 'label' => 'Feedback Count', 'type' => 'number'],
            ];

            // Get all document names from the new document_names table
            $allDocumentNames = [];
            $documentsByRidingCompany = [];

            if (Schema::hasTable('document_names')) {
                $documentNamesQuery = \Modules\Drivers\app\Models\DocumentName::query();
                $hasRidingCompanyIdsColumn = Schema::hasColumn('document_names', 'riding_company_ids');

                // Filter by company if not super admin (only when riding_company_ids column exists)
                if ($companyId && $hasRidingCompanyIdsColumn) {
                    // Get riding company IDs for this company
                    $ridingCompanyIds = RidingCompany::where('company_id', $companyId)->pluck('id')->toArray();

                    if (! empty($ridingCompanyIds)) {
                        // Filter document names that have at least one riding company in this company
                        $documentNamesQuery->where(function ($q) use ($ridingCompanyIds) {
                            foreach ($ridingCompanyIds as $ridingCompanyId) {
                                $q->orWhereJsonContains('riding_company_ids', $ridingCompanyId)
                                    ->orWhereJsonContains('riding_company_ids', (string) $ridingCompanyId);
                            }
                        });
                    }
                }

                $documentNames = $documentNamesQuery->orderBy('name')->get();

                // Get all unique document names
                $allDocumentNames = $documentNames->pluck('name')->unique()->sort()->values()->toArray();

                // Group documents by riding company (only when riding_company_ids column exists)
                if ($hasRidingCompanyIdsColumn) {
                    foreach ($documentNames as $docName) {
                        $ridingCompanyIds = $docName->riding_company_ids ?? [];
                        if (! empty($ridingCompanyIds)) {
                            // Convert to integers
                            $ridingCompanyIds = array_map('intval', $ridingCompanyIds);

                            foreach ($ridingCompanyIds as $ridingCompanyId) {
                                if (! isset($documentsByRidingCompany[$ridingCompanyId])) {
                                    $documentsByRidingCompany[$ridingCompanyId] = [];
                                }
                                if (! in_array($docName->name, $documentsByRidingCompany[$ridingCompanyId])) {
                                    $documentsByRidingCompany[$ridingCompanyId][] = $docName->name;
                                }
                            }
                        }
                    }
                }
            } else {
                // Fallback to old structure
                $hasNameColumn = \Illuminate\Support\Facades\Schema::hasColumn('driver_documents', 'name');

                if ($hasNameColumn) {
                    $allDocuments = DriverDocument::with(['ridingCompany'])
                        ->whereHas('driver', function ($q) use ($companyId) {
                            $q->whereNull('deleted_at');
                            if ($companyId) {
                                $q->where('company_id', $companyId);
                            }
                        })
                        ->whereNotNull('name')
                        ->select('name', 'riding_company_id')
                        ->groupBy('name', 'riding_company_id')
                        ->orderBy('riding_company_id')
                        ->orderBy('name')
                        ->get();
                } else {
                    // Use document_name relationship if name column doesn't exist
                    $allDocuments = DriverDocument::with(['ridingCompany', 'documentName'])
                        ->whereHas('driver', function ($q) use ($companyId) {
                            $q->whereNull('deleted_at');
                            if ($companyId) {
                                $q->where('company_id', $companyId);
                            }
                        })
                        ->whereNotNull('document_name_id')
                        ->join('document_names', 'driver_documents.document_name_id', '=', 'document_names.id')
                        ->select('document_names.name as name', 'driver_documents.riding_company_id')
                        ->groupBy('document_names.name', 'driver_documents.riding_company_id')
                        ->orderBy('driver_documents.riding_company_id')
                        ->orderBy('document_names.name')
                        ->get();
                }

                // Group documents by riding company
                foreach ($allDocuments as $doc) {
                    $ridingCompanyId = $doc->riding_company_id;
                    if (! isset($documentsByRidingCompany[$ridingCompanyId])) {
                        $documentsByRidingCompany[$ridingCompanyId] = [];
                    }
                    if (! in_array($doc->name, $documentsByRidingCompany[$ridingCompanyId])) {
                        $documentsByRidingCompany[$ridingCompanyId][] = $doc->name;
                    }
                }

                $allDocumentNames = $allDocuments->pluck('name')->unique()->sort()->values()->toArray();
            }

            // Get ALL document requirements (even if no driver documents exist yet)
            // Note: We only use these for display purposes, not for creating columns
            // Columns are created only from document_names table
            $allDocumentRequirements = collect();
            if (Schema::hasTable('riding_company_document_requirements')) {
                $documentRequirementsQuery = \Modules\RidingCarCompanies\app\Models\RidingCompanyDocumentRequirement::with(['ridingCompany']);

                if ($companyId) {
                    $documentRequirementsQuery->whereHas('ridingCompany', function ($q) use ($companyId) {
                        $q->where('company_id', $companyId);
                    });
                }

                $allDocumentRequirements = $documentRequirementsQuery
                    ->orderBy('riding_company_id')
                    ->orderBy('name')
                    ->get();
            }

            // Use ONLY document names from document_names table for columns
            // Do NOT merge with requirements - columns should only show actual Driver Documents
            $allUniqueDocumentNames = $allDocumentNames;

            // Skip loading documents on index to keep first load fast; documents are shown on lead detail
            $hasNameColumn = \Illuminate\Support\Facades\Schema::hasColumn('driver_documents', 'name');
            $loadDocumentsForIndex = false;

            return Inertia::render('Drivers/Drivers/Index', [
                'drivers' => $drivers->map(function ($driver) use ($hasNameColumn, $loadDocumentsForIndex) {
                    $driverDocuments = [];
                    if ($loadDocumentsForIndex && isset($driver->documents)) {
                        foreach ($driver->documents as $doc) {
                            $docName = $hasNameColumn ? $doc->name : ($doc->documentName?->name ?? null);
                            if ($docName) {
                                $driverDocuments[$docName] = [
                                    'id' => $doc->id,
                                    'name' => $docName,
                                    'status' => $doc->status,
                                    'uploaded_path' => $doc->uploaded_path,
                                    'original_filename' => $doc->original_filename ?? null,
                                ];
                            }
                        }
                    }

                    return [
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
                        'team_leader' => $driver->teamLeader ? [
                            'id' => $driver->teamLeader->id,
                            'name' => $driver->teamLeader->name,
                        ] : null,
                        'account_manager' => $driver->accountManager ? [
                            'id' => $driver->accountManager->id,
                            'name' => $driver->accountManager->name,
                        ] : null,
                        'resigned_leads' => $driver->resigned_leads,
                        'assigned_users' => $driver->assignedUsers->map(fn ($user) => [
                            'id' => $user->id,
                            'name' => $user->name,
                        ])->toArray(),
                        'lead_status' => $driver->leadStatus ? [
                            'id' => $driver->leadStatus->id,
                            'name' => $driver->leadStatus->name,
                            'color' => $driver->leadStatus->color,
                        ] : null,
                        'lead_status_comment' => $driver->lead_status_comment,
                        'next_follow_up' => $driver->next_follow_up ? $driver->next_follow_up->format('Y-m-d H:i:s') : null,
                        'last_follow_up' => $driver->last_follow_up ? $driver->last_follow_up->format('Y-m-d H:i:s') : null,
                        'lead_stage' => $driver->leadStage ? [
                            'id' => $driver->leadStage->id,
                            'name' => $driver->leadStage->name,
                            'color' => $driver->leadStage->color,
                        ] : null,
                        'last_assigned_time' => $driver->last_assigned_time?->format('d-m-Y h:i A'),
                        'last_assigned_by' => $driver->lastAssignedByUser ? [
                            'id' => $driver->lastAssignedByUser->id,
                            'name' => $driver->lastAssignedByUser->name,
                        ] : null,
                        'notes' => $driver->notes,
                        'cancel_reason' => $driver->cancel_reason,
                        'reseller' => $driver->company?->name ?? null,
                        'worked_with_us_before' => $driver->worked_with_us_before,
                        'vehicle_type' => $driver->vehicle_type,
                        'car_or_scooter' => $driver->car_or_scooter,
                        'vehicle_type_and_year' => $driver->vehicle_type_and_year,
                        'city' => $driver->city,
                        'governorate' => $driver->governorate,
                        'has_worked_before' => $driver->has_worked_before,
                        'feedback_count' => $driver->feedback_count ?? 0,
                        'confirm_duplicate' => $driver->confirm_duplicate ?? false,
                        'created_at' => $driver->created_at ? $driver->created_at->format('Y-m-d H:i:s') : null,
                        'updated_at' => $driver->updated_at ? $driver->updated_at->format('Y-m-d H:i:s') : null,
                        'duplicate' => $driver->duplicate ?? 0,
                        'documents' => $driverDocuments,
                    ];
                }),
                'importAvailableFields' => $importAvailableFields,
                'filterOptions' => [
                    'companies' => $companies->map(fn ($c) => ['id' => $c->id, 'name' => $c->name])->toArray(),
                    'ridingCompanies' => $ridingCompanies->map(fn ($rc) => ['id' => $rc->id, 'name' => $rc->name])->toArray(),
                    'campaigns' => $campaigns->map(fn ($c) => ['id' => $c->id, 'name' => $c->name])->toArray(),
                    'leadSources' => $leadSources->map(fn ($ls) => ['id' => $ls->id, 'name' => $ls->name])->toArray(),
                    'leadStatuses' => $leadStatuses->map(fn ($ls) => ['id' => $ls->id, 'name' => $ls->name])->toArray(),
                    'users' => $users->map(fn ($u) => ['id' => $u->id, 'name' => $u->name])->toArray(),
                ],
                'demo_reseller' => config('app.demo_reseller', false),
                'cancelReasonOptions' => $this->getCustomDropdownOptions('cancel_reason', $companyId),
                'lists' => $this->driverListService->getAccessibleLists($user, $companyId),
                'allDocumentNames' => $allUniqueDocumentNames,
                'documentsByRidingCompany' => $documentsByRidingCompany,
                'leadsLimitReached' => $drivers->count() >= DriverService::INDEX_LEADS_LIMIT,
                'leadsLimit' => DriverService::INDEX_LEADS_LIMIT,
                'allDocumentRequirements' => $allDocumentRequirements->map(function ($req) {
                    return [
                        'id' => $req->id,
                        'name' => $req->name,
                        'riding_company_id' => $req->riding_company_id,
                        'active' => $req->active,
                    ];
                })->toArray(),
            ]);
        } catch (\Exception $e) {
            Log::error('Error loading drivers index', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            throw $e;
        }
    }

    public function recycleBin(): Response
    {
        $user = Auth::user();
        $companyId = $this->getCompanyId();

        // Get selected riding company from session (for admins)
        $selectedRidingCompanyId = null;
        if (($user->isSuperAdmin() || $user->is_company_admin) && ! $user->riding_company_id) {
            $selectedRidingCompanyId = session('selected_riding_company_id');
        }

        // Get only deleted drivers
        $query = Driver::onlyTrashed()->with(['company', 'ridingCompany', 'campaign', 'leadSource', 'assignedTo', 'teamLeader', 'accountManager', 'assignedUsers', 'leadStatus', 'leadStage', 'lastAssignedByUser']);

        if ($companyId) {
            $query->where('company_id', $companyId);
        }

        // Filter by selected riding company (for admins using the selector)
        if ($selectedRidingCompanyId) {
            $query->where('riding_company_id', $selectedRidingCompanyId);
        }

        // Filter by assigned_to or assigned_users if user is not super admin
        if ($user && ! $user->isSuperAdmin()) {
            // Filter by riding company first (if user is not company admin and has a specific riding company)
            if (! $user->is_company_admin && $user->riding_company_id) {
                $query->where('riding_company_id', $user->riding_company_id);
            }

            $subordinateUserIds = $user->getSubordinateUserIds();

            // Always include current user ID to ensure they see their own data
            if (! in_array($user->id, $subordinateUserIds)) {
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

        $drivers = $query->orderBy('deleted_at', 'desc')->get();

        // Prepare import available fields with types and options
        $companies = $user->isSuperAdmin() ? Company::active()->orderBy('name')->get(['id', 'name']) : collect();

        // Filter riding companies based on user access
        $ridingCompanies = $this->getRidingCompaniesForUser($user, $companyId);

        $campaigns = Campaign::when($companyId, fn ($q) => $q->where('company_id', $companyId))->orderBy('name')->get(['id', 'name']);
        $leadSources = LeadSource::active()->orderBy('name')->get(['id', 'name']);
        $leadStatuses = LeadStatus::active()->ordered()->get(['id', 'name']);
        // Get users - for non-super admin, only show subordinate users; for super admin include self
        if ($user->isSuperAdmin()) {
            $users = User::when($companyId, fn ($q) => $q->where('company_id', $companyId))->where('is_active', true)->orderBy('name')->get(['id', 'name']);
            if (! $users->contains('id', $user->id)) {
                $users->push($user);
                $users = $users->sortBy('name')->values();
            }
        } else {
            $subordinateUserIds = $user->getSubordinateUserIds();
            $users = User::whereIn('id', $subordinateUserIds)->where('is_active', true)->orderBy('name')->get(['id', 'name']);
        }

        return Inertia::render('Drivers/Drivers/RecycleBin', [
            'drivers' => $drivers->map(fn ($driver) => [
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
                'team_leader' => $driver->teamLeader ? [
                    'id' => $driver->teamLeader->id,
                    'name' => $driver->teamLeader->name,
                ] : null,
                'account_manager' => $driver->accountManager ? [
                    'id' => $driver->accountManager->id,
                    'name' => $driver->accountManager->name,
                ] : null,
                'assigned_users' => $driver->assignedUsers->map(fn ($user) => [
                    'id' => $user->id,
                    'name' => $user->name,
                ])->toArray(),
                'lead_status' => $driver->leadStatus ? [
                    'id' => $driver->leadStatus->id,
                    'name' => $driver->leadStatus->name,
                    'color' => $driver->leadStatus->color,
                ] : null,
                'lead_status_comment' => $driver->lead_status_comment,
                'next_follow_up' => $driver->next_follow_up ? $driver->next_follow_up->format('Y-m-d H:i:s') : null,
                'last_follow_up' => $driver->last_follow_up ? $driver->last_follow_up->format('Y-m-d H:i:s') : null,
                'lead_stage' => $driver->leadStage ? [
                    'id' => $driver->leadStage->id,
                    'name' => $driver->leadStage->name,
                    'color' => $driver->leadStage->color,
                ] : null,
                'last_assigned_time' => $driver->last_assigned_time?->format('d-m-Y h:i A'),
                'last_assigned_by' => $driver->lastAssignedByUser ? [
                    'id' => $driver->lastAssignedByUser->id,
                    'name' => $driver->lastAssignedByUser->name,
                ] : null,
                'resigned_leads' => $driver->resigned_leads,
                'notes' => $driver->notes,
                'cancel_reason' => $driver->cancel_reason,
                'reseller' => $driver->company?->name ?? null,
                'created_at' => $driver->created_at,
                'updated_at' => $driver->updated_at,
                'deleted_at' => $driver->deleted_at?->format('Y-m-d H:i:s'),
                'duplicate' => $driver->duplicate ?? 0,
            ]),
            'filterOptions' => [
                'companies' => $companies->map(fn ($c) => ['id' => $c->id, 'name' => $c->name])->toArray(),
                'ridingCompanies' => $ridingCompanies->map(fn ($rc) => ['id' => $rc->id, 'name' => $rc->name])->toArray(),
                'campaigns' => $campaigns->map(fn ($c) => ['id' => $c->id, 'name' => $c->name])->toArray(),
                'leadSources' => $leadSources->map(fn ($ls) => ['id' => $ls->id, 'name' => $ls->name])->toArray(),
                'leadStatuses' => $leadStatuses->map(fn ($ls) => ['id' => $ls->id, 'name' => $ls->name])->toArray(),
                'users' => $users->map(fn ($u) => ['id' => $u->id, 'name' => $u->name])->toArray(),
            ],
        ]);
    }

    public function create(): Response
    {
        $user = Auth::user();
        $companyId = $this->getCompanyId();

        $companies = $user->isSuperAdmin() ? Company::active()->orderBy('name')->get() : null;
        // Filter riding companies based on user access
        $ridingCompanies = $this->getRidingCompaniesForUser($user, $companyId);
        $campaigns = Campaign::when($companyId, fn ($q) => $q->where('company_id', $companyId))->orderBy('name')->get();
        $leadSources = LeadSource::active()->orderBy('name')->get();
        $leadStatuses = LeadStatus::active()->ordered()->get();
        $users = User::when($companyId, fn ($q) => $q->where('company_id', $companyId))->where('is_active', true)->orderBy('name')->get(['id', 'name']);
        // When All Companies (companyId null) or super admin: ensure current user is in list so they can assign leads to themselves
        if ($user->isSuperAdmin() && ! $users->contains('id', $user->id)) {
            $users->push($user);
            $users = $users->sortBy('name')->values();
        }
        $usersPayload = $users->map(fn ($u) => ['id' => $u->id, 'name' => $u->name])->values()->all();

        $ridingCompanyIds = $ridingCompanies->pluck('id')->toArray();
        $hasRidingCompanyId = \Illuminate\Support\Facades\Schema::hasColumn('lead_stages', 'riding_company_id');
        $hasRidingCompanyIds = \Illuminate\Support\Facades\Schema::hasColumn('lead_stages', 'riding_company_ids');
        $selectColumns = ['id', 'name', 'order', 'color'];
        if ($hasRidingCompanyId) {
            $selectColumns[] = 'riding_company_id';
        }
        if ($hasRidingCompanyIds) {
            $selectColumns[] = 'riding_company_ids';
        }
        $leadStages = LeadStage::active()
            ->where(function ($q) use ($ridingCompanyIds, $hasRidingCompanyId, $hasRidingCompanyIds) {
                if ($hasRidingCompanyId) {
                    $q->whereIn('riding_company_id', $ridingCompanyIds);
                }
                if ($hasRidingCompanyIds) {
                    $q->orWhere(function ($q2) use ($ridingCompanyIds) {
                        foreach ($ridingCompanyIds as $rcId) {
                            $q2->orWhereJsonContains('riding_company_ids', $rcId);
                        }
                    });
                }
            })
            ->ordered()
            ->get($selectColumns);

        $systemCompany = Company::getSystemCompany();

        return Inertia::render('Drivers/Drivers/Create', [
            'companies' => $companies,
            'ridingCompanies' => $ridingCompanies,
            'defaultRidingCompanyId' => $user->riding_company_id,
            'campaigns' => $campaigns,
            'leadSources' => $leadSources,
            'leadStatuses' => $leadStatuses,
            'users' => $usersPayload,
            'leadStages' => $leadStages,
            'demo_reseller' => config('app.demo_reseller', false),
            'cancelReasonOptions' => $this->getCustomDropdownOptions('cancel_reason', $companyId),
            'systemCompanyId' => $systemCompany?->id,
        ]);
    }

    public function store(DriverStoreRequest $request)
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

            // Check for duplicate phone or whatsapp before creating (unless force_create is set)
            if (! $request->has('force_create')) {
                $duplicateDrivers = $this->checkForDuplicates($data);

                if ($duplicateDrivers->isNotEmpty()) {
                    $currentCompanyId = isset($data['company_id']) ? (int) $data['company_id'] : null;
                    // Return with duplicate drivers info + company for same/other company logic
                    $duplicatesArray = $duplicateDrivers->map(function ($driver) {
                        return [
                            'id' => $driver->id,
                            'full_name' => $driver->full_name,
                            'phone' => $driver->phone,
                            'whatsapp_phone' => $driver->whatsapp_phone,
                            'company_id' => $driver->company_id,
                            'company_name' => $driver->company?->name ?? null,
                        ];
                    })->toArray();

                    return redirect()
                        ->back()
                        ->with('duplicates_found', true)
                        ->with('duplicate_drivers', $duplicatesArray)
                        ->with('duplicate_current_company_id', $currentCompanyId)
                        ->withErrors(['duplicate' => 'Duplicate phone or WhatsApp number found.']);
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

            // Convert next_follow_up from datetime-local format (Y-m-d\TH:i) to datetime format (Y-m-d H:i:s)
            if (isset($data['next_follow_up']) && $data['next_follow_up']) {
                $nextFollowUp = $data['next_follow_up'];
                if (strpos($nextFollowUp, 'T') !== false) {
                    // Format: Y-m-d\TH:i -> Y-m-d H:i:s
                    $data['next_follow_up'] = str_replace('T', ' ', $nextFollowUp).':00';
                }
                // Set last_follow_up to current datetime when creating with next_follow_up
                $data['last_follow_up'] = now();
            }

            // Auto-fill team_leader_id, account_manager_id, riding_company_id, company_id (Reseller Company) from assigned user
            if (isset($data['assigned_to']) && $data['assigned_to']) {
                $assignedUser = User::find($data['assigned_to']);
                if ($assignedUser) {
                    $data['team_leader_id'] = $assignedUser->team_leader_id;
                    $data['account_manager_id'] = $assignedUser->account_manager_id;
                    if (! isset($data['riding_company_id']) || ! $data['riding_company_id']) {
                        $data['riding_company_id'] = $assignedUser->riding_company_id;
                    }
                    // Reseller Company = assigned user's company; if assigned to super admin, use system company (Procapita)
                    $data['company_id'] = ($assignedUser->is_super_admin ?? false)
                        ? (Company::getSystemCompany()?->id)
                        : $assignedUser->company_id;
                }
            }

            $this->driverService->createDriver($data);

            return redirect()
                ->route('leads.leads.index')
                ->with('success', config('app.demo_reseller', false) ? 'Lead created successfully.' : 'Driver created successfully.');
        } catch (\Exception $e) {
            if ($request->wantsJson() || $request->expectsJson()) {
                return response()->json([
                    'error' => $e->getMessage(),
                ], 500);
            }

            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }

    /**
     * Check for duplicate phone or whatsapp numbers system-wide (all reseller companies).
     */
    private function checkForDuplicates(array $data): \Illuminate\Support\Collection
    {
        $phone = $data['phone'] ?? null;
        $whatsappPhone = $data['whatsapp_phone'] ?? null;

        $duplicateIds = [];

        if ($phone) {
            $formattedPhone = $this->driverService->reformatPhoneNumber($phone);
            $phoneDuplicates = Driver::query()
                ->where(function ($q) use ($formattedPhone) {
                    $q->whereRaw('REPLACE(REPLACE(REPLACE(REPLACE(phone, "+", ""), " ", ""), "-", ""), ".", "") = ?', [$formattedPhone])
                        ->orWhereRaw('REPLACE(REPLACE(REPLACE(REPLACE(whatsapp_phone, "+", ""), " ", ""), "-", ""), ".", "") = ?', [$formattedPhone]);
                })
                ->pluck('id')
                ->toArray();
            $duplicateIds = array_merge($duplicateIds, $phoneDuplicates);
        }

        if ($whatsappPhone && $whatsappPhone !== $phone) {
            $formattedWhatsapp = $this->driverService->reformatPhoneNumber($whatsappPhone);
            $whatsappDuplicates = Driver::query()
                ->where(function ($q) use ($formattedWhatsapp) {
                    $q->whereRaw('REPLACE(REPLACE(REPLACE(REPLACE(phone, "+", ""), " ", ""), "-", ""), ".", "") = ?', [$formattedWhatsapp])
                        ->orWhereRaw('REPLACE(REPLACE(REPLACE(REPLACE(whatsapp_phone, "+", ""), " ", ""), "-", ""), ".", "") = ?', [$formattedWhatsapp]);
                })
                ->pluck('id')
                ->toArray();
            $duplicateIds = array_merge($duplicateIds, $whatsappDuplicates);
        }

        $uniqueIds = array_unique($duplicateIds);

        if (empty($uniqueIds)) {
            return collect([]);
        }

        return Driver::with('company:id,name')
            ->whereIn('id', $uniqueIds)
            ->get(['id', 'full_name', 'phone', 'whatsapp_phone', 'company_id']);
    }

    public function show(int $driver): Response
    {
        try {
            $driverModel = $this->driverService->getDriverById($driver);

            if (! $driverModel) {
                abort(404, 'Driver not found.');
            }

            // When user belongs to a reseller company, set lead's company to that user's company
            $this->syncDriverCompanyToCurrentUser($driverModel);

            // Get next and previous driver IDs
            $companyId = $this->getCompanyId();
            $nextDriver = \Modules\Drivers\app\Models\Driver::where('id', '>', $driverModel->id)
                ->when($companyId, fn ($q) => $q->where('company_id', $companyId))
                ->whereNull('deleted_at')
                ->orderBy('id')
                ->first(['id']);

            $previousDriver = \Modules\Drivers\app\Models\Driver::where('id', '<', $driverModel->id)
                ->when($companyId, fn ($q) => $q->where('company_id', $companyId))
                ->whereNull('deleted_at')
                ->orderByDesc('id')
                ->first(['id']);

            // Load activity logs with relationship names
            $activities = \Spatie\Activitylog\Models\Activity::forSubject($driverModel)
                ->with('causer:id,name,email')
                ->latest()
                ->get()
                ->map(function ($activity) {
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
                    'team_leader' => $driverModel->teamLeader ? [
                        'id' => $driverModel->teamLeader->id,
                        'name' => $driverModel->teamLeader->name,
                    ] : null,
                    'account_manager' => $driverModel->accountManager ? [
                        'id' => $driverModel->accountManager->id,
                        'name' => $driverModel->accountManager->name,
                    ] : null,
                    'resigned_leads' => $driverModel->resigned_leads,
                    'assigned_users' => $driverModel->assignedUsers->map(fn ($user) => [
                        'id' => $user->id,
                        'name' => $user->name,
                    ])->toArray(),
                    'last_assigned_time' => $driverModel->last_assigned_time?->format('d-m-Y h:i A'),
                    'last_assigned_by' => $driverModel->lastAssignedByUser ? [
                        'id' => $driverModel->lastAssignedByUser->id,
                        'name' => $driverModel->lastAssignedByUser->name,
                    ] : null,
                    'lead_status' => $driverModel->leadStatus ? [
                        'id' => $driverModel->leadStatus->id,
                        'name' => $driverModel->leadStatus->name,
                        'color' => $driverModel->leadStatus->color,
                    ] : null,
                    'lead_status_comment' => $driverModel->lead_status_comment,
                    'next_follow_up' => $driverModel->next_follow_up ? $driverModel->next_follow_up->format('Y-m-d H:i:s') : null,
                    'last_follow_up' => $driverModel->last_follow_up ? $driverModel->last_follow_up->format('Y-m-d H:i:s') : null,
                    'lead_stage' => $driverModel->leadStage ? [
                        'id' => $driverModel->leadStage->id,
                        'name' => $driverModel->leadStage->name,
                        'color' => $driverModel->leadStage->color,
                    ] : null,
                    'notes' => $driverModel->notes,
                    'cancel_reason' => $driverModel->cancel_reason,
                    'reseller' => $driverModel->company?->name ?? null,
                    'worked_with_us_before' => $driverModel->worked_with_us_before,
                    'vehicle_type_and_year' => $driverModel->vehicle_type_and_year,
                    'city' => $driverModel->city,
                    'governorate' => $driverModel->governorate,
                    'vehicle_type' => $driverModel->vehicle_type,
                    'car_or_scooter' => $driverModel->car_or_scooter,
                    'has_worked_before' => $driverModel->has_worked_before,
                    'feedback_count' => $driverModel->feedback_count ?? 0,
                    'duplicate' => $driverModel->duplicate ?? 0,
                    'confirm_duplicate' => $driverModel->confirm_duplicate ?? false,
                    'documents' => $driverModel->documents->map(function ($doc) {
                        $hasNameColumn = \Illuminate\Support\Facades\Schema::hasColumn('driver_documents', 'name');
                        $docName = $hasNameColumn ? ($doc->name ?? null) : ($doc->documentName?->name ?? null);
                        return [
                            'id' => $doc->id,
                            'name' => $docName,
                            'riding_company' => $doc->ridingCompany ? [
                                'id' => $doc->ridingCompany->id,
                                'name' => $doc->ridingCompany->name,
                            ] : null,
                            'status' => $doc->status,
                            'uploaded_path' => $doc->uploaded_path,
                            'original_filename' => Schema::hasColumn('driver_documents', 'original_filename') ? $doc->original_filename : null,
                        ];
                    }),
                    'created_at' => $driverModel->created_at,
                    'updated_at' => $driverModel->updated_at,
                    'duplicate' => $driverModel->duplicate ?? 0,
                ],
                'duplicate_drivers' => $this->driverService->getDuplicateDrivers($driverModel)->map(fn ($dup) => [
                    'id' => $dup->id,
                    'full_name' => $dup->full_name,
                    'phone' => $dup->phone,
                    'whatsapp_phone' => $dup->whatsapp_phone,
                    'email' => $dup->email,
                    'riding_company' => $dup->ridingCompany ? [
                        'id' => $dup->ridingCompany->id,
                        'name' => $dup->ridingCompany->name,
                    ] : null,
                    'campaign' => $dup->campaign ? [
                        'id' => $dup->campaign->id,
                        'name' => $dup->campaign->name,
                    ] : null,
                    'lead_source' => $dup->leadSource ? [
                        'id' => $dup->leadSource->id,
                        'name' => $dup->leadSource->name,
                    ] : null,
                    'lead_status' => $dup->leadStatus ? [
                        'id' => $dup->leadStatus->id,
                        'name' => $dup->leadStatus->name,
                        'color' => $dup->leadStatus->color,
                    ] : null,
                    'lead_stage' => $dup->leadStage ? [
                        'id' => $dup->leadStage->id,
                        'name' => $dup->leadStage->name,
                    ] : null,
                    'assigned_to' => $dup->assignedTo ? [
                        'id' => $dup->assignedTo->id,
                        'name' => $dup->assignedTo->name,
                    ] : null,
                    'assigned_users' => $dup->assignedUsers->map(fn ($user) => [
                        'id' => $user->id,
                        'name' => $user->name,
                    ]),
                    'created_at' => $dup->created_at,
                    'updated_at' => $dup->updated_at,
                ]),
                'activities' => $activities,
                'follow_ups' => $followUps->map(fn ($followUp) => [
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
                'riding_company_id' => $driverModel->riding_company_id,
            ]);
        } catch (\Exception $e) {
            \Log::error('Error in DriverController::show: '.$e->getMessage(), [
                'driver_id' => $driver,
                'trace' => $e->getTraceAsString(),
            ]);
            abort(500, 'Error loading driver details: '.$e->getMessage());
        }
    }

    public function details(int $driver): \Illuminate\Http\JsonResponse
    {
        $driverModel = $this->driverService->getDriverById($driver);

        if (! $driverModel) {
            return response()->json(['error' => 'Driver not found.'], 404);
        }

        // Get follow-ups for this driver
        $followUps = \Modules\Drivers\app\Models\DriverFollowUp::where('driver_id', $driverModel->id)
            ->with('assignedTo')
            ->orderBy('created_time', 'desc')
            ->get();

        // Load activity logs with relationship names
        $activities = \Spatie\Activitylog\Models\Activity::forSubject($driverModel)
            ->with('causer:id,name,email')
            ->latest()
            ->get()
            ->map(function ($activity) {
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
                'assigned_users' => $driverModel->assignedUsers->map(fn ($user) => [
                    'id' => $user->id,
                    'name' => $user->name,
                ])->toArray(),
                'lead_status' => $driverModel->leadStatus ? [
                    'id' => $driverModel->leadStatus->id,
                    'name' => $driverModel->leadStatus->name,
                    'color' => $driverModel->leadStatus->color,
                ] : null,
                'lead_status_comment' => $driverModel->lead_status_comment,
                'next_follow_up' => $driverModel->next_follow_up ? $driverModel->next_follow_up->format('Y-m-d H:i:s') : null,
                'last_follow_up' => $driverModel->last_follow_up ? $driverModel->last_follow_up->format('Y-m-d H:i:s') : null,
                'lead_stage' => $driverModel->leadStage ? [
                    'id' => $driverModel->leadStage->id,
                    'name' => $driverModel->leadStage->name,
                    'color' => $driverModel->leadStage->color,
                ] : null,
                'notes' => $driverModel->notes,
                'cancel_reason' => $driverModel->cancel_reason,
                'reseller' => $driverModel->company?->name ?? null,
                'worked_with_us_before' => $driverModel->worked_with_us_before,
                'vehicle_type_and_year' => $driverModel->vehicle_type_and_year,
                'city' => $driverModel->city,
                'governorate' => $driverModel->governorate,
                'vehicle_type' => $driverModel->vehicle_type,
                'car_or_scooter' => $driverModel->car_or_scooter,
                'has_worked_before' => $driverModel->has_worked_before,
                'feedback_count' => $driverModel->feedback_count ?? 0,
                'duplicate' => $driverModel->duplicate ?? 0,
                'confirm_duplicate' => $driverModel->confirm_duplicate ?? false,
                'documents' => $driverModel->documents->map(function ($doc) {
                    $hasNameColumn = \Illuminate\Support\Facades\Schema::hasColumn('driver_documents', 'name');
                    $docName = $hasNameColumn ? ($doc->name ?? null) : ($doc->documentName?->name ?? null);
                    return [
                        'id' => $doc->id,
                        'name' => $docName,
                        'riding_company' => $doc->ridingCompany ? [
                            'id' => $doc->ridingCompany->id,
                            'name' => $doc->ridingCompany->name,
                        ] : null,
                        'status' => $doc->status,
                        'uploaded_path' => $doc->uploaded_path,
                        'original_filename' => Schema::hasColumn('driver_documents', 'original_filename') ? $doc->original_filename : null,
                    ];
                }),
                'created_at' => $driverModel->created_at,
                'updated_at' => $driverModel->updated_at,
            ],
            'activities' => $activities,
            'follow_ups' => $followUps->map(fn ($followUp) => [
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
            'duplicate_drivers' => $this->driverService->getDuplicateDrivers($driverModel)->map(fn ($dup) => [
                'id' => $dup->id,
                'full_name' => $dup->full_name,
                'phone' => $dup->phone,
                'whatsapp_phone' => $dup->whatsapp_phone,
                'email' => $dup->email,
                'riding_company' => $dup->ridingCompany ? [
                    'id' => $dup->ridingCompany->id,
                    'name' => $dup->ridingCompany->name,
                ] : null,
                'campaign' => $dup->campaign ? [
                    'id' => $dup->campaign->id,
                    'name' => $dup->campaign->name,
                ] : null,
                'lead_source' => $dup->leadSource ? [
                    'id' => $dup->leadSource->id,
                    'name' => $dup->leadSource->name,
                ] : null,
                'lead_status' => $dup->leadStatus ? [
                    'id' => $dup->leadStatus->id,
                    'name' => $dup->leadStatus->name,
                    'color' => $dup->leadStatus->color,
                ] : null,
                'lead_stage' => $dup->leadStage ? [
                    'id' => $dup->leadStage->id,
                    'name' => $dup->leadStage->name,
                ] : null,
                'assigned_to' => $dup->assignedTo ? [
                    'id' => $dup->assignedTo->id,
                    'name' => $dup->assignedTo->name,
                ] : null,
                'assigned_users' => $dup->assignedUsers->map(fn ($user) => [
                    'id' => $user->id,
                    'name' => $user->name,
                ])->toArray(),
            ])->toArray(),
        ]);
    }

    public function edit(int $driver): Response
    {
        $driverModel = $this->driverService->getDriverById($driver);

        if (! $driverModel) {
            abort(404, 'Driver not found.');
        }

        // When user belongs to a reseller company, set lead's company to that user's company
        $this->syncDriverCompanyToCurrentUser($driverModel);

        $user = Auth::user();
        $companyId = $this->getCompanyId();

        $companies = $user->isSuperAdmin() ? Company::active()->orderBy('name')->get() : null;
        $ridingCompanies = Schema::hasTable('riding_companies')
            ? RidingCompany::when($companyId, fn ($q) => $q->where('company_id', $companyId))->active()->orderBy('name')->get()
            : collect();
        $campaigns = Campaign::when($companyId, fn ($q) => $q->where('company_id', $companyId))->orderBy('name')->get();
        $leadSources = LeadSource::active()->orderBy('name')->get();
        $leadStatuses = LeadStatus::active()->ordered()->get();
        // Filter Assigned To by lead's Reseller Company (or session company): only users from that company
        $companyIdForUsers = $driverModel->company_id ?? $companyId;
        $users = User::when($companyIdForUsers, fn ($q) => $q->where('company_id', $companyIdForUsers))->where('is_active', true)->orderBy('name')->get(['id', 'name']);
        if ($user->isSuperAdmin() && ! $users->contains('id', $user->id)) {
            $users->push($user);
            $users = $users->sortBy('name')->values();
        }
        $usersPayload = $users->map(fn ($u) => ['id' => $u->id, 'name' => $u->name])->values()->all();

        $ridingCompanyIds = $ridingCompanies->pluck('id')->toArray();
        $hasRidingCompanyId = \Illuminate\Support\Facades\Schema::hasColumn('lead_stages', 'riding_company_id');
        $hasRidingCompanyIds = \Illuminate\Support\Facades\Schema::hasColumn('lead_stages', 'riding_company_ids');
        $selectColumns = ['id', 'name', 'order', 'color'];
        if ($hasRidingCompanyId) {
            $selectColumns[] = 'riding_company_id';
        }
        if ($hasRidingCompanyIds) {
            $selectColumns[] = 'riding_company_ids';
        }
        $leadStages = LeadStage::active()
            ->where(function ($q) use ($ridingCompanyIds, $hasRidingCompanyId, $hasRidingCompanyIds) {
                if ($hasRidingCompanyId) {
                    $q->whereIn('riding_company_id', $ridingCompanyIds);
                }
                if ($hasRidingCompanyIds) {
                    $q->orWhere(function ($q2) use ($ridingCompanyIds) {
                        foreach ($ridingCompanyIds as $rcId) {
                            $q2->orWhereJsonContains('riding_company_ids', $rcId);
                        }
                    });
                }
            })
            ->ordered()
            ->get($selectColumns);

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
                'team_leader_id' => $driverModel->team_leader_id,
                'account_manager_id' => $driverModel->account_manager_id,
                'assigned_users' => $driverModel->assignedUsers->pluck('id')->toArray(),
                'lead_status_id' => $driverModel->lead_status_id,
                'lead_status_comment' => $driverModel->lead_status_comment,
                'next_follow_up' => $driverModel->next_follow_up ? $driverModel->next_follow_up->format('Y-m-d H:i:s') : null,
                'last_follow_up' => $driverModel->last_follow_up ? $driverModel->last_follow_up->format('Y-m-d H:i:s') : null,
                'lead_stage_id' => $driverModel->lead_stage_id,
                'notes' => $driverModel->notes,
                'cancel_reason' => $driverModel->cancel_reason,
                'reseller' => $driverModel->company?->name ?? null,
                'next_time' => $driverModel->next_time,
                'resigned_leads' => $driverModel->resigned_leads,
                'confirm_duplicate' => $driverModel->confirm_duplicate ?? false,
            ],
            'companies' => $companies,
            'ridingCompanies' => $ridingCompanies,
            'campaigns' => $campaigns,
            'leadSources' => $leadSources,
            'leadStatuses' => $leadStatuses,
            'users' => $usersPayload,
            'leadStages' => $leadStages,
            'demo_reseller' => config('app.demo_reseller', false),
            'cancelReasonOptions' => $this->getCustomDropdownOptions('cancel_reason', $companyId),
        ]);
    }

    public function update(DriverUpdateRequest $request, int $driver): RedirectResponse
    {
        try {
            $data = $request->validated();
            $user = Auth::user();
            $companyId = $this->getCompanyId();

            // Filter data based on field-level permissions (except for super admin)
            if (! $user->isSuperAdmin()) {
                $fieldPermissionService = new \Modules\Drivers\app\Services\DriverFieldPermissionService();
                
                // Remove fields user cannot edit
                foreach ($data as $fieldName => $value) {
                    // Map field names (e.g., campaign_id -> campaign)
                    $permissionFieldName = $this->mapFieldNameForPermission($fieldName);
                    
                    if ($permissionFieldName && ! $fieldPermissionService->canEditField($user, $permissionFieldName)) {
                        // User cannot edit this field - remove it from data
                        unset($data[$fieldName]);
                        \Log::info('Removed field from update (no edit permission)', [
                            'user_id' => $user->id,
                            'field_name' => $fieldName,
                            'permission_field_name' => $permissionFieldName,
                        ]);
                    }
                }
            }

            if (! $user->isSuperAdmin()) {
                $data['company_id'] = $user->company_id;
            } else {
                // For super admin, use selected company from session
                if ($companyId) {
                    $data['company_id'] = $companyId;
                }
            }

            // Get confirm_duplicate from request if not in validated data
            if (!isset($data['confirm_duplicate']) && $request->has('confirm_duplicate')) {
                $data['confirm_duplicate'] = (bool) $request->input('confirm_duplicate');
            }

            // Convert empty strings to null for nullable fields
            if (isset($data['lead_stage_id'])) {
                if ($data['lead_stage_id'] === '' || $data['lead_stage_id'] === null) {
                    $data['lead_stage_id'] = null;
                } else {
                    $data['lead_stage_id'] = (int) $data['lead_stage_id'];
                }
            }

            // Check if assigned_to or assigned_users changed - update last_assigned_time and last_assigned_by
            $driverModel = $this->driverService->getDriverById($driver);

            // Get assigned_users from request if not in validated data
            $assignedUsers = $data['assigned_users'] ?? $request->input('assigned_users', []);
            if (is_string($assignedUsers)) {
                $assignedUsers = json_decode($assignedUsers, true) ?? [];
            }

            // Determine new assigned_to value
            $newAssignedTo = null;
            if (isset($data['assigned_to'])) {
                $newAssignedTo = $data['assigned_to'] ? (int) $data['assigned_to'] : null;
            } elseif (! empty($assignedUsers) && is_array($assignedUsers)) {
                // If assigned_to not set but assigned_users is set, use first user
                $newAssignedTo = (int) $assignedUsers[0];
            }

            $oldAssignedTo = $driverModel->assigned_to;

            // Update last_assigned fields if assigned_to changed
            if ($newAssignedTo != $oldAssignedTo) {
                $data['last_assigned_time'] = now();
                $data['last_assigned_by'] = $user->id;
                // Also ensure assigned_to is set if it wasn't explicitly provided
                if (! isset($data['assigned_to']) && $newAssignedTo) {
                    $data['assigned_to'] = $newAssignedTo;
                }

                // Get clear fields from request
                $clearFields = $request->input('clear_fields_on_reassign', []);
                $setLeadStatusToNew = $request->input('set_lead_status_to_new', false);

                // Clear selected fields
                if (in_array('lead_status_comment', $clearFields)) {
                    $data['lead_status_comment'] = null;
                }
                if (in_array('next_follow_up', $clearFields)) {
                    $data['next_follow_up'] = null;
                }
                if (in_array('last_follow_up', $clearFields)) {
                    $data['last_follow_up'] = null;
                }
                if (in_array('cancel_reason', $clearFields)) {
                    $data['cancel_reason'] = null;
                }
                if (in_array('lead_stage_id', $clearFields)) {
                    $data['lead_stage_id'] = null;
                }
                if (in_array('notes', $clearFields)) {
                    $data['notes'] = null;
                }

                // Set lead_status_id to "New" if requested
                if ($setLeadStatusToNew || in_array('lead_status_id', $clearFields)) {
                    $newLeadStatus = \Modules\Drivers\app\Models\LeadStatus::where('name', 'New')
                        ->where('company_id', $driverModel->company_id)
                        ->first();
                    if ($newLeadStatus) {
                        $data['lead_status_id'] = $newLeadStatus->id;
                    }
                }

                // Update team_leader_id, account_manager_id, riding_company_id, and company_id (Reseller Company) from new assigned user
                if ($newAssignedTo) {
                    $newAssignedUser = User::find($newAssignedTo);
                    $oldAssignedUser = $oldAssignedTo ? User::find($oldAssignedTo) : null;

                    if ($newAssignedUser) {
                        $data['team_leader_id'] = $newAssignedUser->team_leader_id;
                        $data['account_manager_id'] = $newAssignedUser->account_manager_id;
                        $data['riding_company_id'] = $newAssignedUser->riding_company_id;
                        // Reseller Company = new sales person's company; if assigned to super admin, lead has no Reseller Company
                        $data['company_id'] = ($newAssignedUser->is_super_admin ?? false)
                            ? (Company::getSystemCompany()?->id)
                            : $newAssignedUser->company_id;

                        // Handle Follow-ups reassignment
                        if ($oldAssignedUser) {
                            $oldRidingCompanyId = $oldAssignedUser->riding_company_id;
                            $newRidingCompanyId = $newAssignedUser->riding_company_id;

                            // Get all follow-ups for this driver assigned to old user
                            $followUps = \Modules\Drivers\app\Models\DriverFollowUp::where('driver_id', $driverModel->id)
                                ->where('assigned_to', $oldAssignedTo)
                                ->get();

                            // Determine who should receive the follow-ups
                            $reassignToUserId = null;
                            if ($oldRidingCompanyId && $newRidingCompanyId && $oldRidingCompanyId == $newRidingCompanyId) {
                                // Same riding company - assign to new user's team leader
                                $reassignToUserId = $newAssignedUser->team_leader_id;
                            } else {
                                // Different riding company - assign to new user's account manager
                                $reassignToUserId = $newAssignedUser->account_manager_id;
                            }

                            // Reassign follow-ups if we have a valid user
                            if ($reassignToUserId) {
                                $reassignToUser = User::find($reassignToUserId);
                                if ($reassignToUser) {
                                    foreach ($followUps as $followUp) {
                                        $followUp->update([
                                            'assigned_to' => $reassignToUserId,
                                            'user_name' => $reassignToUser->name,
                                        ]);
                                    }
                                }
                            }
                        }
                    }
                } else {
                    // If assigned_to is null, clear these fields (lead has no Reseller Company when unassigned)
                    $data['team_leader_id'] = null;
                    $data['account_manager_id'] = null;
                    $data['company_id'] = null;
                    // Note: riding_company_id might be kept if it was set manually, so we don't clear it here
                }
            }

            // Ensure assigned_users is in data if provided
            if (! isset($data['assigned_users']) && ! empty($assignedUsers)) {
                $data['assigned_users'] = $assignedUsers;
            }

            // Convert next_follow_up from datetime-local format (Y-m-d\TH:i) to datetime format (Y-m-d H:i:s)
            if (isset($data['next_follow_up']) && $data['next_follow_up']) {
                $nextFollowUp = $data['next_follow_up'];
                if (strpos($nextFollowUp, 'T') !== false) {
                    // Format: Y-m-d\TH:i -> Y-m-d H:i:s
                    $data['next_follow_up'] = str_replace('T', ' ', $nextFollowUp).':00';
                }
                // Update last_follow_up to current datetime when next_follow_up is updated
                $data['last_follow_up'] = now();
            }

            $this->driverService->updateDriver($driver, $data);

            return redirect()
                ->back()
                ->with('success', config('app.demo_reseller', false) ? 'Lead updated successfully.' : 'Driver updated successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }

    public function destroy(int $driver): RedirectResponse
    {
        try {
            $this->driverService->deleteDriver($driver);

            return redirect()
                ->route('leads.leads.index')
                ->with('success', config('app.demo_reseller', false) ? 'Lead deleted successfully.' : 'Driver deleted successfully.');
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
                ->with('success', config('app.demo_reseller', false) ? 'Lead assigned successfully.' : 'Driver assigned successfully.');
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
            // Export selected drivers only (scoped to user's company)
            $idsArray = is_array($ids) ? $ids : explode(',', (string) $ids);
            $idsArray = array_filter(array_map('intval', $idsArray));
            $query = Driver::whereIn('id', $idsArray);
            if ($companyId !== null) {
                $query->where('company_id', $companyId);
            } else {
                $query->whereNull('company_id');
            }
            $drivers = $query
                ->with(['ridingCompany', 'campaign', 'leadSource', 'leadStatus', 'assignedTo', 'documents'])
                ->get();
        } else {
            // Export all visible drivers
            $drivers = $this->driverService->getAllDrivers($companyId, $user);
            // Ensure all relationships are loaded
            $drivers->load(['documents', 'assignedTo', 'teamLeader', 'accountManager', 'lastAssignedByUser', 'leadStage']);
        }

        // Get ALL document names from document_names table (system-wide, regardless of company)
        $allDocumentNames = [];
        $allDocumentRequirements = collect();
        
        if (\Illuminate\Support\Facades\Schema::hasTable('document_names')) {
            // Get all active document names from the system
            $documentNames = \Modules\Drivers\app\Models\DocumentName::where('active', true)
                ->orderBy('name')
                ->get();
            
            $allDocumentNames = $documentNames->pluck('name')->unique()->sort()->values()->toArray();
            
            // Also get requirements for checking if document is required for specific riding company
            $allDocumentRequirements = collect();
            if (Schema::hasTable('riding_company_document_requirements')) {
                $documentRequirementsQuery = \Modules\RidingCarCompanies\app\Models\RidingCompanyDocumentRequirement::with(['ridingCompany']);
                if ($companyId) {
                    $documentRequirementsQuery->whereHas('ridingCompany', function ($q) use ($companyId) {
                        $q->where('company_id', $companyId);
                    });
                }
                $allDocumentRequirements = $documentRequirementsQuery
                    ->where('active', true)
                    ->orderBy('name')
                    ->get();
            }
        } else {
            // Fallback to old method if document_names table doesn't exist
            $allDocumentRequirements = collect();
            if (Schema::hasTable('riding_company_document_requirements')) {
                $documentRequirementsQuery = \Modules\RidingCarCompanies\app\Models\RidingCompanyDocumentRequirement::with(['ridingCompany']);
                if ($companyId) {
                    $documentRequirementsQuery->whereHas('ridingCompany', function ($q) use ($companyId) {
                        $q->where('company_id', $companyId);
                    });
                }
                $allDocumentRequirements = $documentRequirementsQuery
                    ->where('active', true)
                    ->orderBy('name')
                    ->get();
            }

            // Get unique document names (from both documents and requirements)
            $hasNameColumn = \Illuminate\Support\Facades\Schema::hasColumn('driver_documents', 'name');
            
            if ($hasNameColumn) {
                $documentNamesFromDocs = DriverDocument::whereHas('driver', function ($q) use ($companyId) {
                    $q->whereNull('deleted_at');
                    if ($companyId) {
                        $q->where('company_id', $companyId);
                    }
                })
                    ->whereNotNull('name')
                    ->distinct()
                    ->pluck('name')
                    ->toArray();
            } else {
                $documentNamesFromDocs = DriverDocument::whereHas('driver', function ($q) use ($companyId) {
                    $q->whereNull('deleted_at');
                    if ($companyId) {
                        $q->where('company_id', $companyId);
                    }
                })
                    ->whereNotNull('document_name_id')
                    ->with('documentName')
                    ->get()
                    ->pluck('documentName.name')
                    ->filter()
                    ->unique()
                    ->values()
                    ->toArray();
            }

            $documentNamesFromRequirements = $allDocumentRequirements->pluck('name')->unique()->toArray();
            $allDocumentNames = array_unique(array_merge($documentNamesFromDocs, $documentNamesFromRequirements));
            sort($allDocumentNames);
        }

        // Create CSV
        $filename = 'drivers_export_'.date('Y-m-d_His').'.csv';

        // Add UTF-8 BOM for Excel compatibility
        $content = "\xEF\xBB\xBF";

        // Open output stream
        $output = fopen('php://temp', 'r+');

        // Headers - all columns matching the frontend + document requirement columns
        $headers = [
            'Actions', // Will be empty in export
            'Duplicate Count',
            'Driver Number',
            'Name',
            'Phone',
            'WhatsApp',
            'Email',
            'Reseller',
            'Campaign',
            'Next Time',
            'Assigned To',
            'Assigned Time',
            'Team Leader',
            'Account Manager',
            'Resigned Leads',
            'Lead Source',
            'Current Stage',
            'Lead Status',
            'Last Assigned Time',
            'Last Assigned Date',
            'Last Assigned By',
            'Notes',
            'Cancel Reasons',
            'Vehicle Type',
            'Vehicle Type and Year',
            'Feedback Comment',
            'Has the driver worked before?',
            'Worked With Us Before',
            'City',
            'Governorate',
            'Feedback Count',
            'Next Follow-up',
            'Last Follow-up',
            'Lead Stage',
            'UUID',
            'Created At',
            'Updated At',
        ];

        // Add document requirement columns
        foreach ($allDocumentNames as $docName) {
            $headers[] = $docName;
        }

        fputcsv($output, $headers);

        // Data
        $hasNameColumn = \Illuminate\Support\Facades\Schema::hasColumn('driver_documents', 'name');
        foreach ($drivers as $driver) {
            // Load documents if not already loaded
            if (! $driver->relationLoaded('documents')) {
                $driver->load('documents'.($hasNameColumn ? '' : '.documentName'));
            }

            // Ensure relationships are loaded
            if (! $driver->relationLoaded('assignedTo')) {
                $driver->load('assignedTo');
            }
            if (! $driver->relationLoaded('teamLeader')) {
                $driver->load('teamLeader');
            }
            if (! $driver->relationLoaded('accountManager')) {
                $driver->load('accountManager');
            }
            if (! $driver->relationLoaded('lastAssignedByUser')) {
                $driver->load('lastAssignedByUser');
            }
            if (! $driver->relationLoaded('leadStage')) {
                $driver->load('leadStage');
            }

            // Map driver documents by name
            $hasNameColumn = \Illuminate\Support\Facades\Schema::hasColumn('driver_documents', 'name');
            if (! $driver->relationLoaded('documents')) {
                $driver->load('documents'.($hasNameColumn ? '' : '.documentName'));
            }
            $driverDocuments = [];
            foreach ($driver->documents as $doc) {
                $docName = $hasNameColumn ? $doc->name : ($doc->documentName?->name ?? null);
                if ($docName) {
                    $driverDocuments[$docName] = $doc->status;
                }
            }

            // Calculate duplicate count
            $duplicateCount = $this->driverService->calculateDuplicateCount($driver);

            // Base row data - matching headers order
            $row = [
                '', // Actions (empty in export)
                $duplicateCount,
                $driver->driver_num ?? (string) $driver->id,
                $driver->full_name,
                $driver->phone,
                $driver->whatsapp_phone ?? '',
                $driver->email ?? '',
                $driver->company?->name ?? '',
                $driver->campaign?->name ?? '',
                $driver->next_time ?? '',
                $driver->assignedTo?->name ?? '', // Fixed: Use name, not date
                $driver->assigned_time ? $driver->assigned_time->format('d-m-Y h:i A') : '',
                $driver->teamLeader?->name ?? '',
                $driver->accountManager?->name ?? '',
                $driver->resigned_leads ?? '',
                $driver->leadSource?->name ?? '',
                $driver->leadStage?->name ?? '', // Current Stage (uses lead stage after driver_stages removal)
                $driver->leadStatus?->name ?? '',
                $driver->last_assigned_time ? $driver->last_assigned_time->format('d-m-Y h:i A') : '',
                $driver->last_assigned_time ? $driver->last_assigned_time->format('d-m-Y') : '',
                $driver->lastAssignedByUser?->name ?? '',
                $driver->notes ?? '',
                $driver->cancel_reason ?? '',
                $driver->vehicle_type ?? '',
                $driver->vehicle_type_and_year ?? '',
                $driver->lead_status_comment ?? '',
                $driver->has_worked_before ?? '',
                $driver->worked_with_us_before ?? '',
                $driver->city ?? '',
                $driver->governorate ?? '',
                $driver->feedback_count ?? 0,
                $driver->next_follow_up ? $driver->next_follow_up->format('Y-m-d H:i:s') : '',
                $driver->last_follow_up ? $driver->last_follow_up->format('Y-m-d H:i:s') : '',
                $driver->leadStage?->name ?? '',
                $driver->uuid ?? '',
                $driver->created_at ? $driver->created_at->format('Y-m-d H:i:s') : '',
                $driver->updated_at ? $driver->updated_at->format('Y-m-d H:i:s') : '',
            ];

            // Add document status columns
            $driverRidingCompanyId = $driver->riding_company_id;
            
            // Get document names from document_names table for checking requirements
            $documentNamesForCheck = collect();
            if (\Illuminate\Support\Facades\Schema::hasTable('document_names')) {
                $documentNamesForCheck = \Modules\Drivers\app\Models\DocumentName::where('active', true)
                    ->get()
                    ->keyBy('name');
            }
            
            foreach ($allDocumentNames as $docName) {
                // Check if document is required for this driver's riding company
                $isRequired = false;
                
                if ($driverRidingCompanyId) {
                    // First check document_names table (only when riding_company_ids column exists)
                    if (\Illuminate\Support\Facades\Schema::hasColumn('document_names', 'riding_company_ids')
                        && $documentNamesForCheck->has($docName)) {
                        $docNameModel = $documentNamesForCheck->get($docName);
                        $ridingCompanyIds = $docNameModel->riding_company_ids ?? [];
                        if (! empty($ridingCompanyIds)) {
                            // Convert to integers for comparison
                            $ridingCompanyIds = array_map('intval', $ridingCompanyIds);
                            $isRequired = in_array((int) $driverRidingCompanyId, $ridingCompanyIds, true);
                        }
                    }
                    
                    // Also check riding_company_document_requirements (fallback)
                    if (!$isRequired) {
                        $isRequired = $allDocumentRequirements->contains(function ($req) use ($docName, $driverRidingCompanyId) {
                            return $req->name === $docName &&
                                   $req->riding_company_id === $driverRidingCompanyId &&
                                   $req->active === true;
                        });
                    }
                }

                // Check if driver has this document
                if (isset($driverDocuments[$docName])) {
                    // Driver has the document - show its status
                    $status = strtolower($driverDocuments[$docName]);
                    $statusMap = [
                        'pending' => 'Pending',
                        'approved' => 'Approve',
                        'rejected' => 'Reject',
                    ];
                    $row[] = $statusMap[$status] ?? ucfirst($status);
                } elseif ($isRequired) {
                    // Document is required but driver doesn't have it
                    $row[] = 'Empty';
                } else {
                    // Document is not required for this driver's riding company
                    $row[] = 'Not Required';
                }
            }

            fputcsv($output, $row);
        }

        rewind($output);
        $content .= stream_get_contents($output);
        fclose($output);

        $response = response()->streamDownload(function () use ($content) {
            echo $content;
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
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
                        $csvHeaders = array_map(fn ($i) => 'Column '.($i + 1), array_keys($firstRow));
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
                                    $errors[] = 'Row '.($lineNumber + ($hasHeader ? 2 : 1)).": Could not find {$field} for value: '".trim($row[$columnIndex])."'. Please check that the value exists in the database.";
                                }
                            }

                            // Handle dropdown fields with static options (governorate, cancel_reason)
                            if (in_array($field, ['governorate', 'cancel_reason'])) {
                                $this->addCustomDropdownValue($field, $value, $companyId);
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
                                $errors[] = 'Row '.($lineNumber + ($hasHeader ? 2 : 1)).': Please select a company from the sidebar to import drivers.';

                                continue;
                            }
                        } else {
                            $errors[] = 'Row '.($lineNumber + ($hasHeader ? 2 : 1)).': Unable to determine company_id. Please ensure your user account has a company assigned.';

                            continue;
                        }
                    } else {
                        // Ensure user can only import to their own company
                        if (! $user->isSuperAdmin() && $data['company_id'] != $user->company_id) {
                            $errors[] = 'Row '.($lineNumber + ($hasHeader ? 2 : 1)).': You can only import drivers to your own company.';

                            continue;
                        }
                    }

                    // Validate and set assigned_to
                    // User can assign to themselves or users below them in hierarchy
                    if (isset($data['assigned_to']) && ! empty($data['assigned_to'])) {
                        $assignedUserId = $data['assigned_to'];

                        // Check if assigned user is a subordinate or the current user
                        if (! $user->isSuperAdmin() && ! $user->isSubordinate($assignedUserId)) {
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

                    if (! empty($missingFields)) {
                        $errors[] = 'Row '.($lineNumber + ($hasHeader ? 2 : 1)).': Missing required fields ('.implode(', ', $missingFields).')';

                        continue;
                    }

                    // Ensure company_id is set
                    if (empty($data['company_id'])) {
                        if ($user->isSuperAdmin()) {
                            $errors[] = 'Row '.($lineNumber + ($hasHeader ? 2 : 1)).': company_id is required';

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
                    $errors[] = 'Row '.($lineNumber + ($hasHeader ? 2 : 1)).': '.$e->getMessage();
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
                ->route('leads.leads.import.results')
                ->with('importResults', $importResults);
        } catch (\Exception $e) {
            \Log::error('Import error: '.$e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return redirect()
                ->back()
                ->with('error', 'Import failed: '.$e->getMessage());
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
                    $model = Company::where('name', 'LIKE', '%'.trim($value).'%')->first();

                    return $model?->id;

                case 'riding_company_id':
                    $query = RidingCompany::where('name', $value);
                    if ($companyId) {
                        $query->where('company_id', $companyId);
                    }
                    $model = $query->first();
                    if (! $model && $companyId) {
                        // Create new riding company if not found
                        $model = RidingCompany::create([
                            'name' => $value,
                            'company_id' => $companyId,
                        ]);
                    }

                    return $model?->id;

                case 'campaign_id':
                    $query = Campaign::where('name', $value);
                    if ($companyId) {
                        $query->where('company_id', $companyId);
                    }
                    $model = $query->first();
                    if (! $model && $companyId) {
                        // Create new campaign if not found
                        $model = Campaign::create([
                            'name' => $value,
                            'company_id' => $companyId,
                        ]);
                    }

                    return $model?->id;

                case 'lead_source_id':
                    $query = LeadSource::where('name', $value);
                    $model = $query->first();
                    if (! $model) {
                        // Create new lead source if not found
                        $model = LeadSource::create([
                            'name' => $value,
                        ]);
                    }

                    return $model?->id;

                case 'lead_status_id':
                    $query = LeadStatus::where('name', $value);
                    $model = $query->first();
                    if (! $model) {
                        // Create new lead status if not found
                        $model = LeadStatus::create([
                            'name' => $value,
                        ]);
                    }

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
     * Get custom dropdown options (static + custom values)
     */
    protected function getCustomDropdownOptions(string $field, ?int $companyId): array
    {
        $staticOptions = [];

        if ($field === 'governorate') {
            // Static governorate options
            $staticOptions = [
                'Cairo', 'Giza', 'Alexandria', 'Dakahlia', 'Red Sea', 'Beheira',
                'Fayoum', 'Gharbia', 'Ismailia', 'Menofia', 'Minya', 'Qaliubiya',
                'New Valley', 'North Sinai', 'Port Said', 'Qena', 'South Sinai',
                'Sohag', 'Suez', 'Aswan', 'Assiut', 'Beni Suef', 'Damietta',
                'Sharqia', 'Kafr El Sheikh', 'Matruh', 'Luxor', 'Qalyubia',
                'New Cairo', '6th of October',
            ];
        } elseif ($field === 'cancel_reason') {
            // Static cancel reason options (exclude riding-related for demo_reseller)
            $staticOptions = [
                'Not interested', 'Wrong Number', 'Under Age', 'Duplicated',
                'Wrong Documents', 'Other', 'Expired', 'Cities',
            ];
            if (! config('app.demo_reseller', false)) {
                $staticOptions = array_merge($staticOptions, [
                    'Car Not Accepted', 'Already driver', 'Dont have driving license',
                ]);
            } else {
                $staticOptions[] = 'Already lead';
            }
        }

        // Get custom values from database
        $customValues = [];
        try {
            if (\Schema::hasTable('custom_dropdown_values')) {
                $query = \DB::table('custom_dropdown_values')
                    ->where('field', $field);

                if ($companyId) {
                    $query->where(function ($q) use ($companyId) {
                        $q->where('company_id', $companyId)
                            ->orWhereNull('company_id');
                    });
                } else {
                    $query->whereNull('company_id');
                }

                $customValues = $query->pluck('value')->toArray();
            }
        } catch (\Exception $e) {
            \Log::debug('Could not get custom dropdown values: '.$e->getMessage());
        }

        // Merge static and custom values, remove duplicates
        $allOptions = array_unique(array_merge($staticOptions, $customValues));
        sort($allOptions);

        // Convert to format expected by frontend
        return array_map(fn ($opt) => ['value' => $opt, 'label' => $opt], $allOptions);
    }

    /**
     * Add custom value to dropdown list if it doesn't exist
     */
    protected function addCustomDropdownValue(string $field, string $value, ?int $companyId): void
    {
        if (empty($value)) {
            return;
        }

        $cacheKey = "custom_dropdown_values_{$field}";
        if ($companyId) {
            $cacheKey .= "_{$companyId}";
        }

        // Get existing values from cache
        $existingValues = \Cache::get($cacheKey, []);

        // Check if value already exists (case-insensitive)
        $valueLower = strtolower(trim($value));
        $exists = false;
        foreach ($existingValues as $existing) {
            if (strtolower(trim($existing)) === $valueLower) {
                $exists = true;
                break;
            }
        }

        // Add new value if it doesn't exist
        if (! $exists) {
            $existingValues[] = trim($value);
            // Store in cache (permanent storage - you might want to use database instead)
            \Cache::forever($cacheKey, $existingValues);

            // Also store in database for persistence
            $this->storeCustomDropdownValue($field, trim($value), $companyId);
        }
    }

    /**
     * Store custom dropdown value in database
     */
    protected function storeCustomDropdownValue(string $field, string $value, ?int $companyId): void
    {
        try {
            // Use a simple table to store custom values
            // You might want to create a dedicated table for this
            $tableName = 'custom_dropdown_values';

            // Check if table exists, if not, we'll just use cache
            if (! \Schema::hasTable($tableName)) {
                return;
            }

            // Check if value already exists
            $exists = \DB::table($tableName)
                ->where('field', $field)
                ->where('value', $value)
                ->where('company_id', $companyId)
                ->exists();

            if (! $exists) {
                \DB::table($tableName)->insert([
                    'field' => $field,
                    'value' => $value,
                    'company_id' => $companyId,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        } catch (\Exception $e) {
            // If table doesn't exist or any error, just continue with cache
            \Log::debug('Could not store custom dropdown value: '.$e->getMessage());
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
                        $resolved[$key] = $ridingCompany ? $ridingCompany->name : "Reseller #{$value}";
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
            $cleanedNumber = '0'.substr($cleanedNumber, 4);
        } elseif (strpos($cleanedNumber, '+20') === 0 && strlen($cleanedNumber) === 13) {
            $cleanedNumber = '0'.substr($cleanedNumber, 3);
        } elseif (strpos($cleanedNumber, '20') === 0 && strlen($cleanedNumber) === 12) {
            $cleanedNumber = '0'.substr($cleanedNumber, 2);
        } elseif (preg_match('/^(10|11|12|15)/', $cleanedNumber) && strlen($cleanedNumber) === 10) {
            $cleanedNumber = '0'.$cleanedNumber;
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
                ->route('leads.leads.index');
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

        $filename = "import_{$type}_".date('Y-m-d_His').'.csv';
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
        fputcsv($output, ['Row', 'Full Name', 'Phone', 'Email', 'Reseller', 'Campaign', 'Lead Source', 'Lead Status', 'Assigned To', 'Driver ID']);

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
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
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
            ->route('leads.leads.index')
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

        $campaigns = $user->isSuperAdmin()
            ? Campaign::orderBy('name')->get(['id', 'name'])
            : Campaign::when($companyId, fn ($q) => $q->where('company_id', $companyId))->orderBy('name')->get(['id', 'name']);

        $leadSources = LeadSource::active()->orderBy('name')->get(['id', 'name']);

        $leadStatuses = LeadStatus::active()->ordered()->get(['id', 'name', 'color']);

        $users = $user->isSuperAdmin()
            ? User::where('is_active', true)->orderBy('name')->get(['id', 'name'])
            : User::when($companyId, fn ($q) => $q->where('company_id', $companyId))->where('is_active', true)->orderBy('name')->get(['id', 'name']);

        return Inertia::render('Drivers/Drivers/MassEdit', [
            'drivers' => $drivers,
            'ids' => $ids,
            'companies' => $companies,
            'ridingCompanies' => [],
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
            'assigned_to' => ['nullable', 'string'],
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
            $newCompanyId = $request->company_id ? (int) $request->company_id : null;
            $updateData['company_id'] = $newCompanyId;
            // When super admin moves leads to another company, clear reseller (riding_company) so it belongs to the new company
            $updateData['riding_company_id'] = null;
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
            // Convert datetime-local format (Y-m-d\TH:i) to datetime format (Y-m-d H:i:s)
            $nextFollowUp = $request->next_follow_up;
            if (strpos($nextFollowUp, 'T') !== false) {
                // Format: Y-m-d\TH:i -> Y-m-d H:i:s
                $nextFollowUp = str_replace('T', ' ', $nextFollowUp).':00';
            }
            $updateData['next_follow_up'] = $nextFollowUp;
            // Update last_follow_up to current datetime when next_follow_up is updated
            $updateData['last_follow_up'] = now();
        }
        if ($request->filled('assigned_to') && ! in_array('assigned_to', $clearFields)) {
            $newAssignedTo = $request->assigned_to ? (int) $request->assigned_to : null;
            $updateData['assigned_to'] = $newAssignedTo;
            // Update last_assigned_time and last_assigned_by when assigned_to changes
            $updateData['last_assigned_time'] = now();
            $updateData['last_assigned_by'] = $user->id;

            // Update team_leader_id, account_manager_id, riding_company_id, and company_id (Reseller Company) from new assigned user
            if ($newAssignedTo) {
                $newAssignedUser = User::find($newAssignedTo);
                if ($newAssignedUser) {
                    $updateData['team_leader_id'] = $newAssignedUser->team_leader_id;
                    $updateData['account_manager_id'] = $newAssignedUser->account_manager_id;
                    $updateData['riding_company_id'] = $newAssignedUser->riding_company_id;
                    // Reseller Company = new sales person's company; if assigned to super admin, lead has no Reseller Company
                    $updateData['company_id'] = ($newAssignedUser->is_super_admin ?? false)
                        ? (Company::getSystemCompany()?->id)
                        : $newAssignedUser->company_id;
                }
            } else {
                $updateData['team_leader_id'] = null;
                $updateData['account_manager_id'] = null;
                $updateData['company_id'] = null;
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
                    ? $existingNotes."\n\n".date('Y-m-d H:i:s').': '.$notes
                    : date('Y-m-d H:i:s').': '.$notes;
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
            ->route('leads.leads.index', ['updated' => now()->timestamp])
            ->with('success', "{$count} driver(s) updated successfully.");
    }

    /**
     * Merge multiple drivers into one primary driver
     */
    public function merge(\Illuminate\Http\Request $request): \Illuminate\Http\RedirectResponse
    {
        $request->validate([
            'primary_driver_id' => ['required', 'integer', 'exists:drivers,id'],
            'driver_ids' => ['required', 'array', 'min:2', 'max:3'],
            'driver_ids.*' => ['integer', 'exists:drivers,id'],
            'field_mappings' => ['required', 'array'],
        ]);

        $primaryDriverId = $request->input('primary_driver_id');
        $driverIds = $request->input('driver_ids', []);
        $fieldMappings = $request->input('field_mappings', []);

        // Ensure primary driver is in the list
        if (! in_array($primaryDriverId, $driverIds)) {
            return redirect()
                ->route('leads.leads.index')
                ->with('error', 'Primary driver must be in the list of drivers to merge.');
        }

        // Get all drivers
        $drivers = Driver::whereIn('id', $driverIds)->get();
        $primaryDriver = $drivers->firstWhere('id', $primaryDriverId);
        $otherDrivers = $drivers->where('id', '!=', $primaryDriverId);

        if (! $primaryDriver) {
            return redirect()
                ->route('leads.leads.index')
                ->with('error', 'Primary driver not found.');
        }

        \DB::beginTransaction();
        try {
            // Update primary driver with selected field values
            $updateData = [];

            foreach ($fieldMappings as $fieldName => $selectedDriverId) {
                $selectedDriver = $drivers->firstWhere('id', $selectedDriverId);
                if (! $selectedDriver) {
                    continue;
                }

                switch ($fieldName) {
                    case 'riding_company_id':
                        $updateData['riding_company_id'] = $selectedDriver->riding_company_id;
                        break;
                    case 'campaign_id':
                        $updateData['campaign_id'] = $selectedDriver->campaign_id;
                        break;
                    case 'lead_source_id':
                        $updateData['lead_source_id'] = $selectedDriver->lead_source_id;
                        break;
                    case 'lead_status_id':
                        $updateData['lead_status_id'] = $selectedDriver->lead_status_id;
                        break;
                    case 'lead_stage_id':
                        $updateData['lead_stage_id'] = $selectedDriver->lead_stage_id;
                        break;
                    case 'assigned_to':
                        $updateData['assigned_to'] = $selectedDriver->assigned_to;
                        break;
                    case 'assigned_users':
                        // Use the selected driver's assigned users
                        $primaryDriver->assignedUsers()->sync($selectedDriver->assignedUsers->pluck('id')->toArray());
                        break;
                    case 'full_name':
                        $updateData['full_name'] = $selectedDriver->full_name;
                        break;
                    case 'phone':
                        $updateData['phone'] = $selectedDriver->phone;
                        break;
                    case 'whatsapp_phone':
                        $updateData['whatsapp_phone'] = $selectedDriver->whatsapp_phone;
                        break;
                    case 'email':
                        $updateData['email'] = $selectedDriver->email;
                        break;
                    case 'lead_status_comment':
                        $updateData['lead_status_comment'] = $selectedDriver->lead_status_comment;
                        break;
                    case 'next_follow_up':
                        $updateData['next_follow_up'] = $selectedDriver->next_follow_up;
                        break;
                    case 'last_follow_up':
                        $updateData['last_follow_up'] = $selectedDriver->last_follow_up;
                        break;
                    case 'notes':
                        // Merge notes from all drivers
                        $allNotes = collect([$primaryDriver->notes])
                            ->merge($otherDrivers->pluck('notes'))
                            ->filter()
                            ->unique()
                            ->implode("\n\n");
                        $updateData['notes'] = $allNotes;
                        break;
                }
            }

            // Update primary driver
            if (! empty($updateData)) {
                $primaryDriver->update($updateData);
            }

            // Merge follow-ups from all other drivers
            foreach ($otherDrivers as $otherDriver) {
                DriverFollowUp::where('driver_id', $otherDriver->id)
                    ->update(['driver_id' => $primaryDriver->id]);
            }

            // Merge documents from all other drivers
            foreach ($otherDrivers as $otherDriver) {
                DriverDocument::where('driver_id', $otherDriver->id)
                    ->update(['driver_id' => $primaryDriver->id]);
            }

            // Log merge activity
            $mergedDriverIds = $otherDrivers->pluck('id')->toArray();
            activity()
                ->performedOn($primaryDriver)
                ->causedBy(auth()->user())
                ->withProperties([
                    'attributes' => [
                        'merged_drivers' => $mergedDriverIds,
                        'merge_date' => now()->toDateTimeString(),
                    ],
                ])
                ->log('merged');

            // Delete other drivers
            foreach ($otherDrivers as $otherDriver) {
                $otherDriver->delete();
            }

            \DB::commit();

            return redirect()
                ->route('leads.leads.index')
                ->with('success', config('app.demo_reseller', false) ? 'Leads merged successfully.' : 'Drivers merged successfully.');
        } catch (\Exception $e) {
            \DB::rollBack();

            return redirect()
                ->route('leads.leads.index')
                ->with('error', 'Failed to merge drivers: '.$e->getMessage());
        }
    }

    /**
     * Get riding companies accessible by the user
     */
    protected function getRidingCompaniesForUser($user, $companyId = null)
    {
        // Check if the riding_companies table exists before querying
        if (!\Illuminate\Support\Facades\Schema::hasTable('riding_companies')) {
            return collect();
        }

        if ($user->isSuperAdmin()) {
            return RidingCompany::active()->orderBy('name')->get(['id', 'name', 'company_id']);
        }

        if ($user->is_company_admin) {
            // Company admin sees all riding companies in their company
            return RidingCompany::when($companyId, fn ($q) => $q->where('company_id', $companyId))
                ->active()
                ->orderBy('name')
                ->get(['id', 'name', 'company_id']);
        }

        if ($user->riding_company_id) {
            // Regular user sees only their riding company
            return RidingCompany::where('id', $user->riding_company_id)
                ->active()
                ->get(['id', 'name', 'company_id']);
        }

        return collect();
    }

    /**
     * When the current user belongs to a reseller company (riding_company_id), set the lead's
     * company_id and riding_company_id to that user's company so the lead shows under that reseller.
     */
    protected function syncDriverCompanyToCurrentUser(Driver $driver): void
    {
        $user = Auth::user();
        if (! $user || ! $user->riding_company_id || ! $user->company_id) {
            return;
        }

        $updates = [];
        if ($driver->company_id != $user->company_id) {
            $updates['company_id'] = $user->company_id;
        }
        if (Schema::hasColumn($driver->getTable(), 'riding_company_id') && $driver->riding_company_id != $user->riding_company_id) {
            $updates['riding_company_id'] = $user->riding_company_id;
        }
        if (! empty($updates)) {
            $driver->update($updates);
            $driver->refresh();
        }
    }

    /**
     * Map database field names to permission field names
     */
    protected function mapFieldNameForPermission(string $fieldName): ?string
    {
        $mapping = [
            'full_name' => 'full_name',
            'phone' => 'phone',
            'whatsapp_phone' => 'whatsapp_phone',
            'email' => 'email',
            'campaign_id' => 'campaign',
            'lead_source_id' => 'lead_source',
            'lead_status_id' => 'lead_status',
            'lead_status_comment' => 'lead_status_comment',
            'next_follow_up' => 'next_follow_up',
            'last_follow_up' => 'last_follow_up',
            'assigned_to' => 'assigned_to',
            'cancel_reason' => 'cancel_reason',
            'last_assigned_by' => 'last_assigned_by',
            'notes' => 'notes',
            'vehicle_type' => 'vehicle_type',
            'car_or_scooter' => 'car_or_scooter',
            'vehicle_type_and_year' => 'vehicle_type_and_year',
            'has_worked_before' => 'has_worked_before',
            'worked_with_us_before' => 'worked_with_us_before',
            'city' => 'city',
            'feedback_count' => 'feedback_count',
            'driver_num' => 'driver_num',
            'duplicate' => 'duplicate',
            'confirm_duplicate' => 'confirm_duplicate',
            'riding_company_id' => 'riding_company',
            'lead_stage_id' => 'lead_stage',
            'team_leader_id' => 'team_leader',
            'account_manager_id' => 'account_manager',
            'last_assigned_time' => 'last_assigned_time',
        ];

        return $mapping[$fieldName] ?? null;
    }
}
