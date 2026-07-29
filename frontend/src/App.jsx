import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router'
import UserContextProvider from '@/Context/UserContext.jsx'
import  { Toaster } from 'react-hot-toast';

import AuthLayout from './_auth/AuthLayout.jsx'
import RootLayout from './_root/RootLayout.jsx'
import ProtectedRoute from './components/Shared/protectedRoutes';
import ErrorBoundary from './components/Shared/ErrorBoundary.jsx';
import RouteErrorFallback from './components/Shared/RouteErrorFallback.jsx';
import Loader from './components/Shared/Loader.jsx';

// Route-level code splitting — each page's code now loads only when that
// route is visited, instead of one 566KB chunk shipped on every load. See
// PHASE3_SECURITY_SCOPE.md Finding 8. Imported directly from each file
// (not the ./_root/pages barrel) so each stays its own chunk.
const Home = lazy(() => import('./_root/pages/Home'))
const Profile = lazy(() => import('./_root/pages/Profile'))
const Explore = lazy(() => import('./_root/pages/Explore'))
const CreatePost = lazy(() => import('./_root/pages/CreatePost'))
const EditPost = lazy(() => import('./_root/pages/EditPost'))
const PostDetails = lazy(() => import('./_root/pages/PostDetails'))
const UpdateProfile = lazy(() => import('./_root/pages/UpdateProfile'))
const AllUsers = lazy(() => import('./_root/pages/AllUsers'))
const Saved = lazy(() => import('./_root/pages/Saved'))
const UserNotification = lazy(() => import('./_root/pages/UserNotification'))
const ChatsPage = lazy(() => import('./_root/pages/ChatsPage'))
const SignupForm = lazy(() => import('./_auth/forms/SignupForm.jsx'))
const SigninForm = lazy(() => import('./_auth/forms/SingninForm.jsx'))

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <RouteErrorFallback />,
    children: [
      { index: true, element:<ProtectedRoute><Home /></ProtectedRoute>  },
      { path: 'explore', element: <ProtectedRoute><Explore /></ProtectedRoute> },
      { path: 'saved', element:<ProtectedRoute><Saved /></ProtectedRoute>  },
      { path: 'all-users', element:<ProtectedRoute><AllUsers /></ProtectedRoute>  },
      { path: 'create-post', element: <ProtectedRoute><CreatePost /></ProtectedRoute> },
      { path: 'update-post/:id', element: <ProtectedRoute><EditPost /></ProtectedRoute> },
      { path: 'posts/:id', element: <ProtectedRoute><PostDetails /></ProtectedRoute> },
      { path: 'profile/:id/*', element: <ProtectedRoute><Profile /></ProtectedRoute> },
      { path: 'update-profile/:id', element: <ProtectedRoute><UpdateProfile /></ProtectedRoute> },
      { path: "/notification", element:<ProtectedRoute> <UserNotification /></ProtectedRoute> },
      { path: "/chats", element:<ProtectedRoute> <ChatsPage /></ProtectedRoute> }

    ]
  },
  {
    element: <AuthLayout />,
    errorElement: <RouteErrorFallback />,
    children: [
      { path: 'sign-in', element: <SigninForm /> },
      { path: 'sign-up', element: <SignupForm /> }
    ]
  }
])

const App = () => {
  return (
    <main className='flex w-screen'>
      <ErrorBoundary>
        <UserContextProvider>
          <Suspense fallback={<Loader />}>
            <RouterProvider router={router} />
          </Suspense>
          <Toaster />
        </UserContextProvider>
      </ErrorBoundary>
    </main>
  )
}

export default App
