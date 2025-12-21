<?php

namespace Modules\Core\app\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RoleUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user?->isSuperAdmin() || $user?->isCompanyAdmin() || $user?->can('core.roles.update');
    }

    public function rules(): array
    {
        $companyId = $this->route('company');
        $roleId = $this->route('role');
        $role = $roleId ? \Modules\Core\app\Models\Role::find($roleId) : null;
        $companyId = $companyId ?? $role?->team_id;

        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'guard_name' => ['nullable', 'string', 'max:255'],
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
            'parent_id.exists' => 'Selected parent role does not exist.',
            'permissions.*.exists' => 'One or more selected permissions do not exist.',
        ];
    }
}

