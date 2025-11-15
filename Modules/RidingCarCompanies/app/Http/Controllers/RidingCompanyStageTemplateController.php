<?php

namespace Modules\RidingCarCompanies\app\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;
use Modules\RidingCarCompanies\app\Http\Requests\RidingCompanyStageTemplateStoreRequest;
use Modules\RidingCarCompanies\app\Http\Requests\RidingCompanyStageTemplateUpdateRequest;
use Modules\RidingCarCompanies\app\Models\RidingCompany;
use Modules\RidingCarCompanies\app\Services\RidingCompanyStageTemplateService;

class RidingCompanyStageTemplateController extends Controller
{
    public function __construct(
        protected RidingCompanyStageTemplateService $stageTemplateService
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

        $stageTemplates = $this->stageTemplateService->getAllStageTemplates($ridingCompanyId);

        return Inertia::render('RidingCarCompanies/StageTemplates/Index', [
            'ridingCompany' => $ridingCompany,
            'stageTemplates' => $stageTemplates,
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

        return Inertia::render('RidingCarCompanies/StageTemplates/Create', [
            'ridingCompany' => $ridingCompany,
        ]);
    }

    public function store(RidingCompanyStageTemplateStoreRequest $request, int $ridingCompanyId): RedirectResponse
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
            $data['strict_sequence'] = $data['strict_sequence'] ?? false;
            $data['allow_cumulative'] = $data['allow_cumulative'] ?? false;
            $data['target_unit'] = $data['target_unit'] ?? 'rides';

            $this->stageTemplateService->createStageTemplate($data);

            return redirect()
                ->route('ridingcarcompanies.stagetemplates.index', $ridingCompany->id)
                ->with('success', 'Stage template created successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->withInput()
                ->with('error', $e->getMessage());
        }
    }

    public function edit(int $id): Response
    {
        $stageTemplate = $this->stageTemplateService->getStageTemplateById($id);

        if (! $stageTemplate) {
            abort(404, 'Stage template not found.');
        }

        return Inertia::render('RidingCarCompanies/StageTemplates/Edit', [
            'stageTemplate' => $stageTemplate->load('ridingCompany'),
        ]);
    }

    public function update(RidingCompanyStageTemplateUpdateRequest $request, int $id): RedirectResponse
    {
        try {
            $stageTemplate = $this->stageTemplateService->getStageTemplateById($id);
            
            if (! $stageTemplate) {
                abort(404, 'Stage template not found.');
            }

            $this->stageTemplateService->updateStageTemplate($id, $request->validated());

            return redirect()
                ->route('ridingcarcompanies.stagetemplates.index', $stageTemplate->riding_company_id)
                ->with('success', 'Stage template updated successfully.');
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
            $stageTemplate = $this->stageTemplateService->getStageTemplateById($id);
            
            if (! $stageTemplate) {
                abort(404, 'Stage template not found.');
            }

            $ridingCompanyId = $stageTemplate->riding_company_id;
            $this->stageTemplateService->deleteStageTemplate($id);

            return redirect()
                ->route('ridingcarcompanies.stagetemplates.index', $ridingCompanyId)
                ->with('success', 'Stage template deleted successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }

    public function toggleActive(int $id): RedirectResponse
    {
        try {
            $this->stageTemplateService->toggleActive($id);

            return redirect()
                ->back()
                ->with('success', 'Stage template status updated successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }
}

