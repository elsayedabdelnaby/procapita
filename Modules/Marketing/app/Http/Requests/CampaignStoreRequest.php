<?php

namespace Modules\Marketing\app\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CampaignStoreRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->hasPermissionTo('marketing.campaigns.create') || $this->user()->isSuperAdmin();
    }

    /**
     * Get validated data with empty strings removed.
     */
    public function validated($key = null, $default = null): array
    {
        $validated = parent::validated($key, $default);
        
        // Remove empty string values for numeric fields to prevent database errors
        $numericFields = [
            'daily_budget', 'expected_budget', 'expected_roi', 'expected_leads', 'expected_conversions',
            'expected_conversion_rate', 'expected_reach', 'expected_impressions',
            'expected_clicks', 'expected_ctr', 'expected_revenue',
        ];

        foreach ($numericFields as $field) {
            if (array_key_exists($field, $validated) && ($validated[$field] === '' || $validated[$field] === null)) {
                unset($validated[$field]);
            }
        }

        return $validated;
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        $user = $this->user();
        
        return [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'company_id' => $user->isSuperAdmin() ? ['required', 'integer', 'exists:companies,id'] : ['nullable'],
            'campaign_type_id' => ['required', 'integer', 'exists:campaign_types,id'],
            'campaign_status_id' => ['required', 'integer', 'exists:campaign_statuses,id'],
            'budget_type' => ['required', 'string', 'in:daily,total'],
            'daily_budget' => ['required_if:budget_type,daily', 'nullable', 'numeric', 'min:0'],
            'campaign_channel_id' => ['required', 'integer', 'exists:campaign_channels,id'],
            'start_date' => ['required', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            
            // Expected metrics
            'expected_budget' => ['required_if:budget_type,total', 'nullable', 'numeric', 'min:0'],
            'expected_roi' => ['nullable', 'numeric'],
            'expected_leads' => ['nullable', 'integer', 'min:0'],
            'expected_conversions' => ['nullable', 'integer', 'min:0'],
            'expected_conversion_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'expected_reach' => ['nullable', 'integer', 'min:0'],
            'expected_impressions' => ['nullable', 'integer', 'min:0'],
            'expected_clicks' => ['nullable', 'integer', 'min:0'],
            'expected_ctr' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'expected_revenue' => ['nullable', 'numeric', 'min:0'],
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Campaign name is required.',
            'name.max' => 'Campaign name must not exceed 255 characters.',
            'type.required' => 'Campaign type is required.',
            'type.in' => 'Invalid campaign type selected.',
            'status.required' => 'Campaign status is required.',
            'status.in' => 'Invalid campaign status selected.',
            'start_date.required' => 'Start date is required.',
            'start_date.date' => 'Start date must be a valid date.',
            'end_date.date' => 'End date must be a valid date.',
            'end_date.after_or_equal' => 'End date must be after or equal to start date.',
            'expected_budget.numeric' => 'Expected budget must be a number.',
            'expected_budget.min' => 'Expected budget must be at least 0.',
        ];
    }
}

