<?php

namespace Modules\Marketing\app\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class MarketingTemplateUpdateRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->hasPermissionTo('marketing.marketing_templates.update') || $this->user()->isSuperAdmin();
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'string', 'in:email,sms,social_post,landing_page,ad,other'],
            'subject' => ['nullable', 'string', 'max:255'],
            'content' => ['required', 'string'],
            'variables' => ['nullable', 'array'],
            'is_active' => ['nullable', 'boolean'],
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Template name is required.',
            'name.max' => 'Template name must not exceed 255 characters.',
            'type.required' => 'Template type is required.',
            'type.in' => 'Invalid template type selected.',
            'content.required' => 'Template content is required.',
            'subject.max' => 'Subject must not exceed 255 characters.',
        ];
    }
}

