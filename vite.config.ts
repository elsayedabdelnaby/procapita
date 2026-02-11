import { wayfinder } from '@laravel/vite-plugin-wayfinder';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { defineConfig, Plugin } from 'vite';

// Create a wrapper plugin that handles wayfinder errors gracefully
// Skip wayfinder by default - it's optional and can cause build failures
function wayfinderSafe(): Plugin | null {
    // Skip wayfinder by default to avoid build failures
    // Only enable if explicitly requested via ENABLE_WAYFINDER env var
    if (process.env.ENABLE_WAYFINDER !== 'true') {
        return null;
    }

    const wayfinderPlugin = wayfinder({
        formVariants: true,
    });

    // Wrap the buildStart hook to catch errors
    return {
        ...wayfinderPlugin,
        name: 'wayfinder-safe',
        buildStart: async function(this: any, ...args: any[]) {
            try {
                if (wayfinderPlugin.buildStart) {
                    await wayfinderPlugin.buildStart.apply(this, args);
                }
            } catch (error: any) {
                console.warn('Wayfinder generation failed, continuing build:', error.message);
                // Continue build without wayfinder
            }
        },
    } as Plugin;
}

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            ssr: 'resources/js/ssr.tsx',
            refresh: true,
        }),
        react({
            babel: {
                plugins: ['babel-plugin-react-compiler'],
            },
        }),
        tailwindcss(),
        wayfinderSafe(),
    ].filter(Boolean) as Plugin[],
    esbuild: {
        jsx: 'automatic',
    },
    server: {
        host: '0.0.0.0',
        port: 5173,
        strictPort: true,
        hmr: {
            host: 'localhost',
        },
    },
});
