<?php

namespace Modules\Marketing\app\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CampaignChannelStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isSuperAdmin() || $this->user()->isCompanyAdmin();
    }

    public function rules(): array
    {
        $user = $this->user();
        
        // Check if riding_company_id column exists
        $hasRidingCompanyId = \Illuminate\Support\Facades\Schema::hasColumn('campaign_channels', 'riding_company_id');
        
        $nameRule = ['required', 'string', 'max:255'];
        if ($hasRidingCompanyId && $this->input('riding_company_id')) {
            $nameRule[] = \Illuminate\Validation\Rule::unique('campaign_channels', 'name')
                ->where('riding_company_id', $this->input('riding_company_id'))
                ->where('campaign_type_id', $this->input('campaign_type_id'));
        } elseif ($this->input('company_id')) {
            $nameRule[] = \Illuminate\Validation\Rule::unique('campaign_channels', 'name')
                ->where('company_id', $this->input('company_id'))
                ->where('campaign_type_id', $this->input('campaign_type_id'));
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
            'company_id' => $user->isSuperAdmin() 
                ? ['required', 'integer', 'exists:companies,id'] 
                : ['nullable'],
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

