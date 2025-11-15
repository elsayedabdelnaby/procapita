<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('campaigns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->onDelete('cascade');
            $table->string('name');
            $table->string('slug')->index();
            $table->text('description')->nullable();
            
            // Budget & Financial Tracking
            $table->decimal('expected_budget', 15, 2)->default(0);
            $table->decimal('actual_spend', 15, 2)->default(0);
            $table->decimal('expected_roi', 10, 2)->default(0); // Expected ROI percentage
            $table->decimal('actual_roi', 10, 2)->default(0); // Actual ROI percentage
            
            // Lead & Conversion Tracking
            $table->integer('expected_leads')->default(0);
            $table->integer('actual_leads')->default(0);
            $table->integer('expected_conversions')->default(0);
            $table->integer('actual_conversions')->default(0);
            $table->decimal('expected_conversion_rate', 5, 2)->default(0); // Percentage
            $table->decimal('actual_conversion_rate', 5, 2)->default(0); // Percentage
            
            // Reach & Engagement Tracking
            $table->integer('expected_reach')->default(0);
            $table->integer('actual_reach')->default(0);
            $table->integer('expected_impressions')->default(0);
            $table->integer('actual_impressions')->default(0);
            $table->integer('expected_clicks')->default(0);
            $table->integer('actual_clicks')->default(0);
            $table->decimal('expected_ctr', 5, 2)->default(0); // Click-through rate
            $table->decimal('actual_ctr', 5, 2)->default(0);
            
            // Revenue Tracking
            $table->decimal('expected_revenue', 15, 2)->default(0);
            $table->decimal('actual_revenue', 15, 2)->default(0);
            
            // Dates
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            
            // Assignment
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            
            $table->timestamps();
            $table->softDeletes();

            $table->index('company_id');
            $table->index(['start_date', 'end_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('campaigns');
    }
};

