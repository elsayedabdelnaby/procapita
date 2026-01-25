<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('campaign_channels')) {
            Schema::create('campaign_channels', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->onDelete('cascade');
            $table->foreignId('campaign_type_id')->constrained()->onDelete('cascade');
            $table->string('name');
            $table->string('slug')->index();
            $table->text('description')->nullable();
            $table->string('icon')->nullable();
            $table->json('settings')->nullable(); // API keys, credentials, etc.
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->index('company_id');
            $table->index('campaign_type_id');
            $table->index('is_active');
            $table->unique(['company_id', 'campaign_type_id', 'slug']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('campaign_channels');
    }
};

