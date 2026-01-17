<?php

namespace Modules\Drivers\app\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class DriverDocumentUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isSuperAdmin() || $this->user()->can('drivers.driverdocuments.update');
    }

    public function rules(): array
    {
        // Get the route parameter - the route uses 'driverDocument' as parameter name
        $documentNameId = $this->route('driverDocument');

        return [
            'name' => [
                'required',
                'string',
                'max:255',
                function ($attribute, $value, $fail) use ($documentNameId) {
                    $exists = \Modules\Drivers\app\Models\DocumentName::where('name', $value)
                        ->where('id', '!=', $documentNameId)
                        ->exists();
                    if ($exists) {
                        $fail("The document name '{$value}' already exists. Document names must be unique.");
                    }
                },
            ],
            'riding_company_ids' => ['required', 'array', 'min:1'],
            'riding_company_ids.*' => ['required', 'integer', 'exists:riding_companies,id'],
            'type' => ['nullable', 'string', 'in:file,pdf,text'],
            'required' => ['nullable', 'boolean'],
            'notes' => ['nullable', 'string'],
            'status' => ['nullable', 'string', 'in:pending,approved,rejected'],
            'active' => ['nullable', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Document name is required.',
            'name.max' => 'Document name must not exceed 255 characters.',
            'riding_company_ids.required' => 'At least one riding company is required.',
            'riding_company_ids.array' => 'Riding companies must be an array.',
            'riding_company_ids.min' => 'At least one riding company must be selected.',
            'riding_company_ids.*.exists' => 'One or more selected riding companies do not exist.',
            'type.in' => 'Document type must be one of: file, pdf, text.',
            'status.in' => 'Status must be one of: pending, approved, rejected.',
        ];
    }
}
