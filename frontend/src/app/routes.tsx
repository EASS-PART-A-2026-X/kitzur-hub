/**
 * Route table. Paths come from ROUTES so links and routes stay in sync.
 */
import type { RouteObject } from "react-router";
import { ROUTES } from "../config/constants";
import { CoursesPage } from "../pages/CoursesPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { Layout } from "./Layout";

export const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { path: ROUTES.courses, element: <CoursesPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
];
