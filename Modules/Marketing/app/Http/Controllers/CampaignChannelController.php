<?php

namespace Modules\Marketing\app\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Core\app\Models\Company;
use Modules\Marketing\app\Http\Requests\CampaignChannelStoreRequest;
use Modules\Marketing\app\Http\Requests\CampaignChannelUpdateRequest;
use Modules\Marketing\app\Services\CampaignChannelService;
use Modules\Marketing\app\Services\CampaignTypeService;

class CampaignChannelController extends Controller
{
    public function __construct(
        protected CampaignChannelService $campaignChannelService,
        protected CampaignTypeService $campaignTypeService
    ) {}

    public function index(): Response
    {
        $user = auth()->user();
        $companyId = $this->getCompanyId();
        
        $channels = $this->campaignChannelService->getAllCampaignChannels($companyId);

        return Inertia::render('Marketing/CampaignChannels/Index', [
            'campaignChannels' => $channels,
        ]);
    }

    public function recycleBin(): Response
    {
        $user = auth()->user();
        $companyId = $this->getCompanyId();
        
        $query = \Modules\Marketing\app\Models\CampaignChannel::onlyTrashed();

        // Filter by company if applicable
        if ($companyId) {
            $query->where('company_id', $companyId);
        } elseif (!$user->isSuperAdmin()) {
            // Non-super admin without company_id sees nothing
            $query->whereRaw('1 = 0');
        }

        $channels = $query->orderBy('deleted_at', 'desc')->get();

        return Inertia::render('Marketing/CampaignChannels/RecycleBin', [
            'campaignChannels' => $channels->map(fn($channel) => [
                'id' => $channel->id,
                'name' => $channel->name,
                'slug' => $channel->slug,
                'description' => $channel->description,
                'color' => $channel->color,
                'sort_order' => $channel->sort_order,
                'active' => $channel->active,
                'company_id' => $channel->company_id,
                'created_at' => $channel->created_at?->toISOString(),
                'updated_at' => $channel->updated_at?->toISOString(),
                'deleted_at' => $channel->deleted_at?->toISOString(),
            ]),
        ]);
    }

    public function create(): Response
    {
        $user = Auth::user();
        $companies = null;
        $companyId = $this->getCompanyId();
        
        $campaignTypes = $this->campaignTypeService->getActiveCampaignTypes($companyId);

        if ($user->isSuperAdmin()) {
            $companies = Company::active()->get();
        }

        return Inertia::render('Marketing/CampaignChannels/Create', [
            'campaignTypes' => $campaignTypes,
            'companies' => $companies,
            'company' => $user->company,
        ]);
    }

    public function store(CampaignChannelStoreRequest $request): RedirectResponse
    {
        try {
            $data = $request->validated();
            
            // If not super admin, force their company_id
            if (! Auth::user()->isSuperAdmin()) {
                $data['company_id'] = Auth::user()->company_id;
            }
            
            $this->campaignChannelService->createCampaignChannel($data);

            return redirect()
                ->route('marketing.campaign-channels.index')
                ->with('success', 'Campaign channel created successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->withInput()
                ->with('error', $e->getMessage());
        }
    }

    public function edit(int $id): Response
    {
        $channel = $this->campaignChannelService->getCampaignChannelById($id);

        if (! $channel) {
            abort(404, 'Campaign channel not found.');
        }

        $user = Auth::user();
        $companyId = $this->getCompanyId();
        
        $campaignTypes = $this->campaignTypeService->getActiveCampaignTypes($companyId);

        return Inertia::render('Marketing/CampaignChannels/Edit', [
            'campaignChannel' => $channel,
            'campaignTypes' => $campaignTypes,
        ]);
    }

    public function update(CampaignChannelUpdateRequest $request, int $id): RedirectResponse
    {
        try {
            $data = $request->validated();
            $this->campaignChannelService->updateCampaignChannel($id, $data);

            return redirect()
                ->route('marketing.campaign-channels.index')
                ->with('success', 'Campaign channel updated successfully.');
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
            $this->campaignChannelService->deleteCampaignChannel($id);

            return redirect()
                ->route('marketing.campaign-channels.index')
                ->with('success', 'Campaign channel deleted successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
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

