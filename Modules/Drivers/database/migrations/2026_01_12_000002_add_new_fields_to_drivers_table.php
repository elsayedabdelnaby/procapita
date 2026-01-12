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
            $table->integer('feedback_count')->default(0)->after('lead_status_comment');
            $table->string('vehicle_type')->nullable()->after('feedback_count');
            $table->string('has_worked_before')->nullable()->after('vehicle_type');
            $table->string('governorate')->nullable()->after('has_worked_before');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('drivers', function (Blueprint $table) {
            $table->dropColumn(['feedback_count', 'vehicle_type', 'has_worked_before', 'governorate']);
        });
    }
};
