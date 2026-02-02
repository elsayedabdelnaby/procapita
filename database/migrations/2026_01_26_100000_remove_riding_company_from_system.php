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
        $this->dropRidingCompanyFromUsers();
        $this->dropRidingCompanyFromRoles();
        $this->dropRidingCompanyFromDrivers();
        $this->dropRidingCompanyFromLeadStages();
        $this->dropRidingCompanyFromDriverStages();
        $this->dropRidingCompanyFromDocumentNames();
        $this->dropRidingCompanyFromCampaigns();
        $this->dropRidingCompanyFromCampaignTypes();
        $this->dropRidingCompanyFromCampaignStatuses();
        $this->dropRidingCompanyFromCampaignChannels();
        $this->dropRidingCompanyFromWhatsappSessions();
        $this->dropRidingCompanyFromDriverDocuments();
        $this->dropRidingCompanyFromDriverFollowUps();
    }

    private function dropRidingCompanyFromDriverFollowUps(): void
    {
        if (! Schema::hasTable('driver_follow_ups') || ! Schema::hasColumn('driver_follow_ups', 'riding_company')) {
            return;
        }
        Schema::table('driver_follow_ups', function (Blueprint $table) {
            $table->dropColumn('riding_company');
        });
    }

    private function dropRidingCompanyFromUsers(): void
    {
        if (! Schema::hasTable('users') || ! Schema::hasColumn('users', 'riding_company_id')) {
            return;
        }
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['riding_company_id']);
        });
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['riding_company_id']);
            $table->dropColumn('riding_company_id');
        });
    }

    private function dropRidingCompanyFromRoles(): void
    {
        $rolesTable = config('permission.table_names.roles', 'roles');
        if (! Schema::hasTable($rolesTable) || ! Schema::hasColumn($rolesTable, 'riding_company_id')) {
            return;
        }
        Schema::table($rolesTable, function (Blueprint $table) {
            $table->dropForeign(['riding_company_id']);
            $table->dropIndex(['riding_company_id']);
            $table->dropColumn('riding_company_id');
        });
    }

    private function dropRidingCompanyFromDrivers(): void
    {
        if (! Schema::hasTable('drivers')) {
            return;
        }
        Schema::table('drivers', function (Blueprint $table) {
            if (Schema::hasColumn('drivers', 'riding_company_id')) {
                $table->dropForeign(['riding_company_id']);
                $table->dropIndex(['riding_company_id']);
                $table->dropColumn('riding_company_id');
            }
        });
    }

    private function dropRidingCompanyFromLeadStages(): void
    {
        if (! Schema::hasTable('lead_stages')) {
            return;
        }
        Schema::table('lead_stages', function (Blueprint $table) {
            if (Schema::hasColumn('lead_stages', 'riding_company_ids')) {
                $table->dropColumn('riding_company_ids');
            }
        });
    }

    private function dropRidingCompanyFromDriverStages(): void
    {
        if (! Schema::hasTable('driver_stages')) {
            return;
        }
        Schema::table('driver_stages', function (Blueprint $table) {
            if (Schema::hasColumn('driver_stages', 'riding_company_ids')) {
                $table->dropColumn('riding_company_ids');
            }
        });
    }

    private function dropRidingCompanyFromDocumentNames(): void
    {
        if (! Schema::hasTable('document_names')) {
            return;
        }
        Schema::table('document_names', function (Blueprint $table) {
            if (Schema::hasColumn('document_names', 'riding_company_ids')) {
                $table->dropColumn('riding_company_ids');
            }
        });
    }

    private function dropRidingCompanyFromCampaigns(): void
    {
        if (! Schema::hasTable('campaigns') || ! Schema::hasColumn('campaigns', 'riding_company_id')) {
            return;
        }
        Schema::table('campaigns', function (Blueprint $table) {
            $table->dropForeign(['riding_company_id']);
            $table->dropColumn('riding_company_id');
        });
    }

    private function dropRidingCompanyFromCampaignTypes(): void
    {
        if (! Schema::hasTable('campaign_types')) {
            return;
        }

        $indexName = 'campaign_types_riding_company_id_name_unique';
        try {
            $indexes = DB::select("SHOW INDEXES FROM campaign_types WHERE Key_name = ?", [$indexName]);
            if (! empty($indexes)) {
                DB::statement("ALTER TABLE campaign_types DROP INDEX `{$indexName}`");
            }
        } catch (\Throwable $e) {
            // Index might not exist or have different name
        }

        if (! Schema::hasColumn('campaign_types', 'riding_company_id')) {
            return;
        }

        Schema::table('campaign_types', function (Blueprint $table) {
            $table->dropForeign(['riding_company_id']);
            $table->dropColumn('riding_company_id');
        });

        try {
            $hasUnique = DB::selectOne("
                SELECT 1 FROM information_schema.statistics
                WHERE table_schema = DATABASE() AND table_name = 'campaign_types'
                AND index_name = 'campaign_types_company_id_name_unique'
            ");
            if (! $hasUnique) {
                Schema::table('campaign_types', function (Blueprint $table) {
                    $table->unique(['company_id', 'name']);
                });
            }
        } catch (\Throwable $e) {
            // Ignore if unique already exists
        }
    }

    private function dropRidingCompanyFromCampaignStatuses(): void
    {
        if (! Schema::hasTable('campaign_statuses') || ! Schema::hasColumn('campaign_statuses', 'riding_company_id')) {
            return;
        }
        Schema::table('campaign_statuses', function (Blueprint $table) {
            $table->dropForeign(['riding_company_id']);
            $table->dropColumn('riding_company_id');
        });
    }

    private function dropRidingCompanyFromCampaignChannels(): void
    {
        if (! Schema::hasTable('campaign_channels') || ! Schema::hasColumn('campaign_channels', 'riding_company_id')) {
            return;
        }
        Schema::table('campaign_channels', function (Blueprint $table) {
            $table->dropForeign(['riding_company_id']);
            $table->dropColumn('riding_company_id');
        });
    }

    private function dropRidingCompanyFromWhatsappSessions(): void
    {
        if (! Schema::hasTable('whatsapp_sessions') || ! Schema::hasColumn('whatsapp_sessions', 'riding_company_id')) {
            return;
        }
        Schema::table('whatsapp_sessions', function (Blueprint $table) {
            $table->dropForeign(['riding_company_id']);
            $table->dropColumn('riding_company_id');
        });
    }

    private function dropRidingCompanyFromDriverDocuments(): void
    {
        if (! Schema::hasTable('driver_documents')) {
            return;
        }
        if (Schema::hasColumn('driver_documents', 'riding_company_id')) {
            Schema::table('driver_documents', function (Blueprint $table) {
                $table->dropForeign(['riding_company_id']);
                $table->dropColumn('riding_company_id');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Not restoring - riding_company is being removed from system
    }
};
