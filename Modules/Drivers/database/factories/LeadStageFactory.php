<?php

namespace Modules\Drivers\database\factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Modules\Drivers\app\Models\LeadStage;

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
            'name' => $name,
            'slug' => \Illuminate\Support\Str::slug($name),
            'description' => $this->faker->optional(0.5)->sentence(),
            'color' => $this->faker->randomElement(['green', 'blue', 'yellow', 'orange', 'red', 'purple', 'gray']),
            'order' => $this->faker->numberBetween(0, 100),
            'active' => true,
            'requires_all_documents_approved' => $this->faker->boolean(30), // 30% chance of being true
            'commission_value' => $this->faker->optional(0.7)->randomFloat(2, 0, 1000), // 70% chance of having a commission value
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'active' => false,
        ]);
    }

    public function requiresDocuments(): static
    {
        return $this->state(fn (array $attributes) => [
            'requires_all_documents_approved' => true,
        ]);
    }
}

