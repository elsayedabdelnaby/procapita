<?php

namespace Modules\Marketing\app\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CampaignStatusUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isSuperAdmin() || $this->user()->isCompanyAdmin();
    }

    public function rules(): array
    {
        $campaignStatusId = $this->route('campaignStatus');
        $campaignStatus = \Modules\Marketing\app\Models\CampaignStatus::find($campaignStatusId);
        
        // Check if riding_company_id column exists
        $hasRidingCompanyId = \Illuminate\Support\Facades\Schema::hasColumn('campaign_statuses', 'riding_company_id');
        
        $nameRule = ['required', 'string', 'max:255'];
        if ($hasRidingCompanyId && ($this->input('riding_company_id') || $campaignStatus?->riding_company_id)) {
            $ridingCompanyId = $this->input('riding_company_id') ?? $campaignStatus?->riding_company_id;
            $nameRule[] = \Illuminate\Validation\Rule::unique('campaign_statuses', 'name')
                ->where('riding_company_id', $ridingCompanyId)
                ->ignore($campaignStatusId);
        } elseif ($this->input('company_id') || $campaignStatus?->company_id) {
            $companyId = $this->input('company_id') ?? $campaignStatus?->company_id;
            $nameRule[] = \Illuminate\Validation\Rule::unique('campaign_statuses', 'name')
                ->where('company_id', $companyId)
                ->ignore($campaignStatusId);
        }
        
        return [
            'name' => $nameRule,
            'slug' => ['nullable', 'string', 'max:255'], // Auto-generated if empty
            'description' => ['nullable', 'string'],
            'color' => ['nullable', 'string', 'max:50'],
            'is_active' => ['nullable', 'boolean'],
            'is_final' => ['nullable', 'boolean'],
            'sort_order' => ['nullable', 'integer'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Status name is required.',
            'name.unique' => 'This campaign status name is already taken for this company.',
            'slug.required' => 'Slug is required.',
        ];
    }
}

