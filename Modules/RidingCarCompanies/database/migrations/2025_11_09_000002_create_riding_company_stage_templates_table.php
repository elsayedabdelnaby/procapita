<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('riding_company_stage_templates')) {
            Schema::create('riding_company_stage_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('riding_company_id')->constrained('riding_companies')->onDelete('cascade');
            $table->string('name');
            $table->integer('order');
            $table->integer('target_value');
            $table->string('target_unit')->default('rides');
            $table->integer('duration_days');
            $table->boolean('strict_sequence')->default(false);
            $table->boolean('allow_cumulative')->default(false);
            $table->text('description')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();

            // Composite index for ordering stages within a company
            $table->index(['riding_company_id', 'order'], 'rc_stage_comp_order_idx');
            $table->index('active');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('riding_company_stage_templates');
    }
};

