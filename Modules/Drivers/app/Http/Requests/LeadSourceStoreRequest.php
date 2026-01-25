<?php

namespace Modules\Drivers\app\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class LeadSourceStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isSuperAdmin() || $this->user()->can('drivers.leadsources.create');
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255', \Illuminate\Validation\Rule::unique('lead_sources', 'name')->whereNull('deleted_at')],
            'slug' => ['nullable', 'string', 'max:255', \Illuminate\Validation\Rule::unique('lead_sources', 'slug')->whereNull('deleted_at')],
            'description' => ['nullable', 'string'],
            'active' => ['nullable', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Lead source name is required.',
        ];
    }
}

