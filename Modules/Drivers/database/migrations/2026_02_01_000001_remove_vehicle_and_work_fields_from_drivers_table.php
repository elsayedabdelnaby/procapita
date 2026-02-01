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
            if (Schema::hasColumn('drivers', 'worked_with_us_before')) {
                $table->dropColumn('worked_with_us_before');
            }
            if (Schema::hasColumn('drivers', 'vehicle_type_and_year')) {
                $table->dropColumn('vehicle_type_and_year');
            }
            if (Schema::hasColumn('drivers', 'vehicle_type')) {
                $table->dropColumn('vehicle_type');
            }
            if (Schema::hasColumn('drivers', 'car_or_scooter')) {
                $table->dropColumn('car_or_scooter');
            }
            if (Schema::hasColumn('drivers', 'has_worked_before')) {
                $table->dropColumn('has_worked_before');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('drivers', function (Blueprint $table) {
            $table->text('worked_with_us_before')->nullable()->after('notes');
            $table->text('vehicle_type_and_year')->nullable()->after('worked_with_us_before');
            $table->string('vehicle_type')->nullable()->after('feedback_count');
            $table->string('car_or_scooter')->nullable()->after('vehicle_type');
            $table->string('has_worked_before')->nullable()->after('vehicle_type');
        });
    }
};

