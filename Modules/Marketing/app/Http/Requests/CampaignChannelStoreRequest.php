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
        
        return [
            'campaign_type_id' => ['required', 'integer', 'exists:campaign_types,id'],
            'name' => ['required', 'string', 'max:255'],
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
            'slug.required' => 'Slug is required.',
        ];
    }
}

