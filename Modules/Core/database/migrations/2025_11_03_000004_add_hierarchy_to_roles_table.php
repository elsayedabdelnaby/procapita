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
        Schema::table('roles', function (Blueprint $table) {
            $table->unsignedBigInteger('parent_id')->nullable()->after('guard_name');
            $table->string('hierarchy_path')->nullable()->after('parent_id');
            $table->integer('hierarchy_level')->default(1)->after('hierarchy_path');
            $table->boolean('is_root')->default(false)->after('hierarchy_level');
            $table->string('module_name')->nullable()->after('is_root');
            $table->string('entity_name')->nullable()->after('module_name');

            $table->foreign('parent_id')->references('id')->on('roles')->onDelete('cascade');
            $table->index('parent_id');
            $table->index('hierarchy_path');
            $table->index('hierarchy_level');
            $table->index('is_root');
            $table->index('module_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('roles', function (Blueprint $table) {
            $table->dropForeign(['parent_id']);
            $table->dropIndex(['parent_id']);
            $table->dropIndex(['hierarchy_path']);
            $table->dropIndex(['hierarchy_level']);
            $table->dropIndex(['is_root']);
            $table->dropIndex(['module_name']);
            $table->dropColumn(['parent_id', 'hierarchy_path', 'hierarchy_level', 'is_root', 'module_name', 'entity_name']);
        });
    }
};

