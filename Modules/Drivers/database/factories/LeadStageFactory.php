<?php

namespace Modules\Drivers\database\factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Modules\Drivers\app\Models\LeadStage;
use Modules\RidingCarCompanies\app\Models\RidingCompany;

class LeadStageFactory extends Factory
{
    protected $model = LeadStage::class;

    public function definition(): array
    {
        $stages = [
            'Initial Contact',
            'Document Review',
            'Background Check',
            'Interview Scheduled',
            'Approved',
            'Rejected',
            'On Hold',
        ];

        $name = $this->faker->unique()->randomElement($stages);

        return [
            'riding_company_id' => RidingCompany::factory(),
            'name' => $name,
            'slug' => \Illuminate\Support\Str::slug($name),
            'description' => $this->faker->optional(0.5)->sentence(),
            'color' => $this->faker->randomElement(['green', 'blue', 'yellow', 'orange', 'red', 'purple', 'gray']),
            'order' => $this->faker->numberBetween(0, 100),
            'active' => true,
            'requires_all_documents_approved' => $this->faker->boolean(30), // 30% chance of being true
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'active' => false,
        ]);
    }

    public function forRidingCompany(int $ridingCompanyId): static
    {
        return $this->state(fn (array $attributes) => [
            'riding_company_id' => $ridingCompanyId,
        ]);
    }

    public function requiresDocuments(): static
    {
        return $this->state(fn (array $attributes) => [
            'requires_all_documents_approved' => true,
        ]);
    }
}

