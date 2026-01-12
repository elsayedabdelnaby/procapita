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
            'driver_id' => ['required', 'exists:drivers,id'],
            'riding_company_id' => ['required', 'exists:riding_companies,id'],
            'stage_order' => ['required', 'integer', 'min:1'],
            'status' => ['nullable', 'string', 'in:pending,in_progress,completed,rejected'],
            'notes' => ['nullable', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'driver_id.required' => 'Driver is required.',
            'riding_company_id.required' => 'Riding company is required.',
            'stage_order.required' => 'Stage order is required.',
        ];
    }
}
