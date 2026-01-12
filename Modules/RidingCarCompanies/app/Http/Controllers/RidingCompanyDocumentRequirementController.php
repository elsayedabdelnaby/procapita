<?php

namespace Modules\RidingCarCompanies\app\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;
use Modules\RidingCarCompanies\app\Http\Requests\RidingCompanyDocumentRequirementStoreRequest;
use Modules\RidingCarCompanies\app\Http\Requests\RidingCompanyDocumentRequirementUpdateRequest;
use Modules\RidingCarCompanies\app\Models\RidingCompany;
use Modules\RidingCarCompanies\app\Services\RidingCompanyDocumentRequirementService;

class RidingCompanyDocumentRequirementController extends Controller
{
    public function __construct(
        protected RidingCompanyDocumentRequirementService $documentRequirementService
    ) {}

    public function index(int $ridingCompanyId): Response
    {
        $user = Auth::user();
        $companyId = $user->isSuperAdmin() ? null : $user->company_id;

        // If super admin, use ridingCompanyId from URL
        // If not super admin, verify the riding company belongs to user's company
        if ($user->isSuperAdmin()) {
            $ridingCompany = RidingCompany::findOrFail($ridingCompanyId);
        } else {
            // For non-super admin, verify the riding company belongs to their company
            $ridingCompany = RidingCompany::where('id', $ridingCompanyId)
                ->where('company_id', $user->company_id)
                ->firstOrFail();
        }

        // Get ALL document requirements for all riding companies (not just the one in URL)
        // Filter by company if not super admin
        $documentRequirementsQuery = \Modules\RidingCarCompanies\app\Models\RidingCompanyDocumentRequirement::with(['ridingCompany']);

        if ($companyId) {
            $documentRequirementsQuery->whereHas('ridingCompany', function ($q) use ($companyId) {
                $q->where('company_id', $companyId);
            });
        }

        $allRequirements = $documentRequirementsQuery
            ->orderBy('name')
            ->orderBy('riding_company_id')
            ->get();

        // Get all driver documents to show which ones are being used
        $driverDocumentsQuery = \Modules\Drivers\app\Models\DriverDocument::with(['ridingCompany'])
            ->whereHas('driver', function ($q) use ($companyId) {
                $q->whereNull('deleted_at');
                if ($companyId) {
                    $q->where('company_id', $companyId);
                }
            })
            ->whereNotNull('name');

        if ($companyId) {
            $driverDocumentsQuery->whereHas('ridingCompany', function ($q) use ($companyId) {
                $q->where('company_id', $companyId);
            });
        }

        $driverDocuments = $driverDocumentsQuery
            ->select('name', 'riding_company_id')
            ->selectRaw('COUNT(DISTINCT driver_id) as driver_count')
            ->groupBy('name', 'riding_company_id')
            ->get()
            ->keyBy(function ($doc) {
                return $doc->name.'_'.$doc->riding_company_id;
            });

        // Group requirements by name and collect all riding companies for each name
        $groupedRequirements = $allRequirements->groupBy('name');

        $documentRequirements = $groupedRequirements->map(function ($requirements, $name) use ($driverDocuments) {
            // Get the first requirement as base (for common fields)
            $firstRequirement = $requirements->first();

            // Collect all riding companies for this requirement name
            $ridingCompanies = $requirements->map(function ($req) {
                return $req->ridingCompany ? [
                    'id' => $req->ridingCompany->id,
                    'name' => $req->ridingCompany->name,
                ] : null;
            })->filter()->values()->toArray();

            // Calculate total driver count across all riding companies
            $totalDriverCount = 0;
            foreach ($requirements as $req) {
                $key = $req->name.'_'.$req->riding_company_id;
                $driverDoc = $driverDocuments->get($key);
                if ($driverDoc) {
                    $totalDriverCount += $driverDoc->driver_count;
                }
            }

            return [
                'id' => $firstRequirement->id, // Use first requirement ID for edit link
                'riding_company_id' => $firstRequirement->riding_company_id, // Keep for compatibility
                'riding_companies' => $ridingCompanies, // Array of all riding companies
                'riding_company' => $ridingCompanies[0] ?? null, // First company for backward compatibility
                'name' => $name,
                'type' => $firstRequirement->type,
                'required' => $firstRequirement->required,
                'instructions' => $firstRequirement->instructions,
                'active' => $firstRequirement->active,
                'default_status' => $firstRequirement->default_status ?? 'pending',
                'created_at' => $firstRequirement->created_at,
                'driver_count' => $totalDriverCount,
            ];
        })->values();

        return Inertia::render('RidingCarCompanies/DocumentRequirements/Index', [
            'ridingCompany' => $ridingCompany, // Keep for navigation/context
            'documentRequirements' => $documentRequirements,
        ]);
    }

