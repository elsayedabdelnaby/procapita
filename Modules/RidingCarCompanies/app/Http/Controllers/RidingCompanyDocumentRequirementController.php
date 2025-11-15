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

        $documentRequirements = $this->documentRequirementService->getAllDocumentRequirements($ridingCompanyId);

        return Inertia::render('RidingCarCompanies/DocumentRequirements/Index', [
            'ridingCompany' => $ridingCompany,
            'documentRequirements' => $documentRequirements,
        ]);
    }

    public function create(int $ridingCompanyId): Response
    {
        $user = Auth::user();

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

        return Inertia::render('RidingCarCompanies/DocumentRequirements/Create', [
            'ridingCompany' => $ridingCompany,
        ]);
    }

    public function store(RidingCompanyDocumentRequirementStoreRequest $request, int $ridingCompanyId): RedirectResponse
    {
        try {
            $user = Auth::user();
            $data = $request->validated();

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

            $data['riding_company_id'] = $ridingCompany->id;
            $data['active'] = $data['active'] ?? true;
            $data['required'] = $data['required'] ?? false;

            $this->documentRequirementService->createDocumentRequirement($data);

            return redirect()
                ->route('ridingcarcompanies.documentrequirements.index', $ridingCompany->id)
                ->with('success', 'Document requirement created successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->withInput()
                ->with('error', $e->getMessage());
        }
    }

    public function edit(int $id): Response
    {
        $documentRequirement = $this->documentRequirementService->getDocumentRequirementById($id);

        if (! $documentRequirement) {
            abort(404, 'Document requirement not found.');
        }

        return Inertia::render('RidingCarCompanies/DocumentRequirements/Edit', [
            'documentRequirement' => $documentRequirement->load('ridingCompany'),
        ]);
    }

    public function update(RidingCompanyDocumentRequirementUpdateRequest $request, int $id): RedirectResponse
    {
        try {
            $documentRequirement = $this->documentRequirementService->getDocumentRequirementById($id);
            
            if (! $documentRequirement) {
                abort(404, 'Document requirement not found.');
            }

            $this->documentRequirementService->updateDocumentRequirement($id, $request->validated());

            return redirect()
                ->route('ridingcarcompanies.documentrequirements.index', $documentRequirement->riding_company_id)
                ->with('success', 'Document requirement updated successfully.');
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

