<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Modules\Core\app\Models\Company;
use Modules\Core\app\Models\Role;
use Modules\Drivers\app\Models\Driver;
use Modules\RidingCarCompanies\app\Models\RidingCompany;
use Modules\Drivers\app\Models\DriverFollowUp;
use Modules\Drivers\app\Models\LeadSource;
use Modules\Drivers\app\Models\LeadStage;
use Modules\Drivers\app\Models\LeadStatus;
use Modules\Marketing\app\Models\Campaign;

class ResellerUsersAndLeadsSeeder extends Seeder
{
    private const USERS_PER_COMPANY = 1;

    private const TOTAL_LEADS = 143;

    private const LEADS_PER_USER_MIN = 5;

    private const LEADS_PER_USER_MAX = 15;

    private const FOLLOW_UPS_PER_LEAD_MIN = 2;

    private const FOLLOW_UPS_PER_LEAD_MAX = 5;

    private const CITIES = [
        'Cairo', 'Giza', 'Alexandria', 'Mansoura', 'Tanta', 'Asyut', 'Sohag', 'Luxor', 'Aswan',
        'Ismailia', 'Port Said', 'Suez', 'Damietta', 'Minya', 'Beni Suef', 'Qena', 'Hurghada',
    ];

    private const GOVERNORATES = [
        'Cairo', 'Giza', 'Alexandria', 'Dakahlia', 'Gharbia', 'Asyut', 'Sohag', 'Luxor', 'Aswan',
        'Ismailia', 'Port Said', 'Suez', 'Damietta', 'Minya', 'Beni Suef', 'Qena', 'Red Sea', 'Sharqia',
    ];

    private const CANCEL_REASONS = [
        'Not interested', 'Budget', 'Wrong timing', 'Competitor', 'No response', 'Duplicate', 'Other',
    ];

    /** Default Reseller (Riding Company) names for the Resellers dropdown. */
    private const DEFAULT_RESELLER_NAMES = [
        'AB & Associates',
        'HPA',
        'procapita',
        'Redrock',
        'Target',
    ];

    private const FOLLOW_UP_NOTES = [
        'تم التواصل مع العميل - مهتم',
        'إعادة الاتصال غداً',
        'في انتظار المستندات',
        'العميل طلب وقت إضافي للتفكير',
        'تم إرسال العرض - في انتظار الرد',
        'مكالمة متابعة ناجحة',
        'العميل غير متاح - إعادة المحاولة لاحقاً',
        'تم توضيح الشروط - يبدو مرتاحاً',
        'في انتظار الموافقة النهائية',
        'مكالمة أولى - شرح الخدمة',
        'متابعة عبر الريسيلر',
        'تم التنسيق مع الريسيلر',
    ];