    public function create(int $ridingCompanyId): Response
    {
        $user = Auth::user();
        $companyId = $user->isSuperAdmin() ? null : $user->company_id;

        // If super admin, use ridingCompanyId from URL
        // If not super admin, verify the riding company belongs to user's company
        if ($user->isSuperAdmin()) {
            $ridingCompany = RidingCompany::findOrFail($ridingCompanyId);
        } else {
            // For non-super admin, verify the riding company belongs to their company
            $ridingCompany = RidingCompany::where('id', $ridingCompanyId)
                ->where('company_id', $user->company_id)
                ->firstOrFail();
        }

        // Get all available riding companies for multi-select
        $ridingCompaniesQuery = RidingCompany::orderBy('name');
        if ($companyId) {
            $ridingCompaniesQuery->where('company_id', $companyId);
        }
        $ridingCompanies = $ridingCompaniesQuery->get(['id', 'name']);

        return Inertia::render('RidingCarCompanies/DocumentRequirements/Create', [
            'ridingCompany' => $ridingCompany,
            'ridingCompanies' => $ridingCompanies,
        ]);
    }

    public function store(RidingCompanyDocumentRequirementStoreRequest $request, int $ridingCompanyId): RedirectResponse
    {
        try {
            $user = Auth::user();
            $data = $request->validated();
            $companyId = $user->isSuperAdmin() ? null : $user->company_id;

            // Check if riding_company_ids is provided (multi-select)
            $ridingCompanyIds = $data['riding_company_ids'] ?? [];

            if (empty($ridingCompanyIds)) {
                // Fallback to single riding company from URL
                // If super admin, use ridingCompanyId from URL
                // If not super admin, verify the riding company belongs to user's company
                if ($user->isSuperAdmin()) {
                    $ridingCompany = RidingCompany::findOrFail($ridingCompanyId);
                } else {
                    // For non-super admin, verify the riding company belongs to their company
                    $ridingCompany = RidingCompany::where('id', $ridingCompanyId)
                        ->where('company_id', $user->company_id)
                        ->firstOrFail();
                }
                $ridingCompanyIds = [$ridingCompany->id];
            } else {
                // Validate that all selected riding companies belong to user's company
                $ridingCompaniesQuery = RidingCompany::whereIn('id', $ridingCompanyIds);
                if ($companyId) {
                    $ridingCompaniesQuery->where('company_id', $companyId);
                }
                $validRidingCompanies = $ridingCompaniesQuery->get();

                if ($validRidingCompanies->count() !== count($ridingCompanyIds)) {
                    return redirect()
                        ->back()
                        ->withInput()
                        ->with('error', 'One or more selected riding companies are invalid or do not belong to your company.');
                }
            }

            unset($data['riding_company_ids']);
            $data['active'] = $data['active'] ?? true;
            $data['required'] = $data['required'] ?? false;

            // Extract add_to_existing_drivers flag before creating
            $addToExistingDrivers = $data['add_to_existing_drivers'] ?? false;
            unset($data['add_to_existing_drivers']);

            $createdRequirements = [];
            $firstRidingCompanyId = null;

            // Create document requirement for each riding company
            foreach ($ridingCompanyIds as $ridingCompanyIdValue) {
                $requirementData = $data;
                $requirementData['riding_company_id'] = $ridingCompanyIdValue;

                // Temporarily disable the boot event listener
                $documentRequirement = $this->documentRequirementService->createDocumentRequirement($requirementData, false);
                $createdRequirements[] = $documentRequirement;

                if ($firstRidingCompanyId === null) {
                    $firstRidingCompanyId = $ridingCompanyIdValue;
                }

                // If user wants to add to existing drivers, do it manually
                if ($addToExistingDrivers && $documentRequirement->active) {
                    $this->documentRequirementService->addDocumentRequirementToExistingDrivers($documentRequirement->id);
                }
            }

            $message = count($createdRequirements) > 1
                ? 'Document requirement created successfully for '.count($createdRequirements).' riding companies.'
                : 'Document requirement created successfully.';

            return redirect()
                ->route('ridingcarcompanies.documentrequirements.index', $firstRidingCompanyId)
                ->with('success', $message);
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->withInput()
                ->with('error', $e->getMessage());
        }
    }

