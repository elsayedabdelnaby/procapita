<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('riding_companies', function (Blueprint $table) {
            // Distribution type: 'equal' (Equal distribution - driver for each user)
            if (!Schema::hasColumn('riding_companies', 'distribution_type')) {
                $table->string('distribution_type')->nullable()->after('default_driver_user_id');
            }
            
            // Max drivers per day per user (default 50)
            if (!Schema::hasColumn('riding_companies', 'max_drivers_per_day')) {
                $table->integer('max_drivers_per_day')->default(50)->after('distribution_type');
            }
            
            // JSON field to store distribution user IDs and their current day assignment count
            if (!Schema::hasColumn('riding_companies', 'distribution_users')) {
                $table->json('distribution_users')->nullable()->after('max_drivers_per_day');
            }
            
            // Last distribution date (to reset daily counts)
            if (!Schema::hasColumn('riding_companies', 'last_distribution_date')) {
                $table->date('last_distribution_date')->nullable()->after('distribution_users');
            }
        });
    }

    public function down(): void
    {
        Schema::table('riding_companies', function (Blueprint $table) {
            if (Schema::hasColumn('riding_companies', 'last_distribution_date')) {
                $table->dropColumn('last_distribution_date');
            }
            if (Schema::hasColumn('riding_companies', 'distribution_users')) {
                $table->dropColumn('distribution_users');
            }
            if (Schema::hasColumn('riding_companies', 'max_drivers_per_day')) {
                $table->dropColumn('max_drivers_per_day');
            }
            if (Schema::hasColumn('riding_companies', 'distribution_type')) {
                $table->dropColumn('distribution_type');
            }
        });
    }
};