    public function run(): void
    {
        $companies = Company::where('is_active', true)->get();
        if ($companies->isEmpty()) {
            $this->command->warn('No active companies found. Run Core and Demo seeders first.');

            return;
        }

        $leadSources = LeadSource::where('active', true)->get();
        $leadStatuses = LeadStatus::where('active', true)->get();
        $leadStages = LeadStage::where('active', true)->get();

        if ($leadSources->isEmpty() || $leadStatuses->isEmpty()) {
            $this->command->warn('Lead sources or lead statuses missing. Run Drivers seeders first.');

            return;
        }

        if (! Schema::hasColumn('drivers', 'riding_company_id')) {
            $this->command->warn('Column drivers.riding_company_id not found. Run: php artisan migrate --path=database/migrations/2026_02_02_000001_add_riding_company_id_back_to_drivers.php so Reseller data can be stored and shown.');
        }

        $createdUsers = 0;
        $createdLeads = 0;
        $createdFollowUps = 0;
        $filledResellerCount = 0;
        $createdResellersCount = 0;

        // Ensure each company has the default Resellers dropdown options (AB & Associates, HPA, procapita, Redrock, Target)
        if (Schema::hasTable('riding_companies')) {
            foreach ($companies as $company) {
                foreach (self::DEFAULT_RESELLER_NAMES as $name) {
                    $created = RidingCompany::firstOrCreate(
                        ['company_id' => $company->id, 'name' => $name],
                        ['active' => true]
                    );
                    if ($created->wasRecentlyCreated) {
                        $createdResellersCount++;
                    }
                }
            }
        }

        // Fill Reseller (riding_company_id) for existing leads that have none
        if (Schema::hasColumn('drivers', 'riding_company_id')) {
            foreach ($companies as $company) {
                $ridingCompanies = RidingCompany::where('company_id', $company->id)->where('active', true)->get();
                if ($ridingCompanies->isEmpty()) {
                    continue;
                }
                $driversWithoutReseller = Driver::where('company_id', $company->id)->whereNull('riding_company_id')->get();
                foreach ($driversWithoutReseller as $driver) {
                    $driver->riding_company_id = $ridingCompanies->random()->id;
                    $driver->saveQuietly();
                    $filledResellerCount++;
                }
            }
        }

        $allUsers = collect();
        foreach ($companies as $company) {
            setPermissionsTeamId($company->id);

            $role = Role::firstOrCreate(
                ['name' => 'Sales Rep', 'team_id' => $company->id],
                [
                    'guard_name' => 'web',
                    'parent_id' => null,
                    'module_name' => 'drivers',
                    'entity_name' => 'drivers',
                ]
            );

            $users = $this->ensureUsersForCompany($company, $role);
            $createdUsers += $users->count();
            $allUsers = $allUsers->merge($users);
        }

        $leadCountsPerUser = $this->distributeLeadCounts($allUsers->count(), self::TOTAL_LEADS);

        foreach ($allUsers->values() as $index => $user) {
            $company = $user->company_id ? Company::find($user->company_id) : $companies->first();
            if (! $company) {
                continue;
            }
            $campaigns = Campaign::where('company_id', $company->id)->get();
            $ridingCompanies = RidingCompany::where('company_id', $company->id)->where('active', true)->get();
            $leadsCount = $leadCountsPerUser[$index] ?? self::LEADS_PER_USER_MIN;

            for ($i = 0; $i < $leadsCount; $i++) {
                $driver = $this->createLead($company, $user, $campaigns, $leadSources, $leadStatuses, $leadStages, $ridingCompanies);
                if ($driver) {
                    $createdLeads++;
                    $followUpCount = random_int(self::FOLLOW_UPS_PER_LEAD_MIN, self::FOLLOW_UPS_PER_LEAD_MAX);
                    $createdFollowUps += $this->createFollowUpsForLead($driver, $user, $leadStatuses, $leadStages, $followUpCount);
                }
            }
        }

        $msg = "Reseller users & leads seeded: {$createdUsers} users (1 per company), {$createdLeads} leads (target ".self::TOTAL_LEADS."), {$createdFollowUps} follow-ups.";
        if ($createdResellersCount > 0) {
            $msg .= " Created {$createdResellersCount} default Resellers for companies that had none.";
        }
        if ($filledResellerCount > 0) {
            $msg .= " Filled Reseller for {$filledResellerCount} existing leads.";
        }
        $this->command->info($msg);
    }

    /**
     * Distribute exactly $total leads across $userCount users, each between LEADS_PER_USER_MIN and LEADS_PER_USER_MAX when possible.
     *
     * @return array<int, int>
     */
    private function distributeLeadCounts(int $userCount, int $total): array
    {
        if ($userCount <= 0) {
            return [];
        }
        $minP = self::LEADS_PER_USER_MIN;
        $maxP = self::LEADS_PER_USER_MAX;
        $counts = array_fill(0, $userCount, $minP);
        $remaining = $total - ($userCount * $minP);

        if ($remaining < 0) {
            $counts = array_fill(0, $userCount, 1);
            $remaining = $total - $userCount;
            $addPerUser = $maxP - 1;
        } else {
            $addPerUser = $maxP - $minP;
        }

        for ($i = 0; $i < $userCount && $remaining > 0; $i++) {
            $add = min($remaining, $addPerUser);
            $counts[$i] += $add;
            $remaining -= $add;
        }
        while ($remaining > 0) {
            for ($i = 0; $i < $userCount && $remaining > 0; $i++) {
                $counts[$i]++;
                $remaining--;
            }
        }
        return $counts;
    }

    /**
     * @return \Illuminate\Support\Collection<int, User>
     */
    private function ensureUsersForCompany(Company $company, Role $role): \Illuminate\Support\Collection
    {
        $slug = \Illuminate\Support\Str::slug($company->name);
        $users = collect();

        for ($n = 1; $n <= self::USERS_PER_COMPANY; $n++) {
            $email = "user{$n}@{$slug}.local";
            $user = User::firstOrCreate(
                ['email' => $email],
                [
                    'name' => $company->name.' User '.$n,
                    'password' => Hash::make('password'),
                    'company_id' => $company->id,
                    'is_super_admin' => false,
                    'is_company_admin' => false,
                    'is_active' => true,
                ]
            );

            setPermissionsTeamId($company->id);
            if (! $user->hasRole($role->name, 'web')) {
                $user->assignRole($role);
            }
            $users->push($user);
        }

        return $users;
    }

