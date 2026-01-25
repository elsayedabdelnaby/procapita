<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('riding_company_integration_settings')) {
            Schema::create('riding_company_integration_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('riding_company_id')->constrained('riding_companies')->onDelete('cascade');
            $table->string('type'); // webhook | api | csv
            $table->json('config')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();

            // Indexes
            $table->index(['riding_company_id', 'type'], 'rc_int_set_comp_type_idx');
            $table->index('active');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('riding_company_integration_settings');
    }
};