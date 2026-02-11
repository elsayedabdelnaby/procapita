<?php

namespace Modules\Core\database\seeders;

use Illuminate\Database\Seeder;
use Modules\Core\app\Models\Company;

class SystemCompanySeeder extends Seeder
{
    /**
     * Create or update the system company (Procapita). Essential like super admin when cleaning the database.
     */
    public function run(): void
    {
        $name = config('app.system_company_name', 'Procapita');
        $slug = \Illuminate\Support\Str::slug($name);

        $company = Company::withTrashed()->where('name', $name)->first();
        if (! $company) {
            $company = Company::create([
                'name' => $name,
                'slug' => $slug,
                'is_active' => true,
                'is_system' => true,
            ]);
        } else {
            if ($company->trashed()) {
                $company->restore();
            }
            $company->is_system = true;
            $company->is_active = true;
            $company->save();
        }

        $this->command->info("System company \"{$name}\" (id: {$company->id}) ensured.");
    }
}
