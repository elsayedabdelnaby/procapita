<?php

namespace Modules\Drivers\database\seeders;

use Illuminate\Database\Seeder;

class DriversDatabaseSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->call([
            DriversPermissionsSeeder::class,
            LeadSourcesSeeder::class,
            LeadStatusesSeeder::class,
        ]);
    }
}
