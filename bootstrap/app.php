<?php

use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);

        // Exclude webhook routes from CSRF protection
        $middleware->validateCsrfTokens(except: [
            'whatsapp/webhook/*',
        ]);

        $middleware->web(append: [
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->alias([
            'company.access' => \Modules\Core\app\Middleware\CheckCompanyAccess::class,
            'module.access' => \Modules\Core\app\Middleware\CheckModuleAccess::class,
            'permission' => \Modules\Core\app\Middleware\CheckPermission::class,
            'super.admin' => \Modules\Core\app\Middleware\SuperAdminOnly::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Handle MethodNotAllowedHttpException for Inertia requests
        // When an unauthenticated PUT/POST/PATCH/DELETE request is redirected to login,
        // convert it to a GET request for Inertia compatibility
        $exceptions->render(function (\Symfony\Component\HttpKernel\Exception\MethodNotAllowedHttpException $e, \Illuminate\Http\Request $request) {
            // Check if this is an Inertia request trying to access login route
            if ($request->header('X-Inertia') && $request->path() === 'login') {
                // If it's a non-GET request to login, return 409 with X-Inertia-Location header
                // This tells Inertia to redirect to login page without causing a redirect loop
                if (in_array($request->method(), ['PUT', 'PATCH', 'DELETE', 'POST'])) {
                    return response('', 409)
                        ->header('X-Inertia-Location', route('login'));
                }
            }

            return null; // Let Laravel handle it normally
        });
    })->create();
