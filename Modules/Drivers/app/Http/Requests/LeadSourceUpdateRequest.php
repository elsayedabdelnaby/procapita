<?php

namespace Modules\Drivers\app\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class LeadSourceUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isSuperAdmin() || $this->user()->can('drivers.leadsources.update');
    }

    public function rules(): array
    {
        $leadSourceId = $this->route('leadSource');
        
        return [
            'name' => ['required', 'string', 'max:255', \Illuminate\Validation\Rule::unique('lead_sources', 'name')->whereNull('deleted_at')->ignore($leadSourceId)],
            'slug' => ['nullable', 'string', 'max:255', \Illuminate\Validation\Rule::unique('lead_sources', 'slug')->whereNull('deleted_at')->ignore($leadSourceId)],
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

