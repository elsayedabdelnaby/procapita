<?php

namespace Modules\Drivers\app\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class LeadStageUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isSuperAdmin() || $this->user()->can('drivers.leadstages.update');
    }

    public function rules(): array
    {
        $leadStageId = $this->route('leadStage');
        
        return [
            'name' => ['required', 'string', 'max:255', \Illuminate\Validation\Rule::unique('lead_stages', 'name')->whereNull('deleted_at')->ignore($leadStageId)],
            'slug' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'color' => ['nullable', 'string', 'max:50'],
            'order' => ['nullable', 'integer', 'min:0'],
            'active' => ['nullable', 'boolean'],
            'requires_all_documents_approved' => ['nullable', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Lead stage name is required.',
            'name.unique' => 'This lead stage name is already taken.',
        ];
    }
}

