import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import TripPlanner from './components/Inputs/TripPlanner.jsx'
import Trip from './pages/Trip.jsx'
import MyTrips from './pages/MyTrips.jsx'
import Feed from './pages/Feed.jsx'
import Groups from './pages/Groups.jsx'
import Events1 from './components/Events/Events1.jsx'
import Events2 from './components/Events/Events2.jsx'
import Index from './components/My-Profile/Index.js'
import Quest from './pages/Quest.jsx'
import CreateQuest from './components/quest/CreateQuest.jsx'
import OnQuestChat from './pages/Chats.jsx'
import { ChatProvider } from './hooks/useChatContext' // Import the ChatProvider

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <div>Not found</div>,
  },
  {
    path: '/TripPlanner',
    element: <TripPlanner />,
    errorElement: <div>Not found</div>,
  },
  {
    path: '/trip/:tripId',
    element: <Trip />,
    errorElement: <div>Not found</div>,
  },
  {
    path: '/my-trips',
    element: <MyTrips />,
    errorElement: <div>Not found</div>,
  },
  {
    path: '/feed',
    element: <Feed />,
    errorElement: <div>Not found</div>,
  },
  {
    path: '/groups',
    element: <Groups />,
    errorElement: <div>Not found</div>,
  },
  {
    path: '/quest/:questId',
    element: <Quest />,
    errorElement: <div>Not found</div>,
  },
  {
    path: '/create-quest',
    element: <CreateQuest />,
    errorElement: <div>Not found</div>,
  },
  {
    path: '/my-profile',
    element: <Index />,
    errorElement: <div>Not found</div>,
  },
  { 
    path: '/chats',
    element: (
      <ChatProvider>  {/* Wrap OnQuestChat with ChatProvider */}
        <OnQuestChat />
      </ChatProvider>
    ),
    errorElement: <div>Not found</div>,
  },
  {
    path: '/About',
    element: <Events1/>,
    errorElement: <div>Not found</div>,
  },
  {
    path: '/contact',
    element: <Events2 />,
    errorElement: <div>Not found</div>,
  },
]);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)