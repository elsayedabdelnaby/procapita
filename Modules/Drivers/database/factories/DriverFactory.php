<?php

namespace Modules\Drivers\database\factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Modules\Core\app\Models\Company;
use Modules\Drivers\app\Models\Driver;
use Modules\Drivers\app\Models\LeadSource;
use Modules\Drivers\app\Models\LeadStatus;
use Modules\Marketing\app\Models\Campaign;
use Modules\RidingCarCompanies\app\Models\RidingCompany;

class DriverFactory extends Factory
{
    protected $model = Driver::class;

    public function definition(): array
    {
        return [
            'uuid' => (string) \Illuminate\Support\Str::uuid(),
            'company_id' => Company::factory(),
            'full_name' => $this->faker->name(),
            'phone' => $this->faker->phoneNumber(),
            'whatsapp_phone' => $this->faker->optional(0.8)->phoneNumber(),
            'email' => $this->faker->optional(0.7)->email(),
            'riding_company_id' => RidingCompany::factory(),
            'campaign_id' => $this->faker->optional(0.5)->randomElement([Campaign::factory(), null]),
            'lead_source_id' => $this->faker->optional(0.6)->randomElement([LeadSource::factory(), null]),
            'assigned_to' => $this->faker->optional(0.5)->randomElement([User::factory(), null]),
            'lead_status_id' => $this->faker->optional(0.7)->randomElement([LeadStatus::factory(), null]),
            'notes' => $this->faker->optional(0.3)->paragraph(),
        ];
    }

    public function forCompany(int $companyId): static
    {
        return $this->state(fn (array $attributes) => [
            'company_id' => $companyId,
        ]);
    }

    public function forRidingCompany(int $ridingCompanyId): static
    {
        return $this->state(fn (array $attributes) => [
            'riding_company_id' => $ridingCompanyId,
        ]);
    }

    public function forCampaign(int $campaignId): static
    {
        return $this->state(fn (array $attributes) => [
            'campaign_id' => $campaignId,
        ]);
    }

    public function assignedTo(int $userId): static
    {
        return $this->state(fn (array $attributes) => [
            'assigned_to' => $userId,
        ]);
    }
}

