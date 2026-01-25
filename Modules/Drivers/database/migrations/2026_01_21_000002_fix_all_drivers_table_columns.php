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
            // Add car_or_scooter if it doesn't exist
            if (!Schema::hasColumn('drivers', 'car_or_scooter')) {
                $table->string('car_or_scooter')->nullable()->after('vehicle_type');
            }

            // Add duplicate if it doesn't exist
            if (!Schema::hasColumn('drivers', 'duplicate')) {
                $table->integer('duplicate')->default(0)->after('driver_num');
            }

            // Add confirm_duplicate if it doesn't exist
            if (!Schema::hasColumn('drivers', 'confirm_duplicate')) {
                $table->boolean('confirm_duplicate')->default(false)->after('duplicate');
            }

            // Add last_assigned_time if it doesn't exist
            if (!Schema::hasColumn('drivers', 'last_assigned_time')) {
                $table->dateTime('last_assigned_time')->nullable()->after('assigned_to');
            }

            // Add worked_with_us_before if it doesn't exist
            if (!Schema::hasColumn('drivers', 'worked_with_us_before')) {
                $table->text('worked_with_us_before')->nullable()->after('notes');
            }

            // Add vehicle_type_and_year if it doesn't exist
            if (!Schema::hasColumn('drivers', 'vehicle_type_and_year')) {
                $table->text('vehicle_type_and_year')->nullable()->after('worked_with_us_before');
            }

            // Add city if it doesn't exist
            if (!Schema::hasColumn('drivers', 'city')) {
                $table->string('city')->nullable()->after('vehicle_type_and_year');
            }

            // Add feedback_count if it doesn't exist
            if (!Schema::hasColumn('drivers', 'feedback_count')) {
                $table->integer('feedback_count')->default(0)->after('lead_status_comment');
            }

            // Add vehicle_type if it doesn't exist
            if (!Schema::hasColumn('drivers', 'vehicle_type')) {
                $table->string('vehicle_type')->nullable()->after('feedback_count');
            }

            // Add has_worked_before if it doesn't exist
            if (!Schema::hasColumn('drivers', 'has_worked_before')) {
                $table->string('has_worked_before')->nullable()->after('vehicle_type');
            }

            // Add governorate if it doesn't exist
            if (!Schema::hasColumn('drivers', 'governorate')) {
                $table->string('governorate')->nullable()->after('has_worked_before');
            }

            // Add team_leader_id if it doesn't exist
            if (!Schema::hasColumn('drivers', 'team_leader_id')) {
                $table->unsignedBigInteger('team_leader_id')->nullable()->after('assigned_to');
                $table->foreign('team_leader_id')->references('id')->on('users')->onDelete('set null');
                $table->index('team_leader_id');
            }

            // Add account_manager_id if it doesn't exist
            if (!Schema::hasColumn('drivers', 'account_manager_id')) {
                $table->unsignedBigInteger('account_manager_id')->nullable()->after('team_leader_id');
                $table->foreign('account_manager_id')->references('id')->on('users')->onDelete('set null');
                $table->index('account_manager_id');
            }

            // Add resigned_leads if it doesn't exist
            if (!Schema::hasColumn('drivers', 'resigned_leads')) {
                $table->text('resigned_leads')->nullable()->after('account_manager_id');
            }

            // Add assigned_time if it doesn't exist
            if (!Schema::hasColumn('drivers', 'assigned_time')) {
                $table->dateTime('assigned_time')->nullable()->after('assigned_to');
            }

            // Add last_assigned_by if it doesn't exist
            if (!Schema::hasColumn('drivers', 'last_assigned_by')) {
                $table->foreignId('last_assigned_by')->nullable()->after('assigned_time')->constrained('users')->nullOnDelete();
            }

            // Add cancel_reason if it doesn't exist
            if (!Schema::hasColumn('drivers', 'cancel_reason')) {
                $table->string('cancel_reason')->nullable()->after('notes');
            }

            // Add next_follow_up if it doesn't exist (check if it's date or datetime)
            if (!Schema::hasColumn('drivers', 'next_follow_up')) {
                $table->dateTime('next_follow_up')->nullable()->after('lead_status_comment');
            } else {
                // If it exists as date, convert it to datetime
                $columnType = Schema::getColumnType('drivers', 'next_follow_up');
                if ($columnType === 'date') {
                    // Note: MySQL doesn't support direct type change from date to datetime in all versions
                    // This is handled by a separate migration if needed
                }
            }

            // Add last_follow_up if it doesn't exist (check if it's date or datetime)
            if (!Schema::hasColumn('drivers', 'last_follow_up')) {
                $table->dateTime('last_follow_up')->nullable()->after('next_follow_up');
            } else {
                // If it exists as date, convert it to datetime
                $columnType = Schema::getColumnType('drivers', 'last_follow_up');
                if ($columnType === 'date') {
                    // Note: MySQL doesn't support direct type change from date to datetime in all versions
                    // This is handled by a separate migration if needed
                }
            }

            // Add driver_num if it doesn't exist
            if (!Schema::hasColumn('drivers', 'driver_num')) {
                $table->string('driver_num')->nullable()->after('id');
                $table->index('driver_num');
            }

            // Add lead_stage_id if it doesn't exist
            if (!Schema::hasColumn('drivers', 'lead_stage_id')) {
                $table->unsignedBigInteger('lead_stage_id')->nullable()->after('lead_status_id');
                $table->index('lead_stage_id');
                if (Schema::hasTable('lead_stages')) {
                    $table->foreign('lead_stage_id')->references('id')->on('lead_stages')->nullOnDelete();
                }
            }

            // Add lead_status_comment if it doesn't exist
            if (!Schema::hasColumn('drivers', 'lead_status_comment')) {
                $table->text('lead_status_comment')->nullable()->after('lead_status_id');
            }

            // Add next_time if it doesn't exist
            if (!Schema::hasColumn('drivers', 'next_time')) {
                $table->string('next_time', 10)->nullable()->after('next_follow_up');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // We don't drop columns in down() to avoid data loss
        // If you need to rollback, create a separate migration
    }
};
