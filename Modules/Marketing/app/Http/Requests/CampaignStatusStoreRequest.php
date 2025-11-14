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
        
        return [
            'name' => ['required', 'string', 'max:255'],
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
            'slug.required' => 'Slug is required.',
        ];
    }
}

