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
        if (!Schema::hasTable('whatsapp_messages')) {
            Schema::create('whatsapp_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('whatsapp_session_id')->constrained('whatsapp_sessions')->onDelete('cascade');
            $table->foreignId('driver_id')->nullable()->constrained('drivers')->onDelete('set null');
            $table->string('from_number'); // Phone number of sender
            $table->string('to_number'); // Phone number of recipient
            $table->text('message_id')->nullable(); // WhatsApp message ID
            $table->text('body')->nullable(); // Message content
            $table->enum('type', ['text', 'image', 'video', 'audio', 'document', 'location', 'contact'])->default('text');
            $table->enum('direction', ['incoming', 'outgoing'])->default('incoming');
            $table->string('media_url')->nullable(); // For media messages
            $table->string('media_mime_type')->nullable();
            $table->string('media_filename')->nullable();
            $table->timestamp('timestamp')->nullable(); // WhatsApp timestamp
            $table->boolean('is_read')->default(false);
            $table->json('metadata')->nullable(); // Additional data
            $table->timestamps();
            
            $table->index(['whatsapp_session_id', 'driver_id']);
            $table->index(['from_number', 'to_number']);
            $table->index('timestamp');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('whatsapp_messages');
    }
};

