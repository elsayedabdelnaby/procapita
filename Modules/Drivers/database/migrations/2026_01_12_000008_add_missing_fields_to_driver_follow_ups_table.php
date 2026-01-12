<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('driver_follow_ups', function (Blueprint $table) {
            // Add lead_status if not exists (string - نصي)
            // Note: This might already exist from migration 2025_12_02_000004
            if (! Schema::hasColumn('driver_follow_ups', 'lead_status')) {
                $table->string('lead_status')->nullable()->after('lead_stage');
            }

            // Add sales_sign_2 (اسم السيلز الثاني)
            if (! Schema::hasColumn('driver_follow_ups', 'sales_sign_2')) {
                $table->string('sales_sign_2')->nullable()->after('user_name');
            }

            // Add team_leader (حقل نصي - اسم Team Leader وقت الإنشاء)
            if (! Schema::hasColumn('driver_follow_ups', 'team_leader')) {
                $table->string('team_leader')->nullable()->after('sales_sign_2');
            }

            // Add account_manager (حقل نصي - اسم Account Manager وقت الإنشاء)
            if (! Schema::hasColumn('driver_follow_ups', 'account_manager')) {
                $table->string('account_manager')->nullable()->after('team_leader');
            }

            // Add driver_stage (Driver Stage) - بعد lead_status_comment إذا كان موجوداً، وإلا بعد lead_status
            if (! Schema::hasColumn('driver_follow_ups', 'driver_stage')) {
                if (Schema::hasColumn('driver_follow_ups', 'lead_status_comment')) {
                    $table->string('driver_stage')->nullable()->after('lead_status_comment');
                } else {
                    $table->string('driver_stage')->nullable()->after('lead_status');
                }
            }
        });
    }

    public function down(): void
    {
        Schema::table('driver_follow_ups', function (Blueprint $table) {
            if (Schema::hasColumn('driver_follow_ups', 'lead_status')) {
                $table->dropColumn('lead_status');
            }
            if (Schema::hasColumn('driver_follow_ups', 'sales_sign_2')) {
                $table->dropColumn('sales_sign_2');
            }
            if (Schema::hasColumn('driver_follow_ups', 'team_leader')) {
                $table->dropColumn('team_leader');
            }
            if (Schema::hasColumn('driver_follow_ups', 'account_manager')) {
                $table->dropColumn('account_manager');
            }
            if (Schema::hasColumn('driver_follow_ups', 'driver_stage')) {
                $table->dropColumn('driver_stage');
            }
        });
    }
};
