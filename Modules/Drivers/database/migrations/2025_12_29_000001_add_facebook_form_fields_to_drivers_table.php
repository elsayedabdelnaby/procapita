<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('drivers', function (Blueprint $table) {
            if (!Schema::hasColumn('drivers', 'worked_with_us_before')) {
                $table->text('worked_with_us_before')->nullable()->after('notes');
            }
            if (!Schema::hasColumn('drivers', 'vehicle_type_and_year')) {
                $table->text('vehicle_type_and_year')->nullable()->after('worked_with_us_before');
            }
            if (!Schema::hasColumn('drivers', 'city')) {
                $table->string('city')->nullable()->after('vehicle_type_and_year');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('drivers', function (Blueprint $table) {
            if (Schema::hasColumn('drivers', 'city')) {
                $table->dropColumn('city');
            }
            if (Schema::hasColumn('drivers', 'vehicle_type_and_year')) {
                $table->dropColumn('vehicle_type_and_year');
            }
            if (Schema::hasColumn('drivers', 'worked_with_us_before')) {
                $table->dropColumn('worked_with_us_before');
            }
        });
    }
};

