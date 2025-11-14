<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('campaign_metrics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->onDelete('cascade');
            $table->foreignId('campaign_id')->constrained()->onDelete('cascade');
            $table->date('metric_date');
            
            // Daily metrics
            $table->integer('impressions')->default(0);
            $table->integer('clicks')->default(0);
            $table->integer('conversions')->default(0);
            $table->integer('leads_generated')->default(0);
            $table->decimal('spend', 15, 2)->default(0);
            $table->decimal('revenue', 15, 2)->default(0);
            $table->decimal('ctr', 5, 2)->default(0); // Click-through rate
            $table->decimal('cpc', 10, 2)->default(0); // Cost per click
            $table->decimal('cpl', 10, 2)->default(0); // Cost per lead
            $table->decimal('roas', 10, 2)->default(0); // Return on ad spend
            
            $table->timestamps();

            $table->unique(['campaign_id', 'metric_date']);
            $table->index('company_id');
            $table->index('metric_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('campaign_metrics');
    }
};

