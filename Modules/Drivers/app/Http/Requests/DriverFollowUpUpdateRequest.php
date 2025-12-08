<?php

namespace Modules\Drivers\app\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class DriverFollowUpUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isSuperAdmin() || $this->user()->can('drivers.driverfollowups.update');
    }

    public function rules(): array
    {
        return [
            'assigned_to' => ['nullable', 'exists:users,id'],
            'user_name' => ['sometimes', 'required', 'string', 'max:255'],
            'created_time' => ['sometimes', 'required', 'date'],
            'riding_company' => ['nullable', 'string', 'max:255'],
            'lead_stage' => ['nullable', 'string', 'max:255'],
            'lead_status' => ['nullable', 'string', 'max:255'],
            'lead_status_comment' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
            'driver_num' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            'user_name.required' => 'User name is required.',
            'created_time.required' => 'Created time is required.',
        ];
    }
}

