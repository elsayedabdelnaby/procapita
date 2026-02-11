<?php

namespace Modules\Drivers\app\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class DriverFollowUpStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isSuperAdmin() || $this->user()->can('drivers.driverfollowups.create');
    }

    public function rules(): array
    {
        $user = $this->user();

        return [
            'driver_id' => ['required', 'exists:drivers,id'],
            'assigned_to' => ['nullable', 'exists:users,id'],
            'user_name' => [$user && $user->isSuperAdmin() ? 'nullable' : 'required', 'string', 'max:255'],
            'created_time' => ['required', 'date'],
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
            'driver_id.required' => 'Driver is required.',
            'user_name.required' => 'User name is required.',
            'created_time.required' => 'Created time is required.',
        ];
    }
}

