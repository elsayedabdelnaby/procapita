<?php

namespace Modules\Drivers\app\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class DriverStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isSuperAdmin() || $this->user()->can('drivers.drivers.create');
    }

    public function rules(): array
    {
        $user = $this->user();
        $companyId = $user->isSuperAdmin()
            ? $this->input('company_id')
            : $user->company_id;

        $rules = [
            'full_name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:255'],
            'whatsapp_phone' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'riding_company_id' => [
                'required',
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
                'required',
                'exists:lead_sources,id',
            ],
            'assigned_to' => [
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
            'lead_status_id' => [
                'required',
                'exists:lead_statuses,id',
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
                        if ($leadStage) {
                            // Check if riding_company_ids column exists and use it, otherwise fallback to riding_company_id
                            $hasRidingCompanyIds = \Illuminate\Support\Facades\Schema::hasColumn('lead_stages', 'riding_company_ids');
                            $hasRidingCompanyId = \Illuminate\Support\Facades\Schema::hasColumn('lead_stages', 'riding_company_id');
                            
                            $isValid = false;
                            $ridingCompanyIdInt = (int) $ridingCompanyId;
                            
                            if ($hasRidingCompanyIds && !empty($leadStage->riding_company_ids)) {
                                // Check if riding company is in the array (convert to integers for comparison)
                                $ridingCompanyIds = array_map('intval', $leadStage->riding_company_ids);
                                $isValid = in_array($ridingCompanyIdInt, $ridingCompanyIds);
                            } elseif ($hasRidingCompanyId && $leadStage->riding_company_id) {
                                // Fallback to single riding_company_id
                                $isValid = (int) $leadStage->riding_company_id == $ridingCompanyIdInt;
                            }
                            
                            if (!$isValid) {
                                $fail('The selected lead stage does not belong to the selected riding company.');
                            }
                        }
                    }
                },
            ],
            'driver_stage_id' => [
                'nullable',
                'exists:driver_stages,id',
            ],
            'current_stage_id' => ['nullable', 'exists:riding_company_stage_templates,id'],
            'lead_status_comment' => [
                function ($attribute, $value, $fail) {
                    $leadStatusId = $this->input('lead_status_id');
                    if ($leadStatusId) {
                        $leadStatus = \Modules\Drivers\app\Models\LeadStatus::find($leadStatusId);
                        $requiredStatuses = [
                            'Probleme with link', 'Whats app Message', 'Follow Documents', 'Follow Up', 'Need Recall',
                            'Link Not Done', 'Missing Documents', 'Waiting Activation', 'Need To Visit GL', 'Active',
                            'Sign Up', 'Sign up Cities', 'DFT', 'Complete 50', 'Complete 100', 'Complete 120',
                            'DFT Old', 'Fresh stage',
                        ];
                        if ($leadStatus && in_array($leadStatus->name, $requiredStatuses)) {
                            if (empty($value)) {
                                $fail('The feedback comment field is required for this lead status.');
                            }
                        }
                    }
                },
                'nullable',
                'string',
            ],
            'next_follow_up' => [
                function ($attribute, $value, $fail) {
                    $leadStatusId = $this->input('lead_status_id');
                    if ($leadStatusId) {
                        $leadStatus = \Modules\Drivers\app\Models\LeadStatus::find($leadStatusId);
                        $requiredStatuses = [
                            'Probleme with link', 'Whats app Message', 'Follow Documents', 'Follow Up', 'Need Recall',
                            'Link Not Done', 'Missing Documents', 'Waiting Activation', 'Need To Visit GL', 'Active',
                            'Sign Up', 'Sign up Cities', 'DFT', 'Complete 50', 'Complete 100', 'Complete 120',
                            'DFT Old', 'Fresh stage',
                        ];
                        if ($leadStatus && in_array($leadStatus->name, $requiredStatuses)) {
                            if (empty($value)) {
                                $fail('The next follow-up field is required for this lead status.');
                            }
                        }
                    }
                    if ($value) {
                        $selectedDate = \Carbon\Carbon::parse($value)->startOfDay();
                        $today = \Carbon\Carbon::today();
                        if ($selectedDate->lt($today)) {
                            $fail('Next Follow-up date must be today or a future date.');
                        }
                    }
                },
                'nullable',
                'date_format:Y-m-d\TH:i',
            ],
            'next_time' => ['nullable', 'string', 'max:10'],
            'notes' => ['nullable', 'string'],
            'feedback_count' => ['nullable', 'integer', 'min:0'],
            'vehicle_type' => ['nullable', 'string', 'max:255'],
            'car_or_scooter' => ['nullable', 'string', 'in:Car,Scooter'],
            'has_worked_before' => ['nullable', 'string', 'max:255'],
            'governorate' => ['nullable', 'string', 'max:255'],
            'cancel_reason' => [
                function ($attribute, $value, $fail) {
                    $leadStatusId = $this->input('lead_status_id');
                    if ($leadStatusId) {
                        $leadStatus = \Modules\Drivers\app\Models\LeadStatus::find($leadStatusId);
                        if ($leadStatus && in_array($leadStatus->name, ['Rejected', 'Deleted lead', 'Expired Account'])) {
                            if (empty($value)) {
                                $fail('The cancel reason field is required when lead status is Rejected, Deleted lead, or Expired Account.');
                            }
                        }
                    }
                },
                'nullable',
                'string',
                'in:Not interested,Wrong Number,Under Age,Duplicated,Wrong Documents,Car Not Accepted,Other,Already driver,Expired,Cities,Dont have driving license',
            ],
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
            'riding_company_id.required' => 'Riding company is required.',
            'lead_source_id.required' => 'Lead source is required.',
            'assigned_to.required' => 'Please select an agent.',
            'lead_status_id.required' => 'Lead status is required.',
        ];
    }
}
