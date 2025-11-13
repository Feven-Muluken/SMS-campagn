import { useState, useEffect } from 'react';
import axios from '../api/axiosInstance';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
// text-sm

const Auth = () => {
  const location = useLocation();
  const [isLogin, setIsLogin] = useState(location.pathname === '/login');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);


  useEffect(() => {
    setIsLogin(location.pathname === '/login');
  }, [location.pathname]);
// const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ name: '', email: '', password: '', role: '' });
  const [loginError, setLoginError] = useState('');
  const [registerError, setRegisterError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await axios.post('/auth/login', {
        email: loginForm.email,
        password: loginForm.password
      });
      const token = res.data.token;
      localStorage.setItem('token', token);
      navigate('/');
    } catch (err) {
      setLoginError('Invalid credentials');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegisterError('');
    try {
      await axios.post('/auth/register', registerForm);
      navigate('/login');
      setLoginForm({ email: registerForm.email, password: '' });
    } catch (err) {
      setRegisterError(err.response?.data?.message || 'Registration failed');
    }
  };

  const switchToRegister = () => {
    navigate('/register');
    setRegisterError('');
  };

  const switchToLogin = () => {
    navigate('/login');
    setLoginError('');
  };

  return (
    <div className="relative flex h-screen overflow-hidden">
      
      <motion.div
        key={isLogin ? 'welcome-right' : 'welcome-left'}
        initial={false}
        animate={{
          left: isLogin ? '0%' : '50%',
          right: isLogin ? '50%' : '0%',
        }}
        transition={{
          duration: 0.8,
          ease: [0.4, 0, 0.2, 1]
        }}
        className="absolute top-0 bottom-0 w-1/2 z-10"
        style={{
          background: 'linear-gradient(135deg, #DF0A0A 0%, #B91C1C 40%, #991B1B 70%, #7F1D1D 100%)',
          clipPath: isLogin
            ? 'polygon(0 0, 85% 0, 100% 100%, 0% 100%)'
            : 'polygon(15% 0, 100% 0, 100% 100%, 0% 100%)'
        }}
      >

        <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
          <div
            className="absolute top-20 right-20 w-64 h-64 rounded-full opacity-5"
            style={{ backgroundColor: '#FFFFFF' }}
          ></div>
          <div
            className="absolute bottom-20 left-20 w-48 h-48 rounded-full opacity-5"
            style={{ backgroundColor: '#FFFFFF' }}
          ></div>
          <div
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full opacity-5"
            style={{ backgroundColor: '#' }}
          ></div>
        </div>

        <div className="h-full flex items-center justify-center p-12 relative z-10">
          <motion.div
            key={isLogin ? 'login-welcome' : 'register-welcome'}
            initial={{ opacity: 0, x: isLogin ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-white max-w-md text-center"
          >
            <motion.h1
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-5xl font-bold mb-6"
              style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}
            >
              {isLogin ? 'WELCOME BACK!' : 'WELCOME!'}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="text-xl leading-relaxed"
              style={{ color: '#FEE2E2' }}
            >
              {isLogin
                ? "We're delighted to have you back. Sign in to continue managing your SMS campaigns."
                : "We're delighted to have you here. If you need any assistance, feel free to reach out."}
            </motion.p>
          </motion.div>
        </div>
      </motion.div>
      
      
      <div
        className="absolute top-0 bottom-0 w-full z-0"
        style={{
          backgroundColor: '#FFFFFF'
        }}
      >

        <motion.div
          initial={false}
          animate={{
            left: isLogin ? '53%' : '8%',
          }}
          transition={{
            duration: 0.8,
            ease: [0.4, 0, 0.2, 1]
          }}
          className="absolute top-1/2 transform -translate-y-1/2"
          style={{
            maxWidth: '450px',
            width: '40%'
          }}
        >
          <AnimatePresence mode="wait">
            {isLogin ? (
              <motion.div
                key="login-form"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                transition={{ duration: 0.5 }}
              >
                <h2 className="text-4xl font-bold mb-8 text-[#1F2937]">Login</h2>

                <form onSubmit={handleLogin} className="space-y-6">
                  {loginError && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="px-4 py-3 rounded-lg text-sm border"
                      style={{
                        backgroundColor: '#FEE2E2',
                        borderColor: '#FCA5A5',
                        color: '#991B1B'
                      }}
                    >
                      {loginError}
                    </motion.div>
                  )}

                  <div className="relative">
                    <label className="block text-sm font-medium mb-3" style={{ color: '#4B5563' }}>Email</label>
                    <div className="relative">
                      <input
                        type="email"
                        placeholder="Email"
                        className="w-full p-3 bg-transparent border-0 border-b-2 text-sm focus:outline-none transition-colors pb-2 auth-input"
                        style={{
                          borderColor: '#D1D5DB',
                          color: '#0F0D1D'
                        }}
                        value={loginForm.email}
                        onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                        required
                      />
                      <svg className="absolute right-0 top-1/2 transform -translate-y-1/2 w-5 h-5 pointer-events-none" style={{ color: '#6B7280' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>

                  <div className='relative'> 
                    <div className="relative">
                      <label className="block text-sm font-medium mb-3" style={{ color: '#4B5563' }}>Password</label>
                      <input
                        type={showLoginPassword ? 'text' : 'password'}
                        placeholder="Password"
                        className="w-full p-3 bg-transparent border-0 border-b-2 text-sm focus:outline-none transition-colors pb-2 pr-10 auth-input"
                        style={{
                          borderColor: '#D1D5DB',
                          color: '#0F0D1D'
                        }}
                        value={loginForm.password}
                        onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-0.5 top-10 text-gray-500 hover:text-gray-700"
                      >
                        {showLoginPassword ? (
                          <EyeSlashIcon className="h-5 w-5" />
                        ) : (
                          <EyeIcon className="h-5 w-5" />
                        )}
                      </button>
                    </div> 
                  </div>

                  <button
                    type="submit"
                    className="w-full text-white py-4 rounded-lg font-bold text-lg transition duration-200 shadow-lg hover:shadow-xl mt-8 auth-button"
                    style={{
                      backgroundColor: '#DF0A0A',
                      boxShadow: '0 4px 15px rgba(223, 10, 10, 0.3)'
                    }}
                  >
                    Login
                  </button>
                </form>

                <div className="mt-8 text-center">
                  <p className="text-sm mb-2" style={{ color: '#6B7280' }}>Don't have an account?<button
                    type="button"
                    onClick={switchToRegister}
                    className="font-semibold hover:underline transition text-lg auth-link ml-2"
                    style={{ color: '#DF0A0A' }}
                  >
                    Register
                  </button></p>
                  
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="register-form"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.5 }}
              >
                <h2 className="text-4xl font-bold mb-8 text-[#1F2937]">Register</h2>

                <form onSubmit={handleRegister} className="space-y-6">
                  {registerError && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="px-4 py-3 rounded-lg text-sm border"
                      style={{
                        backgroundColor: '#FEE2E2',
                        borderColor: '#FCA5A5',
                        color: '#991B1B'
                      }}
                    >
                      {registerError}
                    </motion.div>
                  )}

                  <div className="relative">
                    <label className="block text-sm font-medium mb-3" style={{ color: '#4B5563' }}>Full Name</label>
                    <div className="relative">
                      <input
                        name="name"
                        type="text"
                        placeholder="Full name"
                        className="w-full p-3 bg-transparent border-0 border-b-2 text-sm focus:outline-none transition-colors pb-2 auth-input"
                        style={{
                          borderColor: '#D1D5DB',
                          color: '#0F0D1D'
                        }}
                        value={registerForm.name}
                        onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                        required
                      />
                      <svg className="absolute right-0 top-1/2 transform -translate-y-1/2 w-5 h-5 pointer-events-none" style={{ color: '#6B7280' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-medium mb-3" style={{ color: '#4B5563' }}>Email</label>
                    <div className="relative">
                      <input
                        name="email"
                        type="email"
                        placeholder="Email"
                        className="w-full p-3 bg-transparent border-0 border-b-2 text-sm focus:outline-none transition-colors pb-2 auth-input"
                        style={{
                          borderColor: '#D1D5DB',
                          color: '#0F0D1D'
                        }}
                        value={registerForm.email}
                        onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                        required
                      />
                      <svg className="absolute right-0 top-1/2 transform -translate-y-1/2 w-5 h-5 pointer-events-none" style={{ color: '#6B7280' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="relative">
                      <label className="block text-sm font-medium mb-3 text-[#4B5563]">Password</label>
                      <input
                        name="password"
                        type={showRegisterPassword ? 'text' : 'password'}
                        placeholder="Password"
                        className="w-full p-3 bg-transparent border-0 border-b-2 text-sm focus:outline-none transition-colors pb-2 auth-input text-[#0F0D1D]"
                        style={{
                          borderColor: '#D1D5DB',
                        }}
                        value={registerForm.password}
                        onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                        required
                      />
                      <button type='button' onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                      className='absolute right-0.5 top-10 text-gray-500 hover:text-gray-700'
                      >
                        {showRegisterPassword ? (<EyeSlashIcon className='h-5 w-5'/>) : (<EyeIcon className='h-5 w-5'/>)}
                      </button>
                    </div>
                  </div>
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700">Role</label>
                    <select
                      name="role"
                      className="w-full p-3 border-b-2 border-gray-300 focus:outline-none text-[#3c3c3c] text-sm"
                      value={registerForm.role}
                      onChange={(e) => setRegisterForm({ ...registerForm, role: e.target.value})}
                      required
                    >
                      <option value="">Select Role</option>
                      <option value="admin">Admin</option>
                      <option value="user">User</option>
                      <option value="user">Viewer</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full text-white py-4 rounded-lg font-bold text-lg transition duration-200 shadow-lg hover:shadow-xl mt-8 auth-button"
                    style={{
                      backgroundColor: '#DF0A0A',
                      boxShadow: '0 4px 15px rgba(223, 10, 10, 0.3)'
                    }}
                  >
                    Register
                  </button>
                </form>

                <div className="mt-8 text-center">
                  <p className="text-sm mb-2" style={{ color: '#6B7280' }}>Already have an account?<button
                    type="button"
                    onClick={switchToLogin}
                    className="font-semibold hover:underline transition text-lg auth-link ml-2"
                    style={{ color: '#DF0A0A' }}
                  >
                    Sign In
                  </button></p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;




