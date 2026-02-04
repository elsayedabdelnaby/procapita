<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('driver_stages')) {
            return;
        }

        Schema::create('driver_stages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('driver_id')->constrained('drivers')->cascadeOnDelete();
            
            // Create column first, then add foreign key if table exists
            $table->unsignedBigInteger('stage_template_id');
            
            $table->integer('stage_order');
            $table->enum('status', ['pending', 'in_progress', 'completed', 'rejected'])->default('pending');
            $table->timestamp('completed_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            // Indexes
            $table->index('driver_id');
            $table->index('stage_template_id');
            $table->index('status');
            $table->index(['driver_id', 'stage_order'], 'drv_stg_drv_order_idx');
        });

        // Add foreign key constraint only if the referenced table exists
        if (Schema::hasTable('riding_company_stage_templates')) {
            Schema::table('driver_stages', function (Blueprint $table) {
                $table->foreign('stage_template_id')
                    ->references('id')
                    ->on('riding_company_stage_templates')
                    ->onDelete('cascade');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('driver_stages');
    }
};

