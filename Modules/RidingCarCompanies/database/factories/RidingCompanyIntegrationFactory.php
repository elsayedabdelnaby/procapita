<?php

namespace Modules\RidingCarCompanies\database\factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Modules\RidingCarCompanies\app\Models\RidingCompany;
use Modules\RidingCarCompanies\app\Models\RidingCompanyIntegration;

class RidingCompanyIntegrationFactory extends Factory
{
    protected $model = RidingCompanyIntegration::class;

    public function definition(): array
    {
        $type = $this->faker->randomElement(['webhook', 'api', 'csv']);

        return [
            'riding_company_id' => RidingCompany::factory(),
            'type' => $type,
            'config' => $this->getConfigForType($type),
            'active' => true,
        ];
    }

    protected function getConfigForType(string $type): array
    {
        return match ($type) {
            'webhook' => [
                'endpoint' => $this->faker->url(),
                'method' => 'POST',
                'headers' => [
                    'Content-Type' => 'application/json',
                    'Authorization' => 'Bearer ' . $this->faker->uuid(),
                ],
                'mapping' => [
                    'ride_id' => 'id',
                    'driver_id' => 'driver.id',
                    'passenger_id' => 'passenger.id',
                    'start_time' => 'started_at',
                    'end_time' => 'ended_at',
                ],
            ],
            'api' => [
                'base_url' => $this->faker->url(),
                'endpoint' => '/api/v1/rides',
                'method' => 'GET',
                'auth_type' => 'bearer',
                'api_key' => $this->faker->uuid(),
                'rate_limit' => 100,
                'timeout' => 30,
            ],
            'csv' => [
                'file_path' => '/uploads/rides.csv',
                'delimiter' => ',',
                'encoding' => 'UTF-8',
                'mapping' => [
                    'ride_id' => 0,
                    'driver_id' => 1,
                    'passenger_id' => 2,
                    'start_time' => 3,
                    'end_time' => 4,
                ],
                'skip_header' => true,
            ],
            default => [],
        };
    }

    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'active' => false,
        ]);
    }

    public function webhook(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'webhook',
            'config' => $this->getConfigForType('webhook'),
        ]);
    }

    public function api(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'api',
            'config' => $this->getConfigForType('api'),
        ]);
    }

    public function csv(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'csv',
            'config' => $this->getConfigForType('csv'),
        ]);
    }

    public function forCompany(int $ridingCompanyId): static
    {
        return $this->state(fn (array $attributes) => [
            'riding_company_id' => $ridingCompanyId,
        ]);
    }
}

