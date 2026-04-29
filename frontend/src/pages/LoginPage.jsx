import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Eye, EyeOff, User, Lock, Shield, UserCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Checkbox } from '../components/ui/checkbox';
import { toast } from 'sonner';

const LoginPage = () => {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    setLoading(true);
    setErrors({});

    try {
      const result = await login(formData.email, formData.password);

      if (result.success) {
        toast.success(`Welcome back!`, {
          description: `Logged in successfully`
        });
        navigate(result.role === 'admin' ? '/admin/dashboard' : '/agent/dashboard');
      } else {
        toast.error('Login failed', {
          description: result.error
        });
      }
    } catch (error) {
      toast.error('Login failed', {
        description: 'An unexpected error occurred. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);


  if (isAuthenticated) {
    const redirectPath = user?.role === 'admin' ? '/admin/dashboard' : '/agent/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Admin Dashboard Theme */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img 
          src="/assets/login.png" 
          alt="Login" 
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 bg-background flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-2">Welcome back</h2>
            <p className="text-muted-foreground">Please enter your details to sign in</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                Email
              </label>
              <input
                type="email"
                name="email"
                id="email"
                value={formData.email || 'janedoe@mail.com'}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                placeholder="janedoe@mail.com"
                required
                aria-invalid={!!errors.email}
              />
              {errors.email && (
                <p className="text-sm text-red-500 flex items-center gap-1 mt-2">
                  <AlertCircle className="w-3 h-3" />
                  {errors.email}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  id="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition pr-12"
                  required
                  aria-invalid={!!errors.password}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none text-sm font-medium"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'HIDE' : 'SHOW'}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-500 flex items-center gap-1 mt-2">
                  <AlertCircle className="w-3 h-3" />
                  {errors.password}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 px-4 rounded-lg focus:ring-2 focus:ring-primary focus:ring-offset-2 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Signing in...
                </div>
              ) : (
                'Login'
              )}
            </button>

            <div className="text-center">
              <button
                type="button"
                className="text-primary hover:text-primary/80 font-medium text-sm"
                onClick={() => toast.info('Forgot password feature coming soon!')}
              >
                Forgot Password?
              </button>
            </div>
          </form>

          {/* Demo credentials - smaller and less prominent */}
          <div className="mt-8 p-4 bg-muted rounded-lg border border-border">
            <p className="text-xs text-center text-muted-foreground mb-2 font-medium">
              Demo Credentials
            </p>
            <div className="text-center space-y-1">
              <div className="text-xs bg-background px-2 py-1 rounded border border-input font-mono">
                admin@example.com / admin123
              </div>
              <div className="text-xs bg-background px-2 py-1 rounded border border-input font-mono">
                john.smith@example.com / agent123
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
