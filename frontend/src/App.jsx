import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import {Toaster} from 'sonner';
// import { useUser } from './context/UserContext';

import Auth from './pages/Auth';
import Home from './pages/Home';
import AdminLayout from './layouts/AdminLayout';
import UserLayout from './layouts/UserLayout';
import ProtectedRoute from './components/ProtectesRoute';

import Dashboard from './pages/Dashboard';
import Campaigns from './pages/Campaigns';
import SendSMS from './pages/SendSMS';
// import Contzzacts
// import Groups
// import Users
import CreateCampaign from './pages/CreateCampaign';
import UserMessages from './pages/UserMessage';
import DeliveryStatus from './pages/DeliveryStatus';

function App() {
  return (
    <>
      <Toaster position="top-right" richColors />
      <Router>
        <Routes>
          <Route path='/register' element={<Auth />}/>
          <Route path='/login' element={<Auth />}/>
          <Route path='/home' 
            element={<ProtectedRoute>
              <Home/>
            </ProtectedRoute>}
          />
          <Route path="delivery-status" element={<DeliveryStatus />} />
          <Route path='/' 
            element={<ProtectedRoute role="admin">
              <AdminLayout />
            </ProtectedRoute>
          }
          >
            <Route index element={<Dashboard />}/>
            <Route path='/campaign' element={<Campaigns />}/>
            <Route path="send-sms" element={<SendSMS />} />
            {/*<Route path='/contacts' element={<Campaigns />}/>
            <Route path='/groups' element={<Campaigns />}/>
            <Route path='/users' element={<Campaigns />}/> */}
            <Route path='/CreateCampaign' element={<CreateCampaign />}/>
            <Route path='/campaign/new' element={<CreateCampaign />}/>
          </Route>
          <Route path="/my-messages"
            element={<ProtectedRoute>
              <UserLayout>
                <UserMessages />
              </UserLayout>
            </ProtectedRoute>} 
          />
          
        </Routes>
      </Router>
      
    </>
  )
}

export default App
