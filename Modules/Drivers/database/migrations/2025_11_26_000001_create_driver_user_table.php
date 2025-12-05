<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('driver_user')) {
            return;
        }

        Schema::create('driver_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('driver_id')->constrained('drivers')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            // Ensure unique combination
            $table->unique(['driver_id', 'user_id']);
            
            // Indexes for better performance
            $table->index('driver_id');
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('driver_user');
    }
};


