<?php

namespace Modules\RidingCarCompanies\database\factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Modules\RidingCarCompanies\app\Models\RidingCompany;
use Modules\RidingCarCompanies\app\Models\RidingCompanyStageTemplate;

class RidingCompanyStageTemplateFactory extends Factory
{
    protected $model = RidingCompanyStageTemplate::class;

    public function definition(): array
    {
        return [
            'riding_company_id' => RidingCompany::factory(),
            'name' => 'Stage ' . $this->faker->numberBetween(1, 10),
            'order' => $this->faker->numberBetween(1, 10),
            'target_value' => $this->faker->numberBetween(10, 1000),
            'target_unit' => 'rides',
            'duration_days' => $this->faker->numberBetween(7, 90),
            'strict_sequence' => $this->faker->boolean(30), // 30% chance
            'allow_cumulative' => $this->faker->boolean(50), // 50% chance
            'description' => $this->faker->optional()->sentence(),
            'active' => true,
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'active' => false,
        ]);
    }

    public function strictSequence(): static
    {
        return $this->state(fn (array $attributes) => [
            'strict_sequence' => true,
        ]);
    }

    public function allowCumulative(): static
    {
        return $this->state(fn (array $attributes) => [
            'allow_cumulative' => true,
        ]);
    }

    public function forCompany(int $ridingCompanyId): static
    {
        return $this->state(fn (array $attributes) => [
            'riding_company_id' => $ridingCompanyId,
        ]);
    }
}

