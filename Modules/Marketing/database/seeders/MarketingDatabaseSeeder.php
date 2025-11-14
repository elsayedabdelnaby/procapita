<?php

namespace Modules\Marketing\database\seeders;

use Illuminate\Database\Seeder;
use Modules\Marketing\database\seeders\CampaignTypesSeeder;
use Modules\Marketing\database\seeders\MarketingPermissionsSeeder;

class MarketingDatabaseSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->call([
            CampaignTypesSeeder::class,
            MarketingPermissionsSeeder::class
        ]);
    }
}
