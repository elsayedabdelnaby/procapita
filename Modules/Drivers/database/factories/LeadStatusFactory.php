<?php

namespace Modules\Drivers\database\factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Modules\Drivers\app\Models\LeadStatus;

class LeadStatusFactory extends Factory
{
    protected $model = LeadStatus::class;

    public function definition(): array
    {
        $statuses = [
            'New',
            'Contacted',
            'Interested',
            'Not Answering',
            'Wrong Number',
            'Qualified',
            'Rejected',
        ];

        $name = $this->faker->unique()->randomElement($statuses);

        return [
            'name' => $name,
            'slug' => \Illuminate\Support\Str::slug($name),
            'description' => $this->faker->optional(0.5)->sentence(),
            'color' => $this->faker->randomElement(['green', 'blue', 'yellow', 'orange', 'red', 'purple', 'gray']),
            'order' => $this->faker->numberBetween(0, 100),
            'active' => true,
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'active' => false,
        ]);
    }
}

