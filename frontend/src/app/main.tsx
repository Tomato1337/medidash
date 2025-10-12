import './global.css'

import { lazy, StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { routeTree } from './routes/routeTree.gen'
// import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
    interface Register {
        router: typeof router
    }
}

const TanStackRouterDevtools = import.meta.env.VITE_TANSTACK_DEVTOOLS
    ? lazy(() =>
          import('@tanstack/react-router-devtools').then((m) => ({
              default: m.TanStackRouterDevtools,
          }))
      )
    : () => null

const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
    const root = ReactDOM.createRoot(rootElement)
    root.render(
        <StrictMode>
            <RouterProvider router={router} />
            <TanStackRouterDevtools router={router} />
        </StrictMode>
    )
}
