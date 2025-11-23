<?php

namespace Modules\Marketing\app\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Marketing\app\Http\Requests\CampaignStoreRequest;
use Modules\Marketing\app\Http\Requests\CampaignUpdateRequest;
use Modules\Marketing\app\Services\CampaignService;
use Modules\Marketing\app\Models\CampaignType;
use Modules\Marketing\app\Models\CampaignStatus;
use Modules\Core\app\Models\Company;
use Modules\Marketing\app\Models\CampaignChannel;

class CampaignController extends Controller
{
    public function __construct(
        protected CampaignService $campaignService
    ) {}

    public function index(): Response
    {
        $user = Auth::user();
        $companyId = $user->isSuperAdmin() ? null : $user->company_id;
        
        $campaigns = $this->campaignService->getAllCampaigns($companyId);
        
        return Inertia::render('Marketing/Campaigns/Index', [
            'campaigns' => $campaigns->map(fn($campaign) => [
                'id' => $campaign->id,
                'name' => $campaign->name,
                'slug' => $campaign->slug,
                'description' => $campaign->description,
                'company_id' => $campaign->company_id,
                'campaign_type_id' => $campaign->campaign_type_id,
                'campaign_status_id' => $campaign->campaign_status_id,
                'campaign_channel_id' => $campaign->campaign_channel_id,
                'start_date' => $campaign->start_date,
                'end_date' => $campaign->end_date,
                'expected_budget' => $campaign->expected_budget,
                'expected_roi' => $campaign->expected_roi,
                'expected_leads' => $campaign->expected_leads,
                'expected_conversions' => $campaign->expected_conversions,
                'expected_revenue' => $campaign->expected_revenue,
                'type' => $campaign->type,
                'status' => $campaign->status,
                'channel' => $campaign->channel,
                'created_at' => $campaign->created_at,
                'updated_at' => $campaign->updated_at,
            ]),
        ]);
    }

    public function create(): Response
    {
        $user = Auth::user();
        // For super admin, show companies dropdown and load types/statuses dynamically
        // For regular users, auto-select their company
        $companies = null;
        $campaignTypes = collect();
        $campaignStatuses = collect();
        
        if ($user->isSuperAdmin()) {
            // Super admin - load all companies
            $companies = Company::active()->get();
        } else {
            // Regular user - use their company
            $companyId = $user->company_id;
            
            if ($companyId) {
                $campaignTypes = campaignType::forCompany($companyId)
                    ->active()
                    ->orderBy('sort_order')
                    ->get();
                    
                $campaignStatuses = CampaignStatus::forCompany($companyId)
                    ->active()
                    ->orderBy('sort_order')
                    ->get();
            }
        }

        return Inertia::render('Marketing/Campaigns/Create', [
            'companies' => $companies,
            'company' => $user->company,
            'campaignTypes' => $campaignTypes,
            'campaignStatuses' => $campaignStatuses,
        ]);
    }

