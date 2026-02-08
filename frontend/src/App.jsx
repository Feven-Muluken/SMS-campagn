import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import {Toaster} from 'sonner';
// import { useUser } from './context/UserContext';

import Auth from './pages/Auth';
import Home from './pages/Home';
import AdminLayout from './layouts/AdminLayout';
import UserLayout from './layouts/UserLayout';
import ProtectedRoute from './components/ProtectesRoute';
import UserHome from './pages/userhome';
import Dashboard from './pages/AdminDashboard';
import Campaigns from './pages/Campaigns';
import SendSMS from './pages/SendSMS';
import Contacts from './pages/Contacts';
import Groups from './pages/Groups';
import Users from './pages/Users';
import CreateCampaign from './pages/CreateCampaign';
import UserMessages from './pages/UserMessage';
import DeliveryStatus from './pages/DeliveryStatus';
import Unauthorized from './pages/Unauthorized';

function App() {
  return (
    <>
      <Toaster position="top-right" richColors />
      <Router>
        <Routes>
          <Route path='/admin/register' 
            element={<ProtectedRoute role = 'admin'>
              <Auth/> 
            </ProtectedRoute>}
          />
          <Route path='/login' element={<Auth />}/>
          {/* <Route path='/home/' 
            element={<ProtectedRoute role='admin'>
              <Home/> 
            </ProtectedRoute>}
          /> */}
          {/* <Route path='/viewerhome' 
            element={<ProtectedRoute role="viewer">
              <Home/> 
            </ProtectedRoute>}
          /> */}
          {/* <Route path='/UserHome' element={<UserHome />}/> */}
          
          <Route path='/admin'
            element={<ProtectedRoute role='admin'>
              <Home/> 
            </ProtectedRoute>}
          />
          <Route path='/' 
            element={<ProtectedRoute role='admin'>
              <AdminLayout />
            </ProtectedRoute>
          }
          >
            <Route index element={<Dashboard />}/>
            <Route path='/campaign' element={<Campaigns />}/>
            <Route path="/send-sms" element={<SendSMS />} />
            <Route path='/contacts' element={<Contacts />}/>
            <Route path='/groups' element={<Groups />}/>
            <Route path='/users' element={<Users />}/>
            <Route path='/CreateCampaign' element={<CreateCampaign />}/>
            <Route path='/campaign/new' element={<CreateCampaign />}/>
          </Route>
          <Route path='huy' element={< Dashboard/>}/>
          {/* <Route path='/users' element={<Users />}/> */}
          
          <Route path="delivery-status" element={<DeliveryStatus />} />
          <Route path="/home"
            element={<ProtectedRoute role={['viewer', 'staff']}>
              <UserLayout />
            </ProtectedRoute>
            }
          >
            <Route index element={<UserHome />}/>
            <Route path='/home/my-messages' element={< UserMessages />}/>
          </Route>

          <Route path='/unauthorized' element={<Unauthorized />} />
          
        </Routes>
      </Router>
      
    </>
  )
}

export default App
