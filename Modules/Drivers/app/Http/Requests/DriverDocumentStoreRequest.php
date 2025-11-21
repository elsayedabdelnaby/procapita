<?php

namespace Modules\Drivers\app\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class DriverDocumentStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isSuperAdmin() || $this->user()->can('drivers.driverdocuments.create');
    }

    public function rules(): array
    {
        return [
            'driver_id' => ['required', 'exists:drivers,id'],
            'document_template_id' => ['required', 'exists:riding_company_document_requirements,id'],
            'status' => ['nullable', 'string', 'in:pending,approved,rejected'],
            'notes' => ['nullable', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'driver_id.required' => 'Driver is required.',
            'document_template_id.required' => 'Document template is required.',
        ];
    }
}

