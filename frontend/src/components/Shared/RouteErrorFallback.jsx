import { useEffect } from 'react';
import { useRouteError } from 'react-router';
import { Sentry } from '@/lib/sentry';

// react-router-dom's data router (createBrowserRouter) has its own built-in
// error boundary per route and swallows render errors before they can ever
// reach a wrapping <ErrorBoundary> around <RouterProvider> — confirmed live
// 2026-07-28 (a component that throws during render was caught by React
// Router's generic "Unexpected Application Error!" screen, not our
// ErrorBoundary). errorElement is the correct mechanism for a data router;
// see PHASE3_SECURITY_SCOPE.md Finding 7.
const RouteErrorFallback = () => {
  const error = useRouteError();

  // Side effect belongs in an effect, not the render body.
  useEffect(() => {
    console.error('Uncaught route error:', error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex-center flex-col w-screen h-screen gap-4 text-light-1">
      <p className="body-bold md:h3-bold">Something went wrong.</p>
      <button
        className="shad-button_primary px-5 py-2 rounded-lg"
        onClick={() => window.location.assign('/')}
      >
        Reload
      </button>
    </div>
  );
};

export default RouteErrorFallback;
