import React, { useState } from 'react';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import type { LoginCredentials, User } from '../types/auth';

interface LoginPageProps {
  onLogin: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [formData, setFormData] = useState<LoginCredentials>({
    username: '',
    password: '',
    role: 'UniversityAdmin'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Menggunakan port 8801 untuk Fablo REST API Org1
  const API_BASE_URL = 'http://localhost:8801';
  const CHANNEL_NAME = 'my-channel1';
  const CHAINCODE_NAME = 'chaincode-submission-ts';

  const getAdminToken = async (): Promise<string> => {
    const response = await fetch(`${API_BASE_URL}/user/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'admin', secret: 'adminpw' })
    });

    if (!response.ok) {
      throw new Error('Gagal mendapatkan token admin');
    }

    const data = await response.json();
    return data.token;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Get admin token
      const token = await getAdminToken();

      // Query user by username
      const response = await fetch(`${API_BASE_URL}/query/${CHANNEL_NAME}/${CHAINCODE_NAME}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          method: 'UserContract:getUserByUsername',
          args: [formData.username]
        })
      });

      if (!response.ok) {
        if (response.status === 400) {
          throw new Error('Username tidak ditemukan. Pastikan username sudah terdaftar di sistem.');
        }
        throw new Error(`Terjadi kesalahan server (${response.status})`);
      }

      const resultData = await response.json();
      
      if (!resultData.response) {
        throw new Error('Format response tidak valid dari server.');
      }

      const user = resultData.response;

      // Verify credentials
      if (user.hashedPassword === formData.password && user.role === formData.role) {
        onLogin({
          userID: user.userID,
          username: user.username,
          role: user.role
        });
      } else if (user.hashedPassword !== formData.password) {
        throw new Error('Password yang Anda masukkan salah.');
      } else if (user.role !== formData.role) {
        throw new Error(`Peran yang Anda pilih (${formData.role}) tidak sesuai dengan akun Anda (${user.role}).`);
      } else {
        throw new Error('Kredensial login tidak valid.');
      }

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Terjadi kesalahan sistem');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo and Title */}
        <div className="text-center">
          <svg 
            className="mx-auto h-16 w-16 text-gray-900" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 2L2 7V17L12 22L22 17V7L12 2Z" 
            />
          </svg>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Sistem Akreditasi
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Berbasis Blockchain Technology
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200">
          <form className="p-8 space-y-6" onSubmit={handleSubmit}>
            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={formData.username}
                onChange={handleInputChange}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                placeholder="Masukkan username Anda"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="appearance-none relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                  placeholder="Masukkan password Anda"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Role */}
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                Masuk sebagai
              </label>
              <select
                id="role"
                name="role"
                required
                value={formData.role}
                onChange={handleInputChange}
                className="relative block w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
              >
                <option value="UniversityAdmin">UPPS</option>
                <option value="Assessor">Asesor</option>
                <option value="SuperAdmin">Admin</option>
              </select>
            </div>

            {/* Forgot Password Link */}
            <div className="flex items-center justify-end">
              <a href="#" className="text-sm text-orange-600 hover:text-orange-500">
                Lupa kata sandi?
              </a>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Memproses...
                </div>
              ) : (
                <div className="flex items-center">
                  <LogIn className="h-4 w-4 mr-2" />
                  Masuk
                </div>
              )}
            </button>

            {/* Register Link */}
            <p className="text-center text-sm text-gray-600">
              Belum memiliki akun UPPS?{' '}
              <a href="#" className="font-medium text-orange-600 hover:text-orange-500">
                silahkan daftar disini
              </a>
            </p>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p>Copyright © 2025 LAM Teknik. All Rights Reserved</p>
          <p className="mt-1">
            <a href="#" className="hover:text-orange-600">Terms & Conditions</a>
            {' | '}
            <a href="#" className="hover:text-orange-600">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
};