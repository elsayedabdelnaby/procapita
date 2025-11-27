<?php

namespace Modules\Drivers\app\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class DriverStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isSuperAdmin() || $this->user()->can('drivers.drivers.create');
    }

    public function rules(): array
    {
        $user = $this->user();
        $rules = [
            'full_name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:255'],
            'whatsapp_phone' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'riding_company_id' => ['required', 'exists:riding_companies,id'],
            'campaign_id' => ['nullable', 'exists:campaigns,id'],
            'lead_source_id' => ['required', 'exists:lead_sources,id'],
            'assigned_to' => ['required', 'exists:users,id'],
            'lead_status_id' => ['required', 'exists:lead_statuses,id'],
            'lead_stage_id' => ['nullable', 'exists:lead_stages,id'],
            'current_stage_id' => ['nullable', 'exists:riding_company_stage_templates,id'],
            'notes' => ['nullable', 'string'],
        ];

        if ($user->isSuperAdmin()) {
            $rules['company_id'] = ['required', 'exists:companies,id'];
        }

        return $rules;
    }

    public function messages(): array
    {
        return [
            'full_name.required' => 'Full name is required.',
            'phone.required' => 'Phone number is required.',
            'email.email' => 'Please provide a valid email address.',
            'riding_company_id.required' => 'Riding company is required.',
            'lead_source_id.required' => 'Lead source is required.',
            'assigned_to.required' => 'Assigned to is required.',
            'lead_status_id.required' => 'Lead status is required.',
        ];
    }
}

