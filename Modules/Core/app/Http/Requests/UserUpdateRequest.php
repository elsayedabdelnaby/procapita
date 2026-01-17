<?php

namespace Modules\Core\app\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UserUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user?->isSuperAdmin() || $user?->isCompanyAdmin() || $user?->can('core.users.update');
    }

    public function rules(): array
    {
        $userId = $this->route('user');
        $companyId = $this->route('company') ?? $this->input('company_id');

        $companyId = $this->route('company') ?? $this->input('company_id') ?? ($userModel = \App\Models\User::find($userId))?->company_id;

        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => ['sometimes', 'required', 'email', 'max:255', "unique:users,email,{$userId}"],
            'mobile1' => ['sometimes', 'required', 'string', 'max:255'],
            'mobile2' => ['nullable', 'string', 'max:255'],
            'password' => ['nullable', 'string', 'min:8'],
            'company_id' => ['nullable', 'integer', 'exists:companies,id'],
            'riding_company_id' => [
                'nullable',
                'integer',
                'exists:riding_companies,id',
                function ($attribute, $value, $fail) use ($companyId) {
                    if ($value && $companyId) {
                        $ridingCompany = \Modules\RidingCarCompanies\app\Models\RidingCompany::find($value);
                        if ($ridingCompany && $ridingCompany->company_id != $companyId) {
                            $fail('The selected riding company does not belong to this company.');
                        }
                    }
                },
            ],
            'team_leader_id' => [
                'nullable',
                'integer',
                'exists:users,id',
                function ($attribute, $value, $fail) use ($userId) {
                    if ($value) {
                        // Prevent user from selecting themselves as team leader
                        if ($value == $userId) {
                            $fail('A user cannot be their own team leader.');
                        }
                        $teamLeader = \App\Models\User::find($value);
                        $ridingCompanyId = $this->input('riding_company_id');
                        if ($teamLeader && $ridingCompanyId && $teamLeader->riding_company_id != $ridingCompanyId) {
                            $fail('The selected team leader must belong to the same riding company.');
                        }
                    }
                },
            ],
            'account_manager_id' => [
                'nullable',
                'integer',
                'exists:users,id',
                function ($attribute, $value, $fail) use ($userId) {
                    if ($value) {
                        // Prevent user from selecting themselves as account manager
                        if ($value == $userId) {
                            $fail('A user cannot be their own account manager.');
                        }
                        $accountManager = \App\Models\User::find($value);
                        if ($accountManager && $accountManager->riding_company_id) {
                            $fail('The selected account manager must not have a riding company assigned.');
                        }
                    }
                },
            ],
            'is_company_admin' => ['nullable', 'boolean'],
            'is_active' => ['nullable', 'boolean'],
            'role_id' => [
                'nullable',
                'integer',
                'exists:roles,id',
                function ($attribute, $value, $fail) use ($companyId) {
                    if ($value) {
                        $role = \Modules\Core\app\Models\Role::find($value);
                        if ($role && $companyId && $role->team_id != $companyId) {
                            $fail('The selected role does not belong to this company.');
                        }
                    }
                },
            ],
            // Keep 'roles' for backward compatibility but validate it's empty or single item
            'roles' => ['nullable', 'array', 'max:1'],
            'roles.*' => [
                'integer',
                'exists:roles,id',
                function ($attribute, $value, $fail) use ($companyId) {
                    $role = \Modules\Core\app\Models\Role::find($value);
                    if ($role && $companyId && $role->team_id != $companyId) {
                        $fail('The selected role does not belong to this company.');
                    }
                },
            ],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['integer', 'exists:permissions,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'User name is required.',
            'email.required' => 'Email address is required.',
            'email.unique' => 'This email is already registered.',
            'mobile1.required' => 'Mobile 1 is required.',
            'password.min' => 'Password must be at least 8 characters.',
            'company_id.exists' => 'Selected company does not exist.',
            'role_id.exists' => 'The selected role does not exist.',
            'roles.max' => 'A user can only have one role.',
            'roles.*.exists' => 'One or more selected roles do not exist.',
            'permissions.*.exists' => 'One or more selected permissions do not exist.',
        ];
    }
}
