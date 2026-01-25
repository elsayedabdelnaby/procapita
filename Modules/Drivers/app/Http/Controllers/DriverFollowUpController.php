<?php

namespace Modules\Drivers\app\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Drivers\app\Http\Requests\DriverFollowUpStoreRequest;
use Modules\Drivers\app\Http\Requests\DriverFollowUpUpdateRequest;
use Modules\Drivers\app\Models\Driver;
use Modules\Drivers\app\Services\DriverFollowUpService;
use App\Models\User;

class DriverFollowUpController extends Controller
{
    public function __construct(
        protected DriverFollowUpService $followUpService
    ) {}

    public function index(Request $request): Response
    {
        $driverId = $request->input('driver_id');
        $companyId = $this->getCompanyId();
        $user = Auth::user();
        $followUps = $this->followUpService->getAllFollowUps($driverId, $companyId, $user);

        return Inertia::render('Drivers/DriverFollowUps/Index', [
            'followUps' => $followUps->map(fn($followUp) => [
                'id' => $followUp->id,
                'driver_id' => $followUp->driver_id,
                'driver' => $followUp->driver ? [
                    'id' => $followUp->driver->id,
                    'uuid' => $followUp->driver->uuid,
                    'driver_num' => $followUp->driver->driver_num ?? (string) $followUp->driver->id,
                    'full_name' => $followUp->driver->full_name,
                    'phone' => $followUp->driver->phone,
                    'whatsapp_phone' => $followUp->driver->whatsapp_phone,
                    'email' => $followUp->driver->email,
                    'riding_company' => $followUp->driver->ridingCompany ? [
                        'id' => $followUp->driver->ridingCompany->id,
                        'name' => $followUp->driver->ridingCompany->name,
                    ] : null,
                    'campaign' => $followUp->driver->campaign ? [
                        'id' => $followUp->driver->campaign->id,
                        'name' => $followUp->driver->campaign->name,
                    ] : null,
                    'lead_source' => $followUp->driver->leadSource ? [
                        'id' => $followUp->driver->leadSource->id,
                        'name' => $followUp->driver->leadSource->name,
                    ] : null,
                    'lead_status' => $followUp->driver->leadStatus ? [
                        'id' => $followUp->driver->leadStatus->id,
                        'name' => $followUp->driver->leadStatus->name,
                        'color' => $followUp->driver->leadStatus->color,
                    ] : null,
                    'lead_stage' => $followUp->driver->leadStage ? [
                        'id' => $followUp->driver->leadStage->id,
                        'name' => $followUp->driver->leadStage->name,
                        'color' => $followUp->driver->leadStage->color,
                    ] : null,
                    'assigned_to' => $followUp->driver->assignedTo ? [
                        'id' => $followUp->driver->assignedTo->id,
                        'name' => $followUp->driver->assignedTo->name,
                    ] : null,
                    'assigned_users' => $followUp->driver->assignedUsers->map(fn($user) => [
                        'id' => $user->id,
                        'name' => $user->name,
                    ])->toArray(),
                    'next_follow_up' => $followUp->driver->next_follow_up?->format('Y-m-d'),
                    'last_follow_up' => $followUp->driver->last_follow_up?->format('Y-m-d'),
                    'cancel_reason' => $followUp->driver->cancel_reason,
                    'created_at' => $followUp->driver->created_at?->toISOString(),
                    'updated_at' => $followUp->driver->updated_at?->toISOString(),
                ] : null,
                'driver_num' => $followUp->driver_num ?? ($followUp->driver ? (string) $followUp->driver->id : null),
                'assigned_to' => $followUp->assigned_to,
                'assigned_to_user' => $followUp->assignedTo ? [
                    'id' => $followUp->assignedTo->id,
                    'name' => $followUp->assignedTo->name,
                ] : null,
                'user_name' => $followUp->user_name,
                'created_time' => $followUp->created_time?->toISOString(),
                'riding_company' => $followUp->riding_company,
                'lead_stage' => $followUp->lead_stage,
                'lead_status' => $followUp->lead_status,
                'lead_status_comment' => $followUp->lead_status_comment,
                'notes' => $followUp->notes,
                'created_at' => $followUp->created_at?->toISOString(),
                'updated_at' => $followUp->updated_at?->toISOString(),
            ]),
        ]);
    }

