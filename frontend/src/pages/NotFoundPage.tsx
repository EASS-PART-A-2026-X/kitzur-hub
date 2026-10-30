/**
 * Fallback for unknown URLs.
 */
import { Button, Stack, Title } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { ROUTES } from "../config/constants";

/**
 * Tell the user the page does not exist and offer a way back.
 *
 * @returns The page.
 */
export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <Stack align="flex-start">
      <Title order={2}>{t("notFound.title")}</Title>
      <Button component={Link} to={ROUTES.courses} variant="light">
        {t("notFound.back")}
      </Button>
    </Stack>
  );
}
