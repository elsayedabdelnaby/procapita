<?php

namespace Modules\Drivers\database\factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Modules\Drivers\app\Models\Driver;
use Modules\Drivers\app\Models\DriverStage;
use Modules\RidingCarCompanies\app\Models\RidingCompanyStageTemplate;

class DriverStageFactory extends Factory
{
    protected $model = DriverStage::class;

    public function definition(): array
    {
        $statuses = ['pending', 'in_progress', 'completed', 'rejected'];

        return [
            'driver_id' => Driver::factory(),
            'stage_template_id' => RidingCompanyStageTemplate::factory(),
            'stage_order' => $this->faker->numberBetween(1, 10),
            'status' => $this->faker->randomElement($statuses),
            'completed_at' => $this->faker->optional(0.3)->dateTimeBetween('-1 month', 'now'),
            'notes' => $this->faker->optional(0.2)->sentence(),
        ];
    }

    public function pending(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'pending',
            'completed_at' => null,
        ]);
    }

    public function inProgress(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'in_progress',
            'completed_at' => null,
        ]);
    }

    public function completed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'completed',
            'completed_at' => $this->faker->dateTimeBetween('-1 month', 'now'),
        ]);
    }

    public function rejected(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'rejected',
            'completed_at' => null,
        ]);
    }

    public function forDriver(int $driverId): static
    {
        return $this->state(fn (array $attributes) => [
            'driver_id' => $driverId,
        ]);
    }

    public function forStageTemplate(int $stageTemplateId): static
    {
        return $this->state(fn (array $attributes) => [
            'stage_template_id' => $stageTemplateId,
        ]);
    }
}

