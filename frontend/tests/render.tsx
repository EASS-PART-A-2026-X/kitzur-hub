/**
 * Render helper that mounts a component inside the real app providers.
 */
import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { Providers } from "../src/app/Providers";
import { createQueryClient } from "../src/app/queryClient";
import { routes } from "../src/app/routes";

/**
 * Render the app's routes at a given URL with fresh providers.
 *
 * @param path Initial URL.
 * @returns Testing Library's render result.
 */
export function renderRoute(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return render(
    <Providers queryClient={createQueryClient()} env="test">
      <RouterProvider router={router} />
    </Providers>,
  );
}

/**
 * Render a single element with fresh providers.
 *
 * @param element What to render.
 * @returns Testing Library's render result.
 */
export function renderWithProviders(element: ReactElement) {
  return render(
    <Providers queryClient={createQueryClient()} env="test">
      {element}
    </Providers>,
  );
}
