<?php

namespace Modules\RidingCarCompanies\app\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RidingCompanyStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isSuperAdmin() || $this->user()->can('ridingcarcompanies.ridingcompanies.create');
    }

    public function rules(): array
    {
        $user = $this->user();
        $rules = [
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'country' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:255'],
            'contact_email' => ['nullable', 'email', 'max:255'],
            'contact_phone' => ['nullable', 'string', 'max:255'],
            'api_settings' => ['nullable', 'array'],
            'active' => ['nullable', 'boolean'],
        ];

        if ($user->isSuperAdmin()) {
            $rules['company_id'] = ['required', 'exists:companies,id'];
        }

        return $rules;
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Company name is required.',
            'contact_email.email' => 'Please provide a valid email address.',
        ];
    }
}

