<?php

namespace Database\Seeders;

use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Seed Core module
        $this->call([
            \Modules\Core\database\seeders\CoreDatabaseSeeder::class,
            \Modules\Marketing\database\seeders\MarketingDatabaseSeeder::class,
            \Modules\RidingCarCompanies\database\seeders\RidingCarCompaniesDatabaseSeeder::class,
            \Modules\Drivers\database\seeders\DriversDatabaseSeeder::class,
            \Modules\RecycleBin\database\seeders\RecycleBinDatabaseSeeder::class,
        ]);
    }
}
