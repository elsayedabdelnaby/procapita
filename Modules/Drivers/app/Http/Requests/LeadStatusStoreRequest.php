<?php

namespace Modules\Drivers\app\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class LeadStatusStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isSuperAdmin() || $this->user()->can('drivers.leadstatuses.create');
    }

    protected function prepareForValidation(): void
    {
        $merge = [];
        if ($this->has('duration_value') && $this->duration_value === '') {
            $merge['duration_value'] = null;
        }
        if ($this->has('change_to_lead_status_id') && $this->change_to_lead_status_id === '') {
            $merge['change_to_lead_status_id'] = null;
        }
        if (! empty($merge)) {
            $this->merge($merge);
        }
    }

    public function rules(): array
    {
        $rules = [
            'name' => ['required', 'string', 'max:255', \Illuminate\Validation\Rule::unique('lead_statuses', 'name')->whereNull('deleted_at')],
            'slug' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'color' => ['nullable', 'string', 'max:50'],
            'order' => ['nullable', 'integer', 'min:0'],
            'active' => ['nullable', 'boolean'],
            'duration_value' => ['nullable', 'integer', 'min:0'],
            'duration_unit' => ['nullable', 'string', 'in:minutes,hours,days'],
            'change_to_lead_status_id' => ['nullable', 'integer', 'exists:lead_statuses,id'],
        ];

        return $rules;
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Lead status name is required.',
            'name.unique' => 'This lead status name is already taken.',
        ];
    }
}

