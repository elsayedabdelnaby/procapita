<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('riding_company_integrations')) {
            Schema::create('riding_company_integrations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('riding_company_id')->constrained('riding_companies')->onDelete('cascade');
            $table->string('type'); // webhook | api | csv
            $table->json('config');
            $table->boolean('active')->default(true);
            $table->timestamps();

            // Indexes
            $table->index(['riding_company_id', 'type'], 'rc_int_comp_type_idx');
            $table->index('active');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('riding_company_integrations');
    }
};

