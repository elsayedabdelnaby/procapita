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
        Schema::table('permissions', function (Blueprint $table) {
            $table->string('module_name')->nullable()->after('guard_name');
            $table->string('entity_name')->nullable()->after('module_name');
            $table->string('action')->nullable()->after('entity_name');

            $table->index('module_name');
            $table->index('entity_name');
            $table->index('action');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('permissions', function (Blueprint $table) {
            $table->dropIndex(['module_name']);
            $table->dropIndex(['entity_name']);
            $table->dropIndex(['action']);
            $table->dropColumn(['module_name', 'entity_name', 'action']);
        });
    }
};

