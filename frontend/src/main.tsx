/**
 * Browser entry point.
 */
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/dropzone/styles.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import { Providers } from "./app/Providers";
import { createQueryClient } from "./app/queryClient";
import { routes } from "./app/routes";

const root = document.getElementById("root");
if (!root) throw new Error("index.html is missing #root");

createRoot(root).render(
  <StrictMode>
    <Providers queryClient={createQueryClient()}>
      <RouterProvider router={createBrowserRouter(routes)} />
    </Providers>
  </StrictMode>,
);
