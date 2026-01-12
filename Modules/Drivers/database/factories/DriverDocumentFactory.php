<?php

namespace Modules\Drivers\database\factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Modules\Drivers\app\Models\Driver;
use Modules\Drivers\app\Models\DriverDocument;
use Modules\RidingCarCompanies\app\Models\RidingCompany;

class DriverDocumentFactory extends Factory
{
    protected $model = DriverDocument::class;

    public function definition(): array
    {
        $statuses = ['pending', 'approved', 'rejected'];

        return [
            'driver_id' => Driver::factory(),
            'riding_company_id' => RidingCompany::factory(),
            'uploaded_path' => $this->faker->optional(0.7)->filePath(),
            'status' => $this->faker->randomElement($statuses),
            'reviewer_id' => $this->faker->optional(0.4)->randomElement([User::factory(), null]),
            'notes' => $this->faker->optional(0.3)->sentence(),
        ];
    }

    public function pending(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'pending',
            'reviewer_id' => null,
        ]);
    }

    public function approved(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'approved',
            'reviewer_id' => User::factory(),
        ]);
    }

    public function rejected(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'rejected',
            'reviewer_id' => User::factory(),
        ]);
    }

    public function forDriver(int $driverId): static
    {
        return $this->state(fn (array $attributes) => [
            'driver_id' => $driverId,
        ]);
    }

    public function forRidingCompany(int $ridingCompanyId): static
    {
        return $this->state(fn (array $attributes) => [
            'riding_company_id' => $ridingCompanyId,
        ]);
    }
}
