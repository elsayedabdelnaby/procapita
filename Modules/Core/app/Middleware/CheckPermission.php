<?php

namespace Modules\Core\app\Middleware;

use Closure;
use Illuminate\Http\Request;
use Spatie\Permission\Exceptions\PermissionDoesNotExist;
use Symfony\Component\HttpFoundation\Response;

class CheckPermission
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        $user = $request->user();

        if (! $user) {
            return redirect()->route('login');
        }

        // Super admins bypass all permission checks
        if ($user->isSuperAdmin()) {
            return $next($request);
        }

        // Check if user has the required permission
        try {
            if (! $user->hasPermissionTo($permission)) {
                abort(403, 'You do not have the required permission.');
            }
        } catch (PermissionDoesNotExist $e) {
            // Permission doesn't exist in database
            // This could happen if permissions weren't seeded
            abort(403, "Permission '{$permission}' does not exist. Please run database seeders.");
        }

        return $next($request);
    }
}

