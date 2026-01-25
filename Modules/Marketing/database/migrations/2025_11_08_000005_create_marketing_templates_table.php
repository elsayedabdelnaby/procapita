<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('marketing_templates')) {
            Schema::create('marketing_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->onDelete('cascade');
            $table->string('name');
            $table->string('type')->default('email'); // email, sms, push
            $table->string('subject')->nullable();
            $table->text('content');
            $table->json('variables')->nullable(); // {name}, {email}, {company}
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('company_id');
            $table->index('type');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('marketing_templates');
    }
};

