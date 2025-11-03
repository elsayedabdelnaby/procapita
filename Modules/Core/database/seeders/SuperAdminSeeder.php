<?php

namespace Modules\Core\database\seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class SuperAdminSeeder extends Seeder
{
    public function run(): void
    {
        $superAdmin = User::firstOrCreate(
            ['email' => 'superadmin@dopave.local'],
            [
                'name' => 'Super Administrator',
                'password' => Hash::make('password'),
                'is_super_admin' => true,
                'is_company_admin' => false,
                'is_active' => true,
                'company_id' => null,
            ]
        );

        $this->command->info('Super admin created successfully.');
        $this->command->info('Email: superadmin@dopave.local');
        $this->command->info('Password: password');
    }
}

