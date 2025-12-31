<?php

namespace Modules\RidingCarCompanies\app\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RidingCompanyUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isSuperAdmin() || $this->user()->can('ridingcarcompanies.ridingcompanies.update');
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
            'logo' => [
                'nullable',
                'image',
                'mimes:jpeg,jpg,png,gif,pjpeg,x-png',
                'max:2048',
                function ($attribute, $value, $fail) {
                    if ($value) {
                        $imageInfo = @getimagesize($value->getRealPath());
                        
                        if ($imageInfo === false) {
                            $fail('Unable to read image dimensions.');
                            return;
                        }
                        
                        $actualWidth = $imageInfo[0];
                        $actualHeight = $imageInfo[1];
                        
                        if ($actualWidth > 125 || $actualHeight > 40) {
                            $fail("The logo dimensions must be 125x40 pixels or less. Current dimensions: {$actualWidth}x{$actualHeight}.");
                        }
                    }
                },
            ],
            'api_settings' => ['nullable', 'array'],
            'active' => ['nullable', 'boolean'],
            'default_driver_user_id' => ['nullable', 'integer', 'exists:users,id'],
            'distribution_type' => ['nullable', 'string', 'in:equal'],
            'max_drivers_per_day' => ['nullable', 'integer', 'min:1'],
            'distribution_users' => ['nullable', 'array'],
            'distribution_users.*' => ['integer', 'exists:users,id'],
            'distribution_scenarios' => ['nullable', 'array'],
            'distribution_scenarios.*.distribution_from_users' => ['required', 'array', 'min:1'],
            'distribution_scenarios.*.distribution_from_users.*' => ['integer', 'exists:users,id'],
            'distribution_scenarios.*.max_drivers_per_day' => ['nullable', 'integer', 'min:1'],
            'distribution_scenarios.*.distribution_by_lead_source_enabled' => ['nullable', 'boolean'],
            'distribution_scenarios.*.distribution_by_lead_sources' => ['nullable', 'array'],
            'distribution_scenarios.*.distribution_by_lead_sources.*' => ['integer', 'exists:lead_sources,id'],
            'distribution_scenarios.*.assigned_to_users' => ['nullable', 'array'],
            'distribution_scenarios.*.assigned_to_users.*' => ['integer', 'exists:users,id'],
            'distribution_scenarios.*.assigned_to_roles' => ['nullable', 'array'],
            'distribution_scenarios.*.assigned_to_roles.*' => ['integer', 'exists:roles,id'],
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
            'logo.image' => 'The logo must be an image file.',
            'logo.mimes' => 'The logo must be a .jpeg, .jpg, .png, .gif, .pjpeg, or .x-png file.',
            'logo.max' => 'The logo size must not exceed 2MB.',
        ];
    }
}

