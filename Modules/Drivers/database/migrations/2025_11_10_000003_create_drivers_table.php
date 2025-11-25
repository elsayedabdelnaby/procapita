<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('drivers')) {
            return;
        }

        Schema::create('drivers', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $table->string('full_name');
            $table->string('phone');
            $table->string('whatsapp_phone')->nullable();
            $table->string('email')->nullable();
            
            // Relationships - using unsignedBigInteger for conditional foreign keys
            $table->unsignedBigInteger('riding_company_id')->nullable();
            $table->unsignedBigInteger('campaign_id')->nullable();
            $table->unsignedBigInteger('lead_source_id')->nullable();
            $table->unsignedBigInteger('assigned_to')->nullable();
            $table->unsignedBigInteger('lead_status_id')->nullable();
            $table->unsignedBigInteger('current_stage_id')->nullable();
            
            // Notes
            $table->text('notes')->nullable();
            
            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index('phone');
            $table->index('company_id');
            $table->index('riding_company_id');
            $table->index('campaign_id');
            $table->index('lead_status_id');
            $table->index('assigned_to');
        });

        // Add foreign key constraints conditionally
        if (Schema::hasTable('riding_companies')) {
            Schema::table('drivers', function (Blueprint $table) {
                $table->foreign('riding_company_id')->references('id')->on('riding_companies')->nullOnDelete();
            });
        }

        if (Schema::hasTable('campaigns')) {
            Schema::table('drivers', function (Blueprint $table) {
                $table->foreign('campaign_id')->references('id')->on('campaigns')->nullOnDelete();
            });
        }

        Schema::table('drivers', function (Blueprint $table) {
            $table->foreign('lead_source_id')->references('id')->on('lead_sources')->nullOnDelete();
        });

        if (Schema::hasTable('users')) {
            Schema::table('drivers', function (Blueprint $table) {
                $table->foreign('assigned_to')->references('id')->on('users')->nullOnDelete();
            });
        }

        Schema::table('drivers', function (Blueprint $table) {
            $table->foreign('lead_status_id')->references('id')->on('lead_statuses')->nullOnDelete();
        });

        if (Schema::hasTable('riding_company_stage_templates')) {
            Schema::table('drivers', function (Blueprint $table) {
                $table->foreign('current_stage_id')->references('id')->on('riding_company_stage_templates')->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('drivers');
    }
};

