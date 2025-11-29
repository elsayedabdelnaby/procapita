<?php

namespace Modules\Drivers\app\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class LeadStageStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isSuperAdmin() || $this->user()->can('drivers.leadstages.create');
    }

    public function rules(): array
    {
        $user = $this->user();
        $rules = [
            'riding_company_id' => ['required', 'exists:riding_companies,id'],
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'color' => ['nullable', 'string', 'max:50'],
            'order' => ['nullable', 'integer', 'min:0'],
            'active' => ['nullable', 'boolean'],
            'requires_all_documents_approved' => ['nullable', 'boolean'],
            'commission_value' => ['nullable', 'numeric', 'min:0'],
        ];

        if ($user->isSuperAdmin()) {
            $rules['riding_company_id'] = ['required', 'exists:riding_companies,id'];
        }

        return $rules;
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Lead stage name is required.',
            'riding_company_id.required' => 'Riding company is required.',
        ];
    }
}

