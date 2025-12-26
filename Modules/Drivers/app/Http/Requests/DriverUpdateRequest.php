<?php

namespace Modules\Drivers\app\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class DriverUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isSuperAdmin() || $this->user()->can('drivers.drivers.update');
    }

    public function rules(): array
    {
        $user = $this->user();
        $driverId = $this->route('driver');
        $driver = $driverId ? \Modules\Drivers\app\Models\Driver::find($driverId) : null;
        $companyId = $user->isSuperAdmin() 
            ? ($this->input('company_id') ?? $driver?->company_id)
            : $user->company_id;

        $rules = [
            'full_name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:255'],
            'whatsapp_phone' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'riding_company_id' => [
                'nullable',
                'exists:riding_companies,id',
                function ($attribute, $value, $fail) use ($companyId) {
                    if ($value && $companyId) {
                        $ridingCompany = \Modules\RidingCarCompanies\app\Models\RidingCompany::find($value);
                        if ($ridingCompany && $ridingCompany->company_id != $companyId) {
                            $fail('The selected riding company does not belong to this company.');
                        }
                    }
                },
            ],
            'campaign_id' => [
                'nullable',
                'exists:campaigns,id',
                function ($attribute, $value, $fail) use ($companyId) {
                    if ($value && $companyId) {
                        $campaign = \Modules\Marketing\app\Models\Campaign::find($value);
                        if ($campaign && $campaign->company_id != $companyId) {
                            $fail('The selected campaign does not belong to this company.');
                        }
                    }
                },
            ],
            'lead_source_id' => [
                'nullable',
                'exists:lead_sources,id',
                function ($attribute, $value, $fail) use ($companyId) {
                    if ($value && $companyId) {
                        $leadSource = \Modules\Drivers\app\Models\LeadSource::find($value);
                        if ($leadSource && $leadSource->company_id != $companyId) {
                            $fail('The selected lead source does not belong to this company.');
                        }
                    }
                },
            ],
            'assigned_users' => [
                'nullable',
                'array',
            ],
            'assigned_users.*' => [
                'required',
                'integer',
                'exists:users,id',
                function ($attribute, $value, $fail) use ($companyId) {
                    if ($value && $companyId) {
                        $assignedUser = \App\Models\User::find($value);
                        if ($assignedUser && $assignedUser->company_id != $companyId) {
                            $fail('The selected user does not belong to this company.');
                        }
                    }
                },
            ],
            'assigned_to' => ['nullable', 'integer', 'exists:users,id'], // Keep for backward compatibility
            'lead_status_id' => [
                'nullable',
                'exists:lead_statuses,id',
                function ($attribute, $value, $fail) use ($companyId) {
                    if ($value && $companyId) {
                        $leadStatus = \Modules\Drivers\app\Models\LeadStatus::find($value);
                        if ($leadStatus && $leadStatus->company_id != $companyId) {
                            $fail('The selected lead status does not belong to this company.');
                        }
                    }
                },
            ],
            'lead_stage_id' => [
                'nullable',
                'exists:lead_stages,id',
                function ($attribute, $value, $fail) use ($companyId) {
                    if ($value && $companyId) {
                        $leadStage = \Modules\Drivers\app\Models\LeadStage::find($value);
                        if ($leadStage) {
                            $ridingCompany = $leadStage->ridingCompany;
                            if ($ridingCompany && $ridingCompany->company_id != $companyId) {
                                $fail('The selected lead stage does not belong to this company.');
                            }
                        }
                    }
                },
                function ($attribute, $value, $fail) {
                    $ridingCompanyId = $this->input('riding_company_id');
                    if ($value && $ridingCompanyId) {
                        $leadStage = \Modules\Drivers\app\Models\LeadStage::find($value);
                        if ($leadStage && $leadStage->riding_company_id != $ridingCompanyId) {
                            $fail('The selected lead stage does not belong to the selected riding company.');
                        }
                    }
                },
            ],
            'current_stage_id' => ['nullable', 'exists:riding_company_stage_templates,id'],
            'lead_status_comment' => ['nullable', 'string'],
            'next_follow_up' => [
                'nullable',
                'date',
                function ($attribute, $value, $fail) {
                    if ($value) {
                        $selectedDate = \Carbon\Carbon::parse($value)->startOfDay();
                        $today = \Carbon\Carbon::today();
                        if ($selectedDate->lt($today)) {
                            $fail('Next Follow-up date must be today or a future date.');
                        }
                    }
                },
            ],
            'next_time' => ['nullable', 'string', 'max:10'],
            'notes' => ['nullable', 'string'],
            'cancel_reason' => ['nullable', 'string', 'in:Not interested,Wrong Number,Under Age,Duplicated,Wrong Documents,Car Not Accepted,Other,Already driver,Expired,Cities,Dont have driving license'],
        ];

        if ($user->isSuperAdmin()) {
            $rules['company_id'] = ['required', 'exists:companies,id'];
        }

        return $rules;
    }

    public function messages(): array
    {
        return [
            'full_name.required' => 'Full name is required.',
            'phone.required' => 'Phone number is required.',
            'email.email' => 'Please provide a valid email address.',
        ];
    }
}