    public function recycleBin(): Response
    {
        $driverId = request()->input('driver_id');
        $companyId = $this->getCompanyId();
        $user = Auth::user();
        
        $query = \Modules\Drivers\app\Models\DriverFollowUp::onlyTrashed();

        // Filter by company if applicable
        if ($companyId) {
            $query->whereHas('driver', function ($q) use ($companyId) {
                $q->where('company_id', $companyId);
            });
        }

        // Filter by driver if provided
        if ($driverId) {
            $query->where('driver_id', $driverId);
        }

        $followUps = $query->with(['driver', 'assignedTo'])->orderBy('deleted_at', 'desc')->get();

        return Inertia::render('Drivers/DriverFollowUps/RecycleBin', [
            'followUps' => $followUps->map(fn($followUp) => [
                'id' => $followUp->id,
                'driver_id' => $followUp->driver_id,
                'driver' => $followUp->driver ? [
                    'id' => $followUp->driver->id,
                    'uuid' => $followUp->driver->uuid,
                    'driver_num' => $followUp->driver->driver_num ?? (string) $followUp->driver->id,
                    'full_name' => $followUp->driver->full_name,
                    'phone' => $followUp->driver->phone,
                ] : null,
                'driver_num' => $followUp->driver_num ?? ($followUp->driver ? (string) $followUp->driver->id : null),
                'assigned_to' => $followUp->assigned_to,
                'assigned_to_user' => $followUp->assignedTo ? [
                    'id' => $followUp->assignedTo->id,
                    'name' => $followUp->assignedTo->name,
                ] : null,
                'user_name' => $followUp->user_name,
                'created_time' => $followUp->created_time?->toISOString(),
                'riding_company' => $followUp->riding_company,
                'lead_stage' => $followUp->lead_stage,
                'lead_status' => $followUp->lead_status,
                'lead_status_comment' => $followUp->lead_status_comment,
                'notes' => $followUp->notes,
                'created_at' => $followUp->created_at?->toISOString(),
                'updated_at' => $followUp->updated_at?->toISOString(),
                'deleted_at' => $followUp->deleted_at?->toISOString(),
            ]),
        ]);
    }

    public function create(): Response
    {
        $user = Auth::user();
        $companyId = $this->getCompanyId();

        $drivers = Driver::when($companyId, fn($q) => $q->where('company_id', $companyId))
            ->orderBy('full_name')
            ->get(['id', 'full_name', 'phone']);
        $users = User::when($companyId, fn($q) => $q->where('company_id', $companyId))
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('Drivers/DriverFollowUps/Create', [
            'drivers' => $drivers,
            'users' => $users,
        ]);
    }

