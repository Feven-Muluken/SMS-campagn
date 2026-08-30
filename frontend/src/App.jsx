import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import {Toaster} from 'sonner';
// import { useUser } from './context/UserContext';

import Auth from './pages/Auth';
import AdminHome from './pages/adminHome';
import CompanyHome from './pages/CompanyHome';
import MainWorkspaceGate from './components/MainWorkspaceGate';
import CompanyWorkspaceGate from './components/CompanyWorkspaceGate';
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
import AppointmentSystem from './pages/AppointmentSystem';
import SupportInbox from './pages/SupportInbox';
import GeoMarketing from './pages/GeoMarketing';
import BillingAlerts from './pages/BillingAlerts';
import PremiumFeatureDetail from './pages/PremiumFeatureDetail';
import Unauthorized from './pages/Unauthorized';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Companies from './pages/Companies';
import CompanyAccess from './pages/CompanyAccess';
import AdminLegacyRedirect from './components/AdminLegacyRedirect';
import PlatformShell from './components/PlatformShell';
import { Navigate } from 'react-router-dom';
import MyProfile from './pages/MyProfile';

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
          <Route path='/forgot-password' element={<ForgotPassword />}/>
          <Route path='/reset-password' element={<ResetPassword />}/>
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
          
          <Route path="/platform" element={<Navigate to="/adminhome" replace />} />
          <Route path="/adminhome" element={<PlatformShell />}>
            <Route index element={<AdminHome />} />
          </Route>
          <Route
            path="/companyhome"
            element={
              <ProtectedRoute role={['admin', 'staff', 'viewer']}>
                <CompanyHome />
              </ProtectedRoute>
            }
          />
          <Route path="/admin" element={<AdminLegacyRedirect />} />
          <Route
            path="/"
            element={
              <ProtectedRoute role={['admin', 'staff', 'viewer']} allowCompanyWorkspace>
                <MainWorkspaceGate />
              </ProtectedRoute>
            }
          >
            <Route
              index
              element={
                <ProtectedRoute permission="dashboard.view" deniedTo="/companyhome">
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route path='/campaign' element={<Campaigns />}/>
            <Route path="/send-sms" element={<SendSMS />} />
            <Route path='/contacts' element={<Contacts />}/>
            <Route path='/groups' element={<Groups />}/>
            <Route path="users" element={<ProtectedRoute role="admin" permission="user.manage"><Users /></ProtectedRoute>} />
            <Route path="companies" element={<ProtectedRoute permission="company.manage"><Companies /></ProtectedRoute>} />
            <Route path="company-access" element={<ProtectedRoute permission="company.manage"><CompanyAccess /></ProtectedRoute>} />
            <Route path="profile" element={<MyProfile />} />
            <Route path='/CreateCampaign' element={<CreateCampaign />}/>
            <Route path='/campaign/new' element={<CreateCampaign />}/>
            <Route path="delivery-status" element={<ProtectedRoute permission="delivery.view"><DeliveryStatus /></ProtectedRoute>} />
            <Route path="appointments" element={<ProtectedRoute permission="appointment.view"><AppointmentSystem /></ProtectedRoute>} />
            <Route path="premium/two-way-chat" element={<ProtectedRoute permission="inbox.view"><SupportInbox /></ProtectedRoute>} />
            <Route path="premium/ticketing-support" element={<ProtectedRoute permission="inbox.view"><SupportInbox /></ProtectedRoute>} />
            <Route path="premium/geo-marketing" element={<ProtectedRoute permission="geo.send"><GeoMarketing /></ProtectedRoute>} />
            <Route path="premium/billing-alerts" element={<ProtectedRoute permission="billing.send"><BillingAlerts /></ProtectedRoute>} />
            <Route path="premium/:slug" element={<PremiumFeatureDetail />} />
          </Route>
          <Route path='huy' element={< Dashboard/>}/>
          {/* <Route path='/users' element={<Users />}/> */}
          
          <Route path="/home"
            element={<ProtectedRoute role={['admin', 'viewer', 'staff']} allowCompanyWorkspace>
              <UserLayout />
            </ProtectedRoute>
            }
          >
            <Route index element={<CompanyHome />}/>
            <Route path='/home/my-messages' element={< UserMessages />}/>
          </Route>

          <Route path='/unauthorized' element={<Unauthorized />} />
          
        </Routes>
      </Router>
      
    </>
  )
}

export default App
