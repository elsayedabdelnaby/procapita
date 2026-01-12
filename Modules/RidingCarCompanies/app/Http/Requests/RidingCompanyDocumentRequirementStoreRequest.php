<?php

namespace Modules\RidingCarCompanies\app\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RidingCompanyDocumentRequirementStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isSuperAdmin() || $this->user()->can('ridingcarcompanies.documentrequirements.create');
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'string', 'in:file,pdf,text'],
            'required' => ['nullable', 'boolean'],
            'instructions' => ['nullable', 'string'],
            'active' => ['nullable', 'boolean'],
            'add_to_existing_drivers' => ['nullable', 'boolean'],
            'riding_company_ids' => ['nullable', 'array', 'min:1'],
            'riding_company_ids.*' => ['required', 'integer', 'exists:riding_companies,id'],
            'default_status' => ['nullable', 'string', 'in:pending,approved,rejected'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Requirement name is required.',
            'type.required' => 'Document type is required.',
            'type.in' => 'Document type must be file, pdf, or text.',
        ];
    }
}
