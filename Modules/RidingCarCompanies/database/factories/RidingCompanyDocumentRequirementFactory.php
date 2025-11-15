<?php

namespace Modules\RidingCarCompanies\database\factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Modules\RidingCarCompanies\app\Models\RidingCompany;
use Modules\RidingCarCompanies\app\Models\RidingCompanyDocumentRequirement;

class RidingCompanyDocumentRequirementFactory extends Factory
{
    protected $model = RidingCompanyDocumentRequirement::class;

    public function definition(): array
    {
        $type = $this->faker->randomElement(['file', 'pdf', 'text']);
        $documentNames = [
            'file' => ['Driver License', 'Vehicle Registration', 'Insurance Certificate', 'ID Card', 'Passport'],
            'pdf' => ['Contract Document', 'Terms and Conditions', 'Policy Document', 'Agreement PDF'],
            'text' => ['License Number', 'Registration Number', 'Insurance Policy Number', 'National ID'],
        ];

        return [
            'riding_company_id' => RidingCompany::factory(),
            'name' => $this->faker->randomElement($documentNames[$type]),
            'type' => $type,
            'required' => $this->faker->boolean(70), // 70% chance of being required
            'instructions' => $this->faker->optional(0.6)->sentence(),
            'active' => true,
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'active' => false,
        ]);
    }

    public function required(): static
    {
        return $this->state(fn (array $attributes) => [
            'required' => true,
        ]);
    }

    public function optional(): static
    {
        return $this->state(fn (array $attributes) => [
            'required' => false,
        ]);
    }

    public function fileType(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'file',
            'name' => $this->faker->randomElement(['Driver License', 'Vehicle Registration', 'Insurance Certificate', 'ID Card', 'Passport']),
        ]);
    }

    public function textType(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'text',
            'name' => $this->faker->randomElement(['License Number', 'Registration Number', 'Insurance Policy Number', 'National ID']),
        ]);
    }

    public function pdfType(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'pdf',
            'name' => $this->faker->randomElement(['Contract Document', 'Terms and Conditions', 'Policy Document', 'Agreement PDF']),
        ]);
    }

    public function forCompany(int $ridingCompanyId): static
    {
        return $this->state(fn (array $attributes) => [
            'riding_company_id' => $ridingCompanyId,
        ]);
    }
}