    /**
     * @param  \Illuminate\Support\Collection<int, RidingCompany>  $ridingCompanies
     */
    private function createLead(
        Company $company,
        User $user,
        $campaigns,
        $leadSources,
        $leadStatuses,
        $leadStages,
        $ridingCompanies
    ): ?Driver {
        $campaign = $campaigns->isNotEmpty() ? $campaigns->random() : null;
        $leadSource = $leadSources->random();
        $leadStatus = $leadStatuses->random();
        $leadStage = $leadStages->isNotEmpty() ? $leadStages->random() : null;
        $ridingCompany = $ridingCompanies->isNotEmpty() ? $ridingCompanies->random() : null;

        $phone = '01'.fake()->numberBetween(0, 5).fake()->numberBetween(2000000, 5999999);
        $whatsapp = '01'.fake()->numberBetween(0, 5).fake()->numberBetween(2000000, 5999999);

        $resellerName = $ridingCompany?->name ?? null;
        $notesWithReseller = fake()->optional(0.7)->paragraph(1);
        if ($notesWithReseller && $resellerName) {
            $notesWithReseller .= ' [Reseller: '.$resellerName.']';
        }
        $commentWithReseller = fake()->optional(0.6)->sentence();
        if ($commentWithReseller && $resellerName && fake()->boolean(0.5)) {
            $commentWithReseller .= ' Via '.$resellerName.'.';
        }
        $cancelReason = fake()->optional(0.15)->randomElement(self::CANCEL_REASONS);
        if ($cancelReason && $resellerName && fake()->boolean(0.3)) {
            $cancelReason .= ' ('.$resellerName.')';
        }

        $data = [
            'company_id' => $company->id,
            'full_name' => fake()->name(),
            'phone' => $phone,
            'whatsapp_phone' => $whatsapp,
            'email' => 'lead_'.uniqid().'_'.fake()->numberBetween(1000, 9999).'@example.com',
            'campaign_id' => $campaign?->id,
            'lead_source_id' => $leadSource->id,
            'lead_status_id' => $leadStatus->id,
            'assigned_to' => $user->id,
            'lead_status_comment' => $commentWithReseller,
            'next_follow_up' => fake()->optional(0.6)->dateTimeBetween('now', '+2 weeks'),
            'notes' => $notesWithReseller,
            'city' => fake()->optional(0.6)->randomElement(self::CITIES),
            'governorate' => fake()->optional(0.6)->randomElement(self::GOVERNORATES),
            'cancel_reason' => $cancelReason,
        ];

        if (Schema::hasColumn('drivers', 'riding_company_id') && $ridingCompany) {
            $data['riding_company_id'] = $ridingCompany->id;
        }

        if ($leadStage) {
            $data['lead_stage_id'] = $leadStage->id;
        }

        try {
            return Driver::create($data);
        } catch (\Exception $e) {
            $this->command->warn('Lead create failed: '.$e->getMessage());

            return null;
        }
    }

    private function createFollowUpsForLead(Driver $driver, User $user, $leadStatuses, $leadStages, int $count): int
    {
        $created = 0;
        $baseTime = $driver->created_at ?? now();
        $resellerSuffix = $driver->ridingCompany ? ' [Reseller: '.$driver->ridingCompany->name.']' : '';

        for ($i = 0; $i < $count; $i++) {
            $leadStatus = $leadStatuses->random();
            $leadStage = $leadStages->isNotEmpty() ? $leadStages->random() : null;
            $createdTime = fake()->dateTimeBetween($baseTime, 'now');
            $note = self::FOLLOW_UP_NOTES[array_rand(self::FOLLOW_UP_NOTES)];
            if ($resellerSuffix && fake()->boolean(0.4)) {
                $note .= $resellerSuffix;
            }

            try {
                DriverFollowUp::create([
                    'driver_id' => $driver->id,
                    'assigned_to' => $user->id,
                    'user_name' => $user->name,
                    'sales_sign_2' => $user->name,
                    'team_leader' => null,
                    'account_manager' => null,
                    'created_time' => $createdTime,
                    'lead_stage' => $leadStage?->name,
                    'lead_status' => $leadStatus->name,
                    'lead_status_comment' => fake()->optional(0.5)->sentence(),
                    'driver_stage' => null,
                    'notes' => $note,
                    'driver_num' => $driver->driver_num ?? (string) $driver->id,
                ]);
                $created++;
            } catch (\Exception $e) {
                // skip
            }
        }

        return $created;
    }
}
