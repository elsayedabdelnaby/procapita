<?php

namespace Modules\RidingCarCompanies\database\seeders;

use Illuminate\Database\Seeder;

class RidingCarCompaniesDatabaseSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->call([
            RidingCarCompaniesPermissionsSeeder::class,
        ]);
    }
}
