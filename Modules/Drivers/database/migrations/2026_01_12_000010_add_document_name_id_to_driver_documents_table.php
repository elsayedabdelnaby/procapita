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
                // Create column first, then add foreign key if table exists
                $table->unsignedBigInteger('document_name_id')->nullable()->after('id');
                $table->index('document_name_id');
            }
        });

        // Add foreign key constraint only if the referenced table exists
        if (Schema::hasTable('document_names') && Schema::hasColumn('driver_documents', 'document_name_id')) {
            Schema::table('driver_documents', function (Blueprint $table) {
                $table->foreign('document_name_id')
                    ->references('id')
                    ->on('document_names')
                    ->onDelete('cascade');
            });
        }
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
