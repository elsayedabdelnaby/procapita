<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // First, update any NULL mobile1 values to empty string
        DB::table('users')->whereNull('mobile1')->update(['mobile1' => '']);
        
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'mobile1')) {
                $table->string('mobile1')->default('')->nullable(false)->change();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'mobile1')) {
                $table->string('mobile1')->nullable()->change();
            }
        });
    }
};

