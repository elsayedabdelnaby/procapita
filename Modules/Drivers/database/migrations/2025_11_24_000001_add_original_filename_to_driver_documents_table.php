<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('driver_documents', function (Blueprint $table) {
            if (! Schema::hasColumn('driver_documents', 'original_filename')) {
                $table->string('original_filename')->nullable()->after('uploaded_path');
            }
        });
    }

    public function down(): void
    {
        Schema::table('driver_documents', function (Blueprint $table) {
            $table->dropColumn('original_filename');
        });
    }
};

