<?php

namespace Modules\Marketing\app\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CampaignStatusStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isSuperAdmin() || $this->user()->isCompanyAdmin();
    }

    public function rules(): array
    {
        $user = $this->user();
        $companyId = $user->isSuperAdmin() 
            ? $this->input('company_id')
            : $user->company_id;
        
        // Check if riding_company_id column exists
        $hasRidingCompanyId = \Illuminate\Support\Facades\Schema::hasColumn('campaign_statuses', 'riding_company_id');
        
        $nameRule = ['required', 'string', 'max:255'];
        if ($hasRidingCompanyId && $this->input('riding_company_id')) {
            $nameRule[] = \Illuminate\Validation\Rule::unique('campaign_statuses', 'name')
                ->where('riding_company_id', $this->input('riding_company_id'));
        } elseif ($companyId) {
            $nameRule[] = \Illuminate\Validation\Rule::unique('campaign_statuses', 'name')
                ->where('company_id', $companyId);
        }
        
        return [
            'name' => $nameRule,
            'slug' => ['nullable', 'string', 'max:255'], // Auto-generated if empty
            'description' => ['nullable', 'string'],
            'color' => ['nullable', 'string', 'max:50'],
            'is_active' => ['nullable', 'boolean'],
            'is_final' => ['nullable', 'boolean'],
            'sort_order' => ['nullable', 'integer'],
            'company_id' => $user->isSuperAdmin() 
                ? ['required', 'integer', 'exists:companies,id'] 
                : ['nullable'],
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

