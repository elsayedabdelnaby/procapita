<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('campaign_statuses')) {
            Schema::create('campaign_statuses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->onDelete('cascade');
            $table->string('name');
            $table->string('slug')->index();
            $table->text('description')->nullable();
            $table->string('color')->nullable(); // for badge colors
            $table->boolean('is_active')->default(true);
            $table->boolean('is_final')->default(false); // completed, cancelled
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->index('company_id');
            $table->index('is_active');
            $table->unique(['company_id', 'slug']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('campaign_statuses');
    }
};

