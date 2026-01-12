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
        $companyId = $user->isSuperAdmin()
            ? $this->input('company_id')
            : $user->company_id;

        $rules = [
            'name' => [
                'required',
                'string',
                'max:255',
                function ($attribute, $value, $fail) use ($companyId) {
                    if ($value && $companyId) {
                        $existing = \Modules\RidingCarCompanies\app\Models\RidingCompany::where('name', $value)
                            ->where('company_id', $companyId)
                            ->whereNull('deleted_at')
                            ->exists();

                        if ($existing) {
                            $fail('A riding company with this name already exists for this main company.');
                        }
                    }
                },
            ],
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
            'name.max' => 'Company name must not exceed 255 characters.',
            'contact_email.email' => 'Please provide a valid email address.',
        ];
    }
}
