/**
 * Route table. Patterns come from config/constants so links and routes stay in sync.
 */
import { Navigate, type RouteObject } from "react-router";
import { COURSE_TABS, ROUTE_PATTERNS } from "../config/constants";
import { CourseLayout } from "../pages/CourseLayout";
import { CoursesPage } from "../pages/CoursesPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { TasksTab } from "../pages/TasksTab";
import { Layout } from "./Layout";

export const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { path: ROUTE_PATTERNS.courses, element: <CoursesPage /> },
      {
        path: ROUTE_PATTERNS.course,
        element: <CourseLayout />,
        children: [
          { index: true, element: <Navigate to={COURSE_TABS[0]} replace /> },
          { path: "tasks", element: <TasksTab /> },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
];
