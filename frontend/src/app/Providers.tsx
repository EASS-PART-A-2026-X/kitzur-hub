/**
 * Every app-wide provider in one place: i18n, direction, theme, data, toasts.
 */
import { DirectionProvider, MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { type QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import i18n from "../i18n";
import { theme } from "./theme";

interface ProvidersProps {
  queryClient: QueryClient;
  children: ReactNode;
  /** "test" turns off Mantine transitions and portals so tests see dialogs at once. */
  env?: "default" | "test";
}

/**
 * Wrap the app (or a test) with all providers.
 *
 * @param props The query client, the content to render, and the environment.
 * @returns The wrapped tree.
 */
export function Providers({ queryClient, children, env = "default" }: ProvidersProps) {
  return (
    <I18nextProvider i18n={i18n}>
      <DirectionProvider initialDirection={i18n.dir()}>
        <MantineProvider theme={theme} env={env}>
          <Notifications position="top-center" />
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </MantineProvider>
      </DirectionProvider>
    </I18nextProvider>
  );
}
