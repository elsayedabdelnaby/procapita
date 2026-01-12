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
            if (! Schema::hasColumn('driver_documents', 'document_name_id')) {
                $table->foreignId('document_name_id')->nullable()->after('id')->constrained('document_names')->onDelete('cascade');
                $table->index('document_name_id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('driver_documents', function (Blueprint $table) {
            if (Schema::hasColumn('driver_documents', 'document_name_id')) {
                $table->dropForeign(['document_name_id']);
                $table->dropIndex(['document_name_id']);
                $table->dropColumn('document_name_id');
            }
        });
    }
};
