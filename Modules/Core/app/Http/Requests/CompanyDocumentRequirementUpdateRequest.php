<?php

namespace Modules\Core\app\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CompanyDocumentRequirementUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        $requirement = $this->route('companyDocumentRequirement');

        return $user->isSuperAdmin() || ($user->is_company_admin && $requirement && (int) $requirement->company_id === (int) $user->company_id);
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'string', 'in:file,pdf,text'],
            'required' => ['nullable', 'boolean'],
            'instructions' => ['nullable', 'string'],
            'active' => ['nullable', 'boolean'],
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
