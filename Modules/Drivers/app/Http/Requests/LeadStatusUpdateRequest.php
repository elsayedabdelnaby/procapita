<?php

namespace Modules\Drivers\app\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class LeadStatusUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isSuperAdmin() || $this->user()->can('drivers.leadstatuses.update');
    }

    public function rules(): array
    {
        $user = $this->user();
        $leadStatusId = $this->route('leadStatus');
        
        $rules = [
            'name' => ['required', 'string', 'max:255', \Illuminate\Validation\Rule::unique('lead_statuses', 'name')->whereNull('deleted_at')->ignore($leadStatusId)],
            'slug' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'color' => ['nullable', 'string', 'max:50'],
            'order' => ['nullable', 'integer', 'min:0'],
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
            'name.required' => 'Lead status name is required.',
            'name.unique' => 'This lead status name is already taken.',
        ];
    }
}

