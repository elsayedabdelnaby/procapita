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
        if (!Schema::hasTable('whatsapp_sessions')) {
            Schema::create('whatsapp_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->onDelete('cascade');
            $table->string('phone_number')->nullable();
            $table->string('session_id')->unique();
            $table->enum('status', ['disconnected', 'connecting', 'qr_code', 'authenticated', 'ready'])->default('disconnected');
            $table->text('qr_code')->nullable();
            $table->timestamp('qr_code_expires_at')->nullable();
            $table->text('session_data')->nullable(); // Store session data
            $table->timestamp('last_connected_at')->nullable();
            $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('whatsapp_sessions');
    }
};

