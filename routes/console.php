<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('telescope:prune --hours=48')->daily();

// Sync Facebook leads automatically every 5 minutes
Schedule::command('facebook:sync-leads')->everyFiveMinutes();

// Distribute drivers automatically every minute for active scenarios
Schedule::command('drivers:distribute')->everyMinute();
