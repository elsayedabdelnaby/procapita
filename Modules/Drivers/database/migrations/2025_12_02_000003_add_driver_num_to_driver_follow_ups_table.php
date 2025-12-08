<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('driver_follow_ups', function (Blueprint $table) {
            if (!Schema::hasColumn('driver_follow_ups', 'driver_num')) {
                $table->string('driver_num')->nullable()->after('driver_id');
                $table->index('driver_num');
            }
        });
    }

    public function down(): void
    {
        Schema::table('driver_follow_ups', function (Blueprint $table) {
            if (Schema::hasColumn('driver_follow_ups', 'driver_num')) {
                $table->dropIndex(['driver_num']);
                $table->dropColumn('driver_num');
            }
        });
    }
};

