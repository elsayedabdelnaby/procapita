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
            'company_ids' => ['required', 'array', 'min:1'],
            'company_ids.*' => ['required', 'integer', 'exists:companies,id'],
            'riding_company_ids' => ['sometimes', 'array'],
            'riding_company_ids.*' => ['integer'],
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
            'company_ids.required' => 'At least one reseller is required.',
            'company_ids.array' => 'Resellers must be an array.',
            'company_ids.min' => 'At least one reseller must be selected.',
            'company_ids.*.exists' => 'One or more selected resellers do not exist.',
            'type.in' => 'Document type must be one of: file, pdf, text.',
            'status.in' => 'Status must be one of: pending, approved, rejected.',
        ];
    }
}
