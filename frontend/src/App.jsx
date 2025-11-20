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
import Contacts from './pages/Contacts';
import Groups from './pages/Groups';
import Users from './pages/Users';
import CreateCampaign from './pages/CreateCampaign';
import UserMessages from './pages/UserMessage';
import DeliveryStatus from './pages/DeliveryStatus';

function App() {
  return (
    <>
      <Toaster position="top-right" richColors />
      <Router>
        <Routes>
          <Route path='/admin/register' element={<Auth />}/>
          <Route path='/login' element={<Auth />}/>
          <Route path='/home' element={<Home />}
            // element={<ProtectedRoute >
            //   <Home/> 
            // </ProtectedRoute>}
          />
          <Route path="delivery-status" element={<DeliveryStatus />} />
          <Route path='/' 
            element={<ProtectedRoute re='admin'>
              <AdminLayout />
            </ProtectedRoute>
          }
          >
            <Route index element={<Dashboard />}/>
            <Route path='/campaign' element={<Campaigns />}/>
            <Route path="send-sms" element={<SendSMS />} />
            <Route path='/contacts' element={<Contacts />}/>
            <Route path='/groups' element={<Groups />}/>
            <Route path='/users' element={<Users />}/>
            <Route path='/CreateCampaign' element={<CreateCampaign />}/>
            <Route path='/campaign/new' element={<CreateCampaign />}/>
          </Route>
          <Route path='huy' element={< Dashboard/>}/>
          {/* <Route path='/users' element={<Users />}/> */}
          <Route path="/my-messages"
            element={<ProtectedRoute role='viewer'>
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
