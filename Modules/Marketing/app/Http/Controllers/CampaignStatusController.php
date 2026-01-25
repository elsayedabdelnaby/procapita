<?php

namespace Modules\Marketing\app\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Core\app\Models\Company;
use Modules\Marketing\app\Http\Requests\CampaignStatusStoreRequest;
use Modules\Marketing\app\Http\Requests\CampaignStatusUpdateRequest;
use Modules\Marketing\app\Services\CampaignStatusService;

class CampaignStatusController extends Controller
{
    public function __construct(
        protected CampaignStatusService $campaignStatusService
    ) {}

    public function index(): Response
    {
        $user = auth()->user();
        $companyId = $this->getCompanyId();
        
        $statuses = $this->campaignStatusService->getAllCampaignStatuses($companyId);

        return Inertia::render('Marketing/CampaignStatuses/Index', [
            'campaignStatuses' => $statuses,
        ]);
    }

    public function recycleBin(): Response
    {
        $user = auth()->user();
        $companyId = $this->getCompanyId();
        
        $query = \Modules\Marketing\app\Models\CampaignStatus::onlyTrashed();

        // Filter by company if applicable
        if ($companyId) {
            $query->where('company_id', $companyId);
        } elseif (!$user->isSuperAdmin()) {
            // Non-super admin without company_id sees nothing
            $query->whereRaw('1 = 0');
        }

        $statuses = $query->orderBy('deleted_at', 'desc')->get();

        return Inertia::render('Marketing/CampaignStatuses/RecycleBin', [
            'campaignStatuses' => $statuses->map(fn($status) => [
                'id' => $status->id,
                'name' => $status->name,
                'slug' => $status->slug,
                'description' => $status->description,
                'color' => $status->color,
                'sort_order' => $status->sort_order,
                'active' => $status->active,
                'company_id' => $status->company_id,
                'created_at' => $status->created_at?->toISOString(),
                'updated_at' => $status->updated_at?->toISOString(),
                'deleted_at' => $status->deleted_at?->toISOString(),
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

        return Inertia::render('Marketing/CampaignStatuses/Create', [
            'companies' => $companies,
            'company' => $user->company,
        ]);
    }

    public function store(CampaignStatusStoreRequest $request): RedirectResponse
    {
        try {
            $data = $request->validated();
            
            // If not super admin, force their company_id
            if (! Auth::user()->isSuperAdmin()) {
                $data['company_id'] = Auth::user()->company_id;
            }
            
            $this->campaignStatusService->createCampaignStatus($data);

            return redirect()
                ->route('marketing.campaign-statuses.index')
                ->with('success', 'Campaign status created successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->withInput()
                ->with('error', $e->getMessage());
        }
    }

    public function edit(int $id): Response
    {
        $status = $this->campaignStatusService->getCampaignStatusById($id);

        if (! $status) {
            abort(404, 'Campaign status not found.');
        }

        return Inertia::render('Marketing/CampaignStatuses/Edit', [
            'campaignStatus' => $status,
        ]);
    }

    public function update(CampaignStatusUpdateRequest $request, int $id): RedirectResponse
    {
        try {
            $data = $request->validated();
            $this->campaignStatusService->updateCampaignStatus($id, $data);

            return redirect()
                ->route('marketing.campaign-statuses.index')
                ->with('success', 'Campaign status updated successfully.');
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
            $this->campaignStatusService->deleteCampaignStatus($id);

            return redirect()
                ->route('marketing.campaign-statuses.index')
                ->with('success', 'Campaign status deleted successfully.');
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