    public function store(DriverFollowUpStoreRequest $request): RedirectResponse
    {
        try {
            $data = $request->validated();
            $this->followUpService->createFollowUp($data);

            return redirect()
                ->route('drivers.driverfollowups.index')
                ->with('success', 'Follow-up created successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->withInput()
                ->withErrors(['error' => 'Failed to create follow-up: ' . $e->getMessage()]);
        }
    }

    public function show(int $id): Response
    {
        $followUp = $this->followUpService->getFollowUpById($id);

        if (!$followUp) {
            abort(404, 'Follow-up not found.');
        }

        return Inertia::render('Drivers/DriverFollowUps/Show', [
            'followUp' => [
                'id' => $followUp->id,
                'driver_id' => $followUp->driver_id,
                'driver' => $followUp->driver ? [
                    'id' => $followUp->driver->id,
                    'full_name' => $followUp->driver->full_name,
                    'phone' => $followUp->driver->phone,
                    'email' => $followUp->driver->email,
                ] : null,
                'assigned_to' => $followUp->assigned_to,
                'assigned_to_user' => $followUp->assignedTo ? [
                    'id' => $followUp->assignedTo->id,
                    'name' => $followUp->assignedTo->name,
                    'email' => $followUp->assignedTo->email,
                ] : null,
                'user_name' => $followUp->user_name,
                'created_time' => $followUp->created_time?->toISOString(),
                'riding_company' => $followUp->riding_company,
                'lead_stage' => $followUp->lead_stage,
                'lead_status' => $followUp->lead_status,
                'lead_status_comment' => $followUp->lead_status_comment,
                'notes' => $followUp->notes,
                'created_at' => $followUp->created_at?->toISOString(),
                'updated_at' => $followUp->updated_at?->toISOString(),
            ],
        ]);
    }

    public function edit(int $id): Response
    {
        $followUp = $this->followUpService->getFollowUpById($id);

        if (!$followUp) {
            abort(404, 'Follow-up not found.');
        }

        $user = Auth::user();
        $companyId = $this->getCompanyId();

        $drivers = Driver::when($companyId, fn($q) => $q->where('company_id', $companyId))
            ->orderBy('full_name')
            ->get(['id', 'full_name', 'phone']);
        $users = User::when($companyId, fn($q) => $q->where('company_id', $companyId))
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('Drivers/DriverFollowUps/Edit', [
            'followUp' => [
                'id' => $followUp->id,
                'driver_id' => $followUp->driver_id,
                'driver_num' => $followUp->driver_num ?? ($followUp->driver ? (string) $followUp->driver->id : null),
                'assigned_to' => $followUp->assigned_to,
                'user_name' => $followUp->user_name,
                'created_time' => $followUp->created_time?->toISOString(),
                'riding_company' => $followUp->riding_company,
                'lead_stage' => $followUp->lead_stage,
                'lead_status' => $followUp->lead_status,
                'lead_status_comment' => $followUp->lead_status_comment,
                'notes' => $followUp->notes,
            ],
            'drivers' => $drivers,
            'users' => $users,
        ]);
    }

    public function update(int $id, DriverFollowUpUpdateRequest $request): RedirectResponse
    {
        try {
            $data = $request->validated();
            $this->followUpService->updateFollowUp($id, $data);

            return redirect()
                ->route('drivers.driverfollowups.index')
                ->with('success', 'Follow-up updated successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->withInput()
                ->withErrors(['error' => 'Failed to update follow-up: ' . $e->getMessage()]);
        }
    }

    public function destroy(int $id): RedirectResponse
    {
        try {
            $this->followUpService->deleteFollowUp($id);

            return redirect()
                ->route('drivers.driverfollowups.index')
                ->with('success', 'Follow-up deleted successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->withErrors(['error' => 'Failed to delete follow-up: ' . $e->getMessage()]);
        }
    }

    public function massDelete(Request $request): RedirectResponse
    {
        $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['required', 'integer', 'exists:driver_follow_ups,id'],
        ]);

        try {
            $ids = $request->input('ids');
            $this->followUpService->deleteMultipleFollowUps($ids);

            return redirect()
                ->route('drivers.driverfollowups.index')
                ->with('success', count($ids) . ' follow-up(s) deleted successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->withErrors(['error' => 'Failed to delete follow-ups: ' . $e->getMessage()]);
        }
    }

    public function massEdit(Request $request): Response|RedirectResponse
    {
        $ids = $request->input('ids');
        
        if (!$ids || !is_array($ids)) {
            return redirect()->route('drivers.driverfollowups.index')
                ->withErrors(['error' => 'No follow-ups selected.']);
        }

        $followUps = $this->followUpService->getFollowUpsByIds($ids);
        
        $user = Auth::user();
        $companyId = $this->getCompanyId();

        $drivers = Driver::when($companyId, fn($q) => $q->where('company_id', $companyId))
            ->orderBy('full_name')
            ->get(['id', 'full_name', 'phone']);
        $users = User::when($companyId, fn($q) => $q->where('company_id', $companyId))
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('Drivers/DriverFollowUps/MassEdit', [
            'followUps' => $followUps->map(fn($followUp) => [
                'id' => $followUp->id,
                'driver_id' => $followUp->driver_id,
                'driver' => $followUp->driver ? [
                    'id' => $followUp->driver->id,
                    'full_name' => $followUp->driver->full_name,
                ] : null,
                'assigned_to' => $followUp->assigned_to,
                'user_name' => $followUp->user_name,
                'created_time' => $followUp->created_time?->toISOString(),
                'riding_company' => $followUp->riding_company,
                'lead_stage' => $followUp->lead_stage,
                'lead_status' => $followUp->lead_status,
                'lead_status_comment' => $followUp->lead_status_comment,
                'notes' => $followUp->notes,
            ]),
            'drivers' => $drivers,
            'users' => $users,
        ]);
    }

    public function massUpdate(Request $request): RedirectResponse
    {
        $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['required', 'integer', 'exists:driver_follow_ups,id'],
            'assigned_to' => ['nullable', 'exists:users,id'],
            'user_name' => ['nullable', 'string', 'max:255'],
            'riding_company' => ['nullable', 'string', 'max:255'],
            'lead_stage' => ['nullable', 'string', 'max:255'],
            'lead_status' => ['nullable', 'string', 'max:255'],
            'lead_status_comment' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
        ]);

        try {
            $ids = $request->input('ids');
            $data = $request->only(['assigned_to', 'user_name', 'riding_company', 'lead_stage', 'lead_status', 'lead_status_comment', 'notes']);
            
            // Remove null values
            $data = array_filter($data, fn($value) => $value !== null);
            
            $this->followUpService->updateMultipleFollowUps($ids, $data);

            return redirect()
                ->route('drivers.driverfollowups.index')
                ->with('success', count($ids) . ' follow-up(s) updated successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->withErrors(['error' => 'Failed to update follow-ups: ' . $e->getMessage()]);
        }
    }

    public function export(Request $request): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $user = Auth::user();
        $companyId = $this->getCompanyId();
        
        // Check if specific IDs are requested
        $ids = $request->input('ids');
        if ($ids) {
            // Export selected follow-ups only
            $idsArray = is_array($ids) ? $ids : explode(',', $ids);
            $followUps = $this->followUpService->getFollowUpsByIds($idsArray);
        } else {
            // Export all visible follow-ups
            $followUps = $this->followUpService->getAllFollowUps(null, $companyId, $user);
        }

        // Create CSV
        $filename = 'driver_follow_ups_export_' . date('Y-m-d_His') . '.csv';
        
        // Add UTF-8 BOM for Excel compatibility
        $content = "\xEF\xBB\xBF";
        
        // Open output stream
        $output = fopen('php://temp', 'r+');

        // Headers - based on the columns shown in the image
        fputcsv($output, [
            'Actions (Follow-ups)',
            'Created Time (Follow-ups)',
            'Driver Number (Follow-ups)',
            'Driver (Follow-ups)',
            'Phone (Drivers)',
            'User Name (Follow-ups)',
            'Assigned To (Follow-ups)',
            'Riding Company (Follow-ups)',
            'Lead Stage (Follow-ups)',
            'Lead Status (Follow-ups)',
            'Feedback Comment (Follow-ups)',
            'Notes (Follow-ups)',
            'Created At (Follow-ups)',
            'WhatsApp (Drivers)',
            'Email (Drivers)',
            'Riding Company (Drivers)',
            'Campaign (Drivers)',
            'Lead Source (Drivers)',
            'Lead Status (Drivers)',
            'Feedback Comment (Drivers)',
            'Next Follow-up (Drivers)',
            'Last Follow-up (Drivers)',
            'Lead Stage (Drivers)',
            'Assigned To (Drivers)',
            'Assigned Users (Drivers)',
            'UUID (Drivers)',
            'Created At (Drivers)',
            'Updated At (Drivers)',
        ]);

        // Data
        foreach ($followUps as $followUp) {
            $driver = $followUp->driver;
            $assignedUsers = $driver && $driver->assigned_users ? $driver->assigned_users->map(fn($u) => $u->name)->join(', ') : '';
            
            fputcsv($output, [
                '', // Actions
                $followUp->created_time ? $followUp->created_time->format('Y-m-d H:i:s') : '',
                $followUp->driver_num ?? ($driver ? (string) $driver->id : ''),
                $driver ? $driver->full_name : '',
                $driver ? ($driver->phone ?? '') : '',
                $followUp->user_name ?? '',
                $followUp->assignedTo ? $followUp->assignedTo->name : '',
                $followUp->riding_company ?? '',
                $followUp->lead_stage ?? '',
                $followUp->lead_status ?? '',
                $followUp->lead_status_comment ?? '',
                $followUp->notes ?? '',
                $followUp->created_at ? $followUp->created_at->format('Y-m-d H:i:s') : '',
                $driver ? ($driver->whatsapp_phone ?? '') : '',
                $driver ? ($driver->email ?? '') : '',
                $driver && $driver->ridingCompany ? $driver->ridingCompany->name : '',
                $driver && $driver->campaign ? $driver->campaign->name : '',
                $driver && $driver->leadSource ? $driver->leadSource->name : '',
                $driver && $driver->leadStatus ? $driver->leadStatus->name : '',
                $driver ? ($driver->lead_status_comment ?? '') : '',
                $driver && $driver->next_follow_up ? $driver->next_follow_up->format('Y-m-d') : '',
                $driver && $driver->last_follow_up ? $driver->last_follow_up->format('Y-m-d') : '',
                $driver && $driver->leadStage ? $driver->leadStage->name : '',
                $driver && $driver->assignedTo ? $driver->assignedTo->name : '',
                $assignedUsers,
                $driver ? ($driver->uuid ?? '') : '',
                $driver && $driver->created_at ? $driver->created_at->format('Y-m-d H:i:s') : '',
                $driver && $driver->updated_at ? $driver->updated_at->format('Y-m-d H:i:s') : '',
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

    protected function getCompanyId(): ?int
    {
        $user = Auth::user();
        if ($user && $user->is_super_admin) {
            return null; // Super admin can see all
        }
        return $user?->company_id;
    }
}

