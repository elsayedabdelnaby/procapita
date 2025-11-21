<?php

namespace Modules\Drivers\database\factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Modules\Core\app\Models\Company;
use Modules\Drivers\app\Models\LeadSource;

class LeadSourceFactory extends Factory
{
    protected $model = LeadSource::class;

    public function definition(): array
    {
        $sources = [
            'Facebook Ads',
            'Google Ads',
            'Referral',
            'Website',
            'Call Center',
            'Instagram Ads',
            'Twitter Ads',
            'LinkedIn Ads',
            'YouTube Ads',
            'Organic Search',
            'Direct',
            'Other',
        ];

        $name = $this->faker->unique()->randomElement($sources);

        return [
            'company_id' => Company::factory(),
            'name' => $name,
            'slug' => \Illuminate\Support\Str::slug($name),
            'description' => $this->faker->optional(0.6)->sentence(),
            'active' => true,
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'active' => false,
        ]);
    }

    public function forCompany(int $companyId): static
    {
        return $this->state(fn (array $attributes) => [
            'company_id' => $companyId,
        ]);
    }
}

