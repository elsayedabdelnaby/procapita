<?php

namespace Modules\Core\app\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckModuleAccess
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next, string $moduleName): Response
    {
        $user = $request->user();

        if (! $user) {
            return redirect()->route('login');
        }

        // Super admins can access all modules
        if ($user->isSuperAdmin()) {
            return $next($request);
        }

        // Check if user has access to the module
        if (! $user->canAccessModule($moduleName)) {
            abort(403, "You do not have access to the {$moduleName} module.");
        }

        return $next($request);
    }
}

