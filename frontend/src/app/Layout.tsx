/**
 * Page frame shared by every route: header plus routed content.
 */
import { AppShell, Group, Text, Title } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Link, Outlet } from "react-router";
import { ROUTES } from "../config/constants";

/**
 * Render the header and the active route.
 *
 * @returns The app shell.
 */
export function Layout() {
  const { t } = useTranslation();
  return (
    <AppShell header={{ height: 60 }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" gap="sm">
          <Title order={3}>
            <Link to={ROUTES.courses} style={{ color: "inherit", textDecoration: "none" }}>
              {t("app.name")}
            </Link>
          </Title>
          <Text c="dimmed" size="sm">
            {t("app.tagline")}
          </Text>
        </Group>
      </AppShell.Header>
      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
