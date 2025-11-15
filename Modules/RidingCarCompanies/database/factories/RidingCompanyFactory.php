<?php

namespace Modules\RidingCarCompanies\database\factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;
use Modules\RidingCarCompanies\app\Models\RidingCompany;

class RidingCompanyFactory extends Factory
{
    protected $model = RidingCompany::class;

    public function definition(): array
    {
        return [
            'uuid' => (string) Str::uuid(),
            'name' => $this->faker->company() . ' Ride',
            'slug' => $this->faker->unique()->slug(),
            'description' => $this->faker->paragraph(),
            'country' => $this->faker->country(),
            'city' => $this->faker->city(),
            'logo_path' => null,
            'contact_email' => $this->faker->companyEmail(),
            'contact_phone' => $this->faker->phoneNumber(),
            'api_settings' => null,
            'active' => true,
            'created_by' => null,
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'active' => false,
        ]);
    }

    public function withApiSettings(array $settings): static
    {
        return $this->state(fn (array $attributes) => [
            'api_settings' => $settings,
        ]);
    }
}

