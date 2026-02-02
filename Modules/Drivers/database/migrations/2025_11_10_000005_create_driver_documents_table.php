<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('driver_documents')) {
            return;
        }

        Schema::create('driver_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('driver_id')->constrained('drivers')->cascadeOnDelete();
            
            // Create column first, then add foreign key if table exists
            $table->unsignedBigInteger('document_template_id');
            
            $table->string('uploaded_path')->nullable();
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->foreignId('reviewer_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();

            // Indexes
            $table->index('driver_id');
            $table->index('document_template_id');
            $table->index('status');
            $table->index('reviewer_id');
        });

        // Add foreign key constraint only if the referenced table exists
        if (Schema::hasTable('riding_company_document_requirements')) {
            Schema::table('driver_documents', function (Blueprint $table) {
                $table->foreign('document_template_id')
                    ->references('id')
                    ->on('riding_company_document_requirements')
                    ->onDelete('cascade');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('driver_documents');
    }
};

