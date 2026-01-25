<?php

namespace Modules\Marketing\app\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CampaignTypeUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isSuperAdmin() || $this->user()->isCompanyAdmin();
    }

    public function rules(): array
    {
        $campaignTypeId = $this->route('campaignType');
        $campaignType = \Modules\Marketing\app\Models\CampaignType::find($campaignTypeId);
        
        // Check if riding_company_id column exists
        $hasRidingCompanyId = \Illuminate\Support\Facades\Schema::hasColumn('campaign_types', 'riding_company_id');
        
        $nameRule = ['required', 'string', 'max:255'];
        if ($hasRidingCompanyId && ($this->input('riding_company_id') || $campaignType?->riding_company_id)) {
            $ridingCompanyId = $this->input('riding_company_id') ?? $campaignType?->riding_company_id;
            $nameRule[] = \Illuminate\Validation\Rule::unique('campaign_types', 'name')
                ->where('riding_company_id', $ridingCompanyId)
                ->ignore($campaignTypeId);
        } elseif ($this->input('company_id') || $campaignType?->company_id) {
            $companyId = $this->input('company_id') ?? $campaignType?->company_id;
            $nameRule[] = \Illuminate\Validation\Rule::unique('campaign_types', 'name')
                ->where('company_id', $companyId)
                ->ignore($campaignTypeId);
        }
        
        return [
            'name' => $nameRule,
            'slug' => ['nullable', 'string', 'max:255'], // Auto-generated if empty
            'description' => ['nullable', 'string'],
            'icon' => ['nullable', 'string', 'max:255'],
            'color' => ['nullable', 'string', 'max:50'],
            'is_active' => ['nullable', 'boolean'],
            'sort_order' => ['nullable', 'integer'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Type name is required.',
            'name.unique' => 'This campaign type name is already taken for this company.',
            'slug.required' => 'Slug is required.',
        ];
    }
}

