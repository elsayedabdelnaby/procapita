<?php

namespace Modules\Drivers\app\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class LeadStatusStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isSuperAdmin() || $this->user()->can('drivers.leadstatuses.create');
    }

    public function rules(): array
    {
        $user = $this->user();
        $rules = [
            'name' => ['required', 'string', 'max:255'],
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
        ];
    }
}

