<?php

namespace Modules\RidingCarCompanies\app\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RidingCompanyIntegrationUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isSuperAdmin() || $this->user()->can('ridingcarcompanies.integrations.update');
    }

    public function rules(): array
    {
        return [
            'type' => ['required', 'string', 'in:webhook,api,csv'],
            'config' => ['required', 'array'],
            'active' => ['nullable', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'type.required' => 'Integration type is required.',
            'type.in' => 'Integration type must be webhook, api, or csv.',
            'config.required' => 'Configuration is required.',
        ];
    }
}

