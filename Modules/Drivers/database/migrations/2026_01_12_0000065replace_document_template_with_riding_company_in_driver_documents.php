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
        Schema::table('driver_documents', function (Blueprint $table) {
            // Drop foreign key and column for document_template_id
            $table->dropForeign(['document_template_id']);
            $table->dropIndex(['document_template_id']);
            $table->dropColumn('document_template_id');

            // Add riding_company_id
            $table->foreignId('riding_company_id')->nullable()->after('driver_id')->constrained('riding_companies')->onDelete('cascade');
            $table->index('riding_company_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('driver_documents', function (Blueprint $table) {
            // Drop riding_company_id
            $table->dropForeign(['riding_company_id']);
            $table->dropIndex(['riding_company_id']);
            $table->dropColumn('riding_company_id');

            // Restore document_template_id
            $table->foreignId('document_template_id')->after('driver_id')->constrained('riding_company_document_requirements')->cascadeOnDelete();
            $table->index('document_template_id');
        });
    }
};
