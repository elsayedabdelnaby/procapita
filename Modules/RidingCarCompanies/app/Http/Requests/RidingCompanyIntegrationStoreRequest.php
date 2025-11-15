<?php

namespace Modules\RidingCarCompanies\app\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RidingCompanyIntegrationStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isSuperAdmin() || $this->user()->can('ridingcarcompanies.integrations.create');
    }

    public function rules(): array
    {
        return [
            'riding_company_id' => ['required', 'integer', 'exists:riding_companies,id'],
            'type' => ['required', 'string', 'in:webhook,api,csv'],
            'config' => ['required', 'array'],
            'active' => ['nullable', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'riding_company_id.required' => 'Riding company is required.',
            'type.required' => 'Integration type is required.',
            'type.in' => 'Integration type must be webhook, api, or csv.',
            'config.required' => 'Configuration is required.',
        ];
    }
}

