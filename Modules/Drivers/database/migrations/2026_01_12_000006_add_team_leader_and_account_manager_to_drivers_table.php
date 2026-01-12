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
        Schema::table('drivers', function (Blueprint $table) {
            $table->unsignedBigInteger('team_leader_id')->nullable()->after('assigned_to');
            $table->unsignedBigInteger('account_manager_id')->nullable()->after('team_leader_id');

            $table->foreign('team_leader_id')->references('id')->on('users')->onDelete('set null');
            $table->foreign('account_manager_id')->references('id')->on('users')->onDelete('set null');

            $table->index('team_leader_id');
            $table->index('account_manager_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('drivers', function (Blueprint $table) {
            $table->dropForeign(['team_leader_id']);
            $table->dropForeign(['account_manager_id']);
            $table->dropIndex(['team_leader_id']);
            $table->dropIndex(['account_manager_id']);
            $table->dropColumn(['team_leader_id', 'account_manager_id']);
        });
    }
};