    public function store(CampaignStoreRequest $request): RedirectResponse
    {
        try {
            $data = $request->validated();
            
            // If not super admin, force their company_id
            if (! Auth::user()->isSuperAdmin()) {
                $data['company_id'] = Auth::user()->company_id;
            }
            
            // Set created_by to current user
            $data['created_by'] = Auth::id();
            
            $this->campaignService->createCampaign($data);

            return redirect()
                ->route('marketing.campaigns.index')
                ->with('success', 'Campaign created successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->withInput()
                ->with('error', $e->getMessage());
        }
    }

    public function show(int $id): Response
    {
        $campaign = $this->campaignService->getCampaignById($id);

        if (! $campaign) {
            abort(404, 'Campaign not found.');
        }

        // Load activity logs
        $activities = \Spatie\Activitylog\Models\Activity::forSubject($campaign)
            ->with('causer:id,name,email')
            ->latest()
            ->get()
            ->map(function ($activity) {
                return [
                    'id' => $activity->id,
                    'description' => $activity->description,
                    'event' => $activity->event,
                    'properties' => $activity->properties,
                    'causer' => $activity->causer ? [
                        'id' => $activity->causer->id,
                        'name' => $activity->causer->name,
                        'email' => $activity->causer->email,
                    ] : null,
                    'created_at' => $activity->created_at->toISOString(),
                ];
            });

        return Inertia::render('Marketing/Campaigns/Show', [
            'campaign' => [
                'id' => $campaign->id,
                'name' => $campaign->name,
                'slug' => $campaign->slug,
                'description' => $campaign->description,
                'company_id' => $campaign->company_id,
                'campaign_type_id' => $campaign->campaign_type_id,
                'campaign_status_id' => $campaign->campaign_status_id,
                'campaign_channel_id' => $campaign->campaign_channel_id,
                'start_date' => $campaign->start_date,
                'end_date' => $campaign->end_date,
                'expected_budget' => $campaign->expected_budget,
                'expected_roi' => $campaign->expected_roi,
                'expected_leads' => $campaign->expected_leads,
                'expected_conversions' => $campaign->expected_conversions,
                'expected_conversion_rate' => $campaign->expected_conversion_rate,
                'expected_reach' => $campaign->expected_reach,
                'expected_impressions' => $campaign->expected_impressions,
                'expected_clicks' => $campaign->expected_clicks,
                'expected_ctr' => $campaign->expected_ctr,
                'expected_revenue' => $campaign->expected_revenue,
                'actual_spend' => $campaign->actual_spend,
                'actual_roi' => $campaign->actual_roi,
                'actual_leads' => $campaign->actual_leads,
                'actual_conversions' => $campaign->actual_conversions,
                'type' => $campaign->type,
                'status' => $campaign->status,
                'channel' => $campaign->channel,
                'company' => $campaign->company,
                'created_at' => $campaign->created_at,
                'updated_at' => $campaign->updated_at,
            ],
            'activities' => $activities,
        ]);
    }

    public function edit(int $id): Response
    {
        $campaign = $this->campaignService->getCampaignById($id);

        if (! $campaign) {
            abort(404, 'Campaign not found.');
        }

        $companyId = $campaign->company_id;
        
        $campaignTypes = CampaignType::forCompany($companyId)
            ->active()
            ->orderBy('sort_order')
            ->get();
            
        $campaignStatuses = CampaignStatus::forCompany($companyId)
            ->active()
            ->orderBy('sort_order')
            ->get();
            
        $campaignChannels = CampaignChannel::forCompany($companyId)
            ->active()
            ->orderBy('sort_order')
            ->get();

        return Inertia::render('Marketing/Campaigns/Edit', [
            'campaign' => [
                'id' => $campaign->id,
                'name' => $campaign->name,
                'slug' => $campaign->slug,
                'description' => $campaign->description,
                'company_id' => $campaign->company_id,
                'campaign_type_id' => $campaign->campaign_type_id,
                'campaign_status_id' => $campaign->campaign_status_id,
                'campaign_channel_id' => $campaign->campaign_channel_id,
                'start_date' => $campaign->start_date?->format('Y-m-d'),
                'end_date' => $campaign->end_date?->format('Y-m-d'),
                'expected_budget' => $campaign->expected_budget,
                'expected_roi' => $campaign->expected_roi,
                'expected_leads' => $campaign->expected_leads,
                'expected_conversions' => $campaign->expected_conversions,
                'expected_conversion_rate' => $campaign->expected_conversion_rate,
                'expected_reach' => $campaign->expected_reach,
                'expected_impressions' => $campaign->expected_impressions,
                'expected_clicks' => $campaign->expected_clicks,
                'expected_ctr' => $campaign->expected_ctr,
                'expected_revenue' => $campaign->expected_revenue,
                'actual_spend' => $campaign->actual_spend,
                'actual_roi' => $campaign->actual_roi,
                'actual_leads' => $campaign->actual_leads,
                'actual_conversions' => $campaign->actual_conversions,
                'actual_conversion_rate' => $campaign->actual_conversion_rate,
                'actual_reach' => $campaign->actual_reach,
                'actual_impressions' => $campaign->actual_impressions,
                'actual_clicks' => $campaign->actual_clicks,
                'actual_ctr' => $campaign->actual_ctr,
                'actual_revenue' => $campaign->actual_revenue,
                'type' => $campaign->type,
                'status' => $campaign->status,
                'channel' => $campaign->channel,
            ],
            'campaignTypes' => $campaignTypes,
            'campaignStatuses' => $campaignStatuses,
            'campaignChannels' => $campaignChannels,
        ]);
    }

    public function update(CampaignUpdateRequest $request, int $id): RedirectResponse
    {
        try {
            $data = $request->validated();
            $this->campaignService->updateCampaign($id, $data);

            return redirect()
                ->route('marketing.campaigns.show', $id)
                ->with('success', 'Campaign updated successfully.');
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
            $this->campaignService->deleteCampaign($id);

            return redirect()
                ->route('marketing.campaigns.index')
                ->with('success', 'Campaign deleted successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }

    public function pause(int $id): RedirectResponse
    {
        try {
            $this->campaignService->pauseCampaign($id);

            return redirect()
                ->back()
                ->with('success', 'Campaign paused successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }

    public function activate(int $id): RedirectResponse
    {
        try {
            $this->campaignService->activateCampaign($id);

            return redirect()
                ->back()
                ->with('success', 'Campaign activated successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }
}