    public function edit(int $id): Response
    {
        $user = Auth::user();
        $companyId = $user->isSuperAdmin() ? null : $user->company_id;

        $documentRequirement = $this->documentRequirementService->getDocumentRequirementById($id);

        if (! $documentRequirement) {
            abort(404, 'Document requirement not found.');
        }

        // Get all drivers for this riding company
        $driversQuery = \Modules\Drivers\app\Models\Driver::with(['documents'])
            ->where('riding_company_id', $documentRequirement->riding_company_id)
            ->whereNull('deleted_at');

        if ($companyId) {
            $driversQuery->where('company_id', $companyId);
        }

        $drivers = $driversQuery->orderBy('full_name')->get();

        // Get all document requirements for this riding company
        $allDocumentRequirements = \Modules\RidingCarCompanies\app\Models\RidingCompanyDocumentRequirement::where('riding_company_id', $documentRequirement->riding_company_id)
            ->orderBy('name')
            ->get(['id', 'name', 'type', 'required', 'active']);

        // Map drivers with their documents
        $driversWithDocuments = $drivers->map(function ($driver) use ($allDocumentRequirements) {
            $driverDocuments = $driver->documents->keyBy('name');

            $documentsStatus = [];
            foreach ($allDocumentRequirements as $requirement) {
                $doc = $driverDocuments->get($requirement->name);
                if ($doc) {
                    $documentsStatus[$requirement->name] = [
                        'status' => $doc->status,
                        'id' => $doc->id,
                    ];
                } else {
                    $documentsStatus[$requirement->name] = [
                        'status' => 'not_required',
                        'id' => null,
                    ];
                }
            }

            return [
                'id' => $driver->id,
                'full_name' => $driver->full_name,
                'phone' => $driver->phone,
                'documents' => $documentsStatus,
            ];
        });

        // Get all available riding companies for multi-select
        $ridingCompaniesQuery = RidingCompany::orderBy('name');
        if ($companyId) {
            $ridingCompaniesQuery->where('company_id', $companyId);
        }
        $ridingCompanies = $ridingCompaniesQuery->get(['id', 'name']);

        return Inertia::render('RidingCarCompanies/DocumentRequirements/Edit', [
            'documentRequirement' => $documentRequirement->load('ridingCompany'),
            'drivers' => $driversWithDocuments,
            'allDocumentRequirements' => $allDocumentRequirements,
            'ridingCompanies' => $ridingCompanies,
        ]);
    }

    public function update(RidingCompanyDocumentRequirementUpdateRequest $request, int $id): RedirectResponse
    {
        try {
            $user = Auth::user();
            $companyId = $user->isSuperAdmin() ? null : $user->company_id;

            $documentRequirement = $this->documentRequirementService->getDocumentRequirementById($id);

            if (! $documentRequirement) {
                abort(404, 'Document requirement not found.');
            }

            $data = $request->validated();
            $ridingCompanyIds = $data['riding_company_ids'] ?? [];
            unset($data['riding_company_ids']);

            // If multiple riding companies selected, create/update requirements for each
            if (! empty($ridingCompanyIds) && count($ridingCompanyIds) > 1) {
                $updatedCount = 0;
                $createdCount = 0;
                $firstRidingCompanyId = $ridingCompanyIds[0];

                // Update the current requirement with the first riding company
                $updateData = $data;
                $updateData['riding_company_id'] = $firstRidingCompanyId;
                $this->documentRequirementService->updateDocumentRequirement($id, $updateData);
                $updatedCount++;

                // Process remaining riding companies (skip the first one as we already updated it)
                foreach (array_slice($ridingCompanyIds, 1) as $ridingCompanyId) {
                    // Check if a requirement with the same name already exists for this riding company
                    $existingRequirement = \Modules\RidingCarCompanies\app\Models\RidingCompanyDocumentRequirement::where('riding_company_id', $ridingCompanyId)
                        ->where('name', $data['name'])
                        ->where('id', '!=', $id)
                        ->first();

                    if ($existingRequirement) {
                        // Update existing requirement
                        $updateData = $data;
                        $updateData['riding_company_id'] = $ridingCompanyId;
                        $this->documentRequirementService->updateDocumentRequirement($existingRequirement->id, $updateData);
                        $updatedCount++;
                    } else {
                        // Create new requirement for this riding company
                        $createData = $data;
                        $createData['riding_company_id'] = $ridingCompanyId;
                        $this->documentRequirementService->createDocumentRequirement($createData, false);
                        $createdCount++;
                    }
                }

                $message = 'Document requirement updated successfully.';
                if ($createdCount > 0 || $updatedCount > 1) {
                    $message .= " Created {$createdCount} new requirement(s) and updated ".($updatedCount - 1).' existing requirement(s) for other riding companies.';
                }

                return redirect()
                    ->route('ridingcarcompanies.documentrequirements.index', $firstRidingCompanyId)
                    ->with('success', $message);
            } else {
                // Single riding company - normal update
                $data['riding_company_id'] = $ridingCompanyIds[0] ?? $documentRequirement->riding_company_id;
                $this->documentRequirementService->updateDocumentRequirement($id, $data);

                return redirect()
                    ->route('ridingcarcompanies.documentrequirements.index', $data['riding_company_id'])
                    ->with('success', 'Document requirement updated successfully.');
            }
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->withInput()
                ->with('error', $e->getMessage());
        }
    }

    public function destroy(int $id): RedirectResponse
    {
        try {
            $documentRequirement = $this->documentRequirementService->getDocumentRequirementById($id);

            if (! $documentRequirement) {
                abort(404, 'Document requirement not found.');
            }

            $ridingCompanyId = $documentRequirement->riding_company_id;
            $this->documentRequirementService->deleteDocumentRequirement($id);

            return redirect()
                ->route('ridingcarcompanies.documentrequirements.index', $ridingCompanyId)
                ->with('success', 'Document requirement deleted successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }

    public function toggleActive(int $id): RedirectResponse
    {
        try {
            $this->documentRequirementService->toggleActive($id);

            return redirect()
                ->back()
                ->with('success', 'Document requirement status updated successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }
}
