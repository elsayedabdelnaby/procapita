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
        if (Schema::hasTable('document_names')) {
            return;
        }

        Schema::create('document_names', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->json('riding_company_ids'); // Array of riding company IDs
            $table->string('type')->default('file'); // file, pdf, text
            $table->boolean('required')->default(false);
            $table->text('notes')->nullable();
            $table->string('status')->default('pending'); // pending, approved, rejected
            $table->boolean('active')->default(true);
            $table->timestamps();

            // Indexes
            $table->index('name');
            $table->index('active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('document_names');
    }
};
