import '../css/app.css';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { initializeTheme } from './hooks/use-appearance';
import { configureEcho } from '@laravel/echo-react';

configureEcho({
    broadcaster: 'reverb',
});

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    resolve: (name) =>
        resolvePageComponent(
            `./pages/${name}.tsx`,
            import.meta.glob('./pages/**/*.tsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(
            <StrictMode>
                <App {...props} />
            </StrictMode>,
        );
    },
    progress: {
        color: '#4B5563',
    },
});

// This will set light / dark mode on load...
initializeTheme();

// Suppress uncaught promise rejections for aborted/cancelled requests (Inertia or axios when navigating away)
function isAbortError(event: PromiseRejectionEvent): boolean {
    const e = event?.reason;
    if (!e || typeof e !== 'object') return false;
    const msg = String(e?.message ?? '');
    const code = e?.code;
    const name = e?.name;
    if (code === 'ECONNABORTED' || name === 'CanceledError') return true;
    if (msg.includes('aborted') || msg.includes('canceled') || msg.includes('cancelled')) return true;
    if (name === 'AxiosError' && (code === 'ECONNABORTED' || msg.includes('aborted'))) return true;
    return false;
}
window.addEventListener('unhandledrejection', (event) => {
    if (isAbortError(event)) {
        event.preventDefault();
        event.stopPropagation();
    }
});
