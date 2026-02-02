<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('lead_stages')) {
            return;
        }

        Schema::create('lead_stages', function (Blueprint $table) {
            $table->id();
            
            // Create column first, then add foreign key if table exists
            $table->unsignedBigInteger('riding_company_id');
            
            $table->string('name');
            $table->string('slug');
            $table->text('description')->nullable();
            $table->string('color')->nullable(); // For UI display (e.g., 'green', 'red', 'yellow')
            $table->integer('order')->default(0); // For ordering in UI
            $table->boolean('active')->default(true);
            $table->boolean('requires_all_documents_approved')->default(false); // Checkbox for document requirement
            $table->timestamps();
            $table->softDeletes();

            $table->index('active');
            $table->index('order');
            $table->index('riding_company_id');
            $table->index('requires_all_documents_approved');
            $table->unique(['riding_company_id', 'slug']);
        });

        // Add foreign key constraint only if the referenced table exists
        if (Schema::hasTable('riding_companies')) {
            Schema::table('lead_stages', function (Blueprint $table) {
                $table->foreign('riding_company_id')
                    ->references('id')
                    ->on('riding_companies')
                    ->onDelete('cascade');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('lead_stages');
    }
};

