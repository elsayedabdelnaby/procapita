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
        Schema::create('reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('report_folder_id')->constrained('report_folders')->cascadeOnDelete();
            $table->string('report_type'); // pivot | charts
            $table->string('report_name');
            $table->string('primary_module');
            $table->json('related_modules')->nullable();
            $table->text('description')->nullable();
            $table->json('share_report')->nullable(); // ['all'] or [user_id, ...]
            $table->json('settings')->nullable(); // pivot: module, x_axis, y_axis, values_count_field; charts: chart_type, x_axis, y_axis, legend
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('company_id')->nullable()->constrained('companies')->nullOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reports');
    }
};
