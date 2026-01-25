<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('riding_company_document_requirements')) {
            Schema::create('riding_company_document_requirements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('riding_company_id')->constrained('riding_companies')->onDelete('cascade');
            $table->string('name');
            $table->string('type'); // file / text / checkbox
            $table->boolean('required')->default(false);
            $table->text('instructions')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();

            // Indexes
            $table->index(['riding_company_id', 'type'], 'rc_doc_req_comp_type_idx');
            $table->index('active');
            $table->index('required');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('riding_company_document_requirements');
    }
};

