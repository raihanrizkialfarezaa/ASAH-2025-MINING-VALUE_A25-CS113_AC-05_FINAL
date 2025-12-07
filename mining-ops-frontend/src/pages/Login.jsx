import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { Zap, User, Lock } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authService.login(formData);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-sky-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-cyan-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="rounded-xl sm:rounded-2xl border border-slate-800/50 bg-gradient-to-b from-slate-900/90 to-slate-950/90 shadow-2xl shadow-black/50 p-5 sm:p-8">
          {/* Logo & Header */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-500 shadow-lg shadow-sky-500/30 mb-3 sm:mb-4">
              <Zap className="text-white w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-100">Mining Operations</h1>
            <p className="text-slate-400 mt-1.5 sm:mt-2 text-xs sm:text-sm">Sign in to access dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            {error && <div className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs sm:text-sm font-medium">{error}</div>}

            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1.5 sm:mb-2">Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                  <User className="text-slate-500 w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                </div>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full pl-10 sm:pl-11 pr-3 sm:pr-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-slate-800/80 text-slate-100 placeholder-slate-500 border border-slate-700 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 focus:outline-none transition-all duration-200 text-sm sm:text-base"
                  placeholder="Enter username"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1.5 sm:mb-2">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                  <Lock className="text-slate-500 w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                </div>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-10 sm:pl-11 pr-3 sm:pr-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-slate-800/80 text-slate-100 placeholder-slate-500 border border-slate-700 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 focus:outline-none transition-all duration-200 text-sm sm:text-base"
                  placeholder="Enter password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-white font-semibold text-sm sm:text-base shadow-lg shadow-sky-500/25 transition-all duration-300 hover:shadow-sky-500/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? <LoadingSpinner size="sm" /> : 'Sign In'}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-slate-800/50 text-center">
            <p className="text-[10px] sm:text-xs text-slate-500">Mining Operations Pro Dashboard</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
