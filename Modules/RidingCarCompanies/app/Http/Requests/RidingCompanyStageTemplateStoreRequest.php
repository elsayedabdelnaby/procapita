<?php

namespace Modules\RidingCarCompanies\app\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RidingCompanyStageTemplateStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isSuperAdmin() || $this->user()->can('ridingcarcompanies.stagetemplates.create');
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'order' => ['required', 'integer', 'min:1'],
            'target_value' => ['required', 'integer', 'min:1'],
            'target_unit' => ['nullable', 'string', 'max:50'],
            'duration_days' => ['required', 'integer', 'min:1'],
            'strict_sequence' => ['nullable', 'boolean'],
            'allow_cumulative' => ['nullable', 'boolean'],
            'description' => ['nullable', 'string'],
            'active' => ['nullable', 'boolean'],
            'commission_value' => ['nullable', 'numeric', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Stage name is required.',
            'order.required' => 'Order is required.',
            'target_value.required' => 'Target value is required.',
            'duration_days.required' => 'Duration in days is required.',
        ];
    }
}

