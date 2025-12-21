<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('drivers', function (Blueprint $table) {
            // Remove next_time column if it exists
            if (Schema::hasColumn('drivers', 'next_time')) {
                $table->dropColumn('next_time');
            }
        });

        // Convert next_follow_up from date to datetime
        if (Schema::hasColumn('drivers', 'next_follow_up')) {
            DB::statement('ALTER TABLE `drivers` MODIFY COLUMN `next_follow_up` DATETIME NULL');
        }

        // Convert last_follow_up from date to datetime
        if (Schema::hasColumn('drivers', 'last_follow_up')) {
            DB::statement('ALTER TABLE `drivers` MODIFY COLUMN `last_follow_up` DATETIME NULL');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Convert back to date
        if (Schema::hasColumn('drivers', 'next_follow_up')) {
            DB::statement('ALTER TABLE `drivers` MODIFY COLUMN `next_follow_up` DATE NULL');
        }

        if (Schema::hasColumn('drivers', 'last_follow_up')) {
            DB::statement('ALTER TABLE `drivers` MODIFY COLUMN `last_follow_up` DATE NULL');
        }

        // Add next_time back (as string)
        Schema::table('drivers', function (Blueprint $table) {
            if (!Schema::hasColumn('drivers', 'next_time')) {
                $table->string('next_time', 10)->nullable()->after('next_follow_up');
            }
        });
    }
};

