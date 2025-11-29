<?php

namespace Modules\RecycleBin\database\seeders;

use Illuminate\Database\Seeder;

class RecycleBinDatabaseSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->call([
            RecycleBinPermissionsSeeder::class,
        ]);
    }
}
