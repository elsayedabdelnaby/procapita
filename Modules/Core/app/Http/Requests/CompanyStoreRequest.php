<?php

namespace Modules\Core\app\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CompanyStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isSuperAdmin() ?? false;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', 'unique:companies,slug'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string', 'max:500'],
            'logo' => ['nullable', 'string', 'max:255'],
            'is_active' => ['nullable', 'boolean'],
            'settings' => ['nullable', 'array'],
            'admin_user.name' => ['nullable', 'string', 'max:255'],
            'admin_user.email' => ['nullable', 'email', 'max:255', 'unique:users,email'],
            'admin_user.password' => ['nullable', 'string', 'min:8'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Company name is required.',
            'slug.unique' => 'This company slug is already taken.',
            'admin_user.email.unique' => 'This email is already registered.',
            'admin_user.password.min' => 'Password must be at least 8 characters.',
        ];
    }
}

