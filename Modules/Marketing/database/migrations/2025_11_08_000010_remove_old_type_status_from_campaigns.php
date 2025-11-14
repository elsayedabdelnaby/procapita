<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('campaigns', function (Blueprint $table) {
            // Drop old type and status string columns
            $table->dropIndex(['type']);
            $table->dropIndex(['status']);
            $table->dropColumn(['type', 'status']);
        });
    }

    public function down(): void
    {
        Schema::table('campaigns', function (Blueprint $table) {
            // Restore old columns if needed to rollback
            $table->string('type')->default('email')->after('description');
            $table->string('status')->default('draft')->after('type');
            $table->index('type');
            $table->index('status');
        });
    }
};

