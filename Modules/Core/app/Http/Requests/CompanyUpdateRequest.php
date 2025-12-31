<?php

namespace Modules\Core\app\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CompanyUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isSuperAdmin() ?? false;
    }

    public function rules(): array
    {
        $companyId = $this->route('company');

        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', "unique:companies,slug,{$companyId}"],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string', 'max:500'],
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
                        
                        if ($actualWidth > 160 || $actualHeight > 40) {
                            $fail("The logo dimensions must be 160x40 pixels or less. Current dimensions: {$actualWidth}x{$actualHeight}.");
                        }
                    }
                },
            ],
            'is_active' => ['nullable', 'boolean'],
            'settings' => ['nullable', 'array'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Company name is required.',
            'slug.unique' => 'This company slug is already taken.',
            'logo.image' => 'The logo must be an image file.',
            'logo.mimes' => 'The logo must be a .jpeg, .jpg, .png, .gif, .pjpeg, or .x-png file.',
            'logo.max' => 'The logo size must not exceed 2MB.',
        ];
    }
}

