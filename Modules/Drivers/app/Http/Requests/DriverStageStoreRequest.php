<?php

namespace Modules\Drivers\app\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class DriverStageStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isSuperAdmin() || $this->user()->can('drivers.driverstages.create');
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255', \Illuminate\Validation\Rule::unique('driver_stages', 'name')],
            'riding_company_ids' => ['required', 'array', 'min:1'],
            'riding_company_ids.*' => ['required', 'exists:riding_companies,id'],
            'stage_order' => ['required', 'integer', 'min:1'],
            'status' => ['nullable', 'string', 'in:pending,in_progress,completed,rejected'],
            'notes' => ['nullable', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Driver stage name is required.',
            'name.unique' => 'This driver stage name is already taken.',
            'riding_company_ids.required' => 'At least one riding company is required.',
            'riding_company_ids.min' => 'At least one riding company is required.',
            'stage_order.required' => 'Stage order is required.',
        ];
    }
}
