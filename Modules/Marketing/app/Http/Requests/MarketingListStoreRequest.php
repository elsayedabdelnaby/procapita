<?php

namespace Modules\Marketing\app\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class MarketingListStoreRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->hasPermissionTo('marketing.marketing_lists.create') || $this->user()->isSuperAdmin();
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'type' => ['required', 'string', 'in:static,dynamic,imported,segmented'],
            'status' => ['required', 'string', 'in:active,inactive,archived'],
            'total_contacts' => ['nullable', 'integer', 'min:0'],
            'criteria' => ['nullable', 'array'],
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Marketing list name is required.',
            'name.max' => 'Marketing list name must not exceed 255 characters.',
            'type.required' => 'List type is required.',
            'type.in' => 'Invalid list type selected.',
            'status.required' => 'Status is required.',
            'status.in' => 'Invalid status selected.',
            'total_contacts.integer' => 'Total contacts must be a number.',
            'total_contacts.min' => 'Total contacts must be at least 0.',
        ];
    }
}

