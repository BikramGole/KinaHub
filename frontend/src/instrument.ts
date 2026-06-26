import React from "react";
import * as Sentry from "@sentry/react";
import {
  useLocation, useNavigationType,
  createRoutesFromChildren, matchRoutes,
} from "react-router";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN || "https://e3dbb2f088831243bbdb73bc3fd85481@o4511632499343360.ingest.de.sentry.io/4511632659644496",
  environment: import.meta.env.MODE,
  release: import.meta.env.VITE_APP_VERSION,

  integrations: [
    Sentry.reactRouterV7BrowserTracingIntegration({
      useEffect: React.useEffect,
      useLocation,
      useNavigationType,
      matchRoutes,
      createRoutesFromChildren,
    }),
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  tracesSampleRate: 1.0,
  tracePropagationTargets: ["localhost"],

  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
