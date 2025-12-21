<?php

namespace Modules\Core\app\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RoleStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user?->isSuperAdmin() || $user?->isCompanyAdmin() || $user?->can('core.roles.create');
    }

    public function rules(): array
    {
        $companyId = $this->route('company') ?? $this->input('team_id');

        return [
            'name' => ['required', 'string', 'max:255'],
            'guard_name' => ['nullable', 'string', 'max:255'],
            'team_id' => ['required', 'integer', 'exists:companies,id'],
            'parent_id' => ['nullable', 'integer', 'exists:roles,id'],
            'module_name' => ['nullable', 'string', 'max:255'],
            'entity_name' => ['nullable', 'string', 'max:255'],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['integer', 'exists:permissions,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Role name is required.',
            'team_id.required' => 'Company is required.',
            'team_id.exists' => 'Selected company does not exist.',
            'parent_id.exists' => 'Selected parent role does not exist.',
            'permissions.*.exists' => 'One or more selected permissions do not exist.',
        ];
    }
}

