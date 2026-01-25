<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('drivers', function (Blueprint $table) {
            // Add driver_num if it doesn't exist
            if (!Schema::hasColumn('drivers', 'driver_num')) {
                $table->string('driver_num')->nullable()->after('id');
                $table->index('driver_num');
            }
        });

        // Set driver_num to id for all existing records (only if column was just added)
        if (Schema::hasColumn('drivers', 'driver_num')) {
            DB::statement('UPDATE drivers SET driver_num = id WHERE driver_num IS NULL');
        }
    }

    public function down(): void
    {
        Schema::table('drivers', function (Blueprint $table) {
            $table->dropIndex(['driver_num']);
            $table->dropColumn('driver_num');
        });
    }
};

