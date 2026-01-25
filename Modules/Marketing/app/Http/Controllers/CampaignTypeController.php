<?php

namespace Modules\Marketing\app\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Core\app\Models\Company;
use Modules\Marketing\app\Http\Requests\CampaignTypeStoreRequest;
use Modules\Marketing\app\Http\Requests\CampaignTypeUpdateRequest;
use Modules\Marketing\app\Services\CampaignTypeService;

class CampaignTypeController extends Controller
{
    public function __construct(
        protected CampaignTypeService $campaignTypeService
    ) {}

    public function index(): Response
    {
        $user = auth()->user();
        $companyId = $this->getCompanyId();
        
        $types = $this->campaignTypeService->getAllCampaignTypes($companyId);

        return Inertia::render('Marketing/CampaignTypes/Index', [
            'campaignTypes' => $types,
        ]);
    }

    public function recycleBin(): Response
    {
        $user = auth()->user();
        $companyId = $this->getCompanyId();
        
        $query = \Modules\Marketing\app\Models\CampaignType::onlyTrashed();

        // Filter by company if applicable
        if ($companyId) {
            $query->where('company_id', $companyId);
        } elseif (!$user->isSuperAdmin()) {
            // Non-super admin without company_id sees nothing
            $query->whereRaw('1 = 0');
        }

        $types = $query->orderBy('deleted_at', 'desc')->get();

        return Inertia::render('Marketing/CampaignTypes/RecycleBin', [
            'campaignTypes' => $types->map(fn($type) => [
                'id' => $type->id,
                'name' => $type->name,
                'slug' => $type->slug,
                'description' => $type->description,
                'color' => $type->color,
                'sort_order' => $type->sort_order,
                'active' => $type->active,
                'company_id' => $type->company_id,
                'created_at' => $type->created_at?->toISOString(),
                'updated_at' => $type->updated_at?->toISOString(),
                'deleted_at' => $type->deleted_at?->toISOString(),
            ]),
        ]);
    }

    public function create(): Response
    {
        $user = Auth::user();
        $companies = null;
        
        if ($user->isSuperAdmin()) {
            $companies = Company::active()->get();
        }

        return Inertia::render('Marketing/CampaignTypes/Create', [
            'companies' => $companies,
            'company' => $user->company,
        ]);
    }

    public function store(CampaignTypeStoreRequest $request): RedirectResponse
    {
        try {
            $data = $request->validated();
            
            // If not super admin, force their company_id
            if (! Auth::user()->isSuperAdmin()) {
                $data['company_id'] = Auth::user()->company_id;
            }
            
            $this->campaignTypeService->createCampaignType($data);

            return redirect()
                ->route('marketing.campaign-types.index')
                ->with('success', 'Campaign type created successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->withInput()
                ->with('error', $e->getMessage());
        }
    }

    public function edit(int $id): Response
    {
        $type = $this->campaignTypeService->getCampaignTypeById($id);

        if (! $type) {
            abort(404, 'Campaign type not found.');
        }

        return Inertia::render('Marketing/CampaignTypes/Edit', [
            'campaignType' => $type,
        ]);
    }

    public function update(CampaignTypeUpdateRequest $request, int $id): RedirectResponse
    {
        try {
            $data = $request->validated();
            $this->campaignTypeService->updateCampaignType($id, $data);

            return redirect()
                ->route('marketing.campaign-types.index')
                ->with('success', 'Campaign type updated successfully.');
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
            $this->campaignTypeService->deleteCampaignType($id);

            return redirect()
                ->route('marketing.campaign-types.index')
                ->with('success', 'Campaign type deleted successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }

    protected function getCompanyId(): ?int
    {
        $user = auth()->user();
        if ($user && $user->is_super_admin) {
            return null; // Super admin can see all
        }
        return $user?->company_id;
    }
}

