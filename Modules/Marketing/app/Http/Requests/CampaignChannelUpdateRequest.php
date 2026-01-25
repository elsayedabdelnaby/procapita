<?php

namespace Modules\Marketing\app\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CampaignChannelUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isSuperAdmin() || $this->user()->isCompanyAdmin();
    }

    public function rules(): array
    {
        $campaignChannelId = $this->route('campaignChannel');
        $campaignChannel = \Modules\Marketing\app\Models\CampaignChannel::find($campaignChannelId);
        
        // Check if riding_company_id column exists
        $hasRidingCompanyId = \Illuminate\Support\Facades\Schema::hasColumn('campaign_channels', 'riding_company_id');
        
        $nameRule = ['required', 'string', 'max:255'];
        $campaignTypeId = $this->input('campaign_type_id') ?? $campaignChannel?->campaign_type_id;
        
        if ($hasRidingCompanyId && ($this->input('riding_company_id') || $campaignChannel?->riding_company_id)) {
            $ridingCompanyId = $this->input('riding_company_id') ?? $campaignChannel?->riding_company_id;
            $nameRule[] = \Illuminate\Validation\Rule::unique('campaign_channels', 'name')
                ->where('riding_company_id', $ridingCompanyId)
                ->where('campaign_type_id', $campaignTypeId)
                ->ignore($campaignChannelId);
        } elseif ($this->input('company_id') || $campaignChannel?->company_id) {
            $companyId = $this->input('company_id') ?? $campaignChannel?->company_id;
            $nameRule[] = \Illuminate\Validation\Rule::unique('campaign_channels', 'name')
                ->where('company_id', $companyId)
                ->where('campaign_type_id', $campaignTypeId)
                ->ignore($campaignChannelId);
        }
        
        return [
            'campaign_type_id' => ['required', 'integer', 'exists:campaign_types,id'],
            'name' => $nameRule,
            'slug' => ['nullable', 'string', 'max:255'], // Auto-generated if empty
            'description' => ['nullable', 'string'],
            'icon' => ['nullable', 'string', 'max:255'],
            'settings' => ['nullable', 'array'],
            'is_active' => ['nullable', 'boolean'],
            'sort_order' => ['nullable', 'integer'],
        ];
    }

    public function messages(): array
    {
        return [
            'campaign_type_id.required' => 'Campaign type is required.',
            'campaign_type_id.exists' => 'Selected campaign type does not exist.',
            'name.required' => 'Channel name is required.',
            'name.unique' => 'This campaign channel name is already taken for this campaign type.',
            'slug.required' => 'Slug is required.',
        ];
    }
}

