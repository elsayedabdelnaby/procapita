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
            $table->string('driver_num')->nullable()->after('id');
            $table->index('driver_num');
        });

        // Set driver_num to id for all existing records
        DB::statement('UPDATE drivers SET driver_num = id');
    }

    public function down(): void
    {
        Schema::table('drivers', function (Blueprint $table) {
            $table->dropIndex(['driver_num']);
            $table->dropColumn('driver_num');
        });
    }
};

