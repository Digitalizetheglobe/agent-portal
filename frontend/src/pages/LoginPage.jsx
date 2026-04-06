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

  const handleSubmit = async (e, role) => {
    e.preventDefault();
    
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    setLoading(true);
    setErrors({});

    try {
      const result = await login(formData.email, formData.password, role);

      if (result.success) {
        toast.success(`Welcome back!`, {
          description: `Logged in as ${role.charAt(0).toUpperCase() + role.slice(1)}`
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
    // Clear error for this field when user starts typing
    setErrors(prev => {
      if (prev[name]) {
        return { ...prev, [name]: '' };
      }
      return prev;
    });
  }, []);

  // Memoize the input classes to prevent re-renders
  const getInputClassName = useCallback((hasError, baseClasses) => {
    return hasError ? `${baseClasses} border-red-500 focus:border-red-500` : baseClasses;
  }, []);
  
  const emailInputClassName = useMemo(() => 
    getInputClassName(!!errors.email, 'pl-10'), [errors.email, getInputClassName]
  );
  
  const passwordInputClassName = useMemo(() => 
    getInputClassName(!!errors.password, 'pl-10 pr-10'), [errors.password, getInputClassName]
  );

  // Redirect if already authenticated - moved after all hooks
  if (isAuthenticated) {
    const redirectPath = user?.role === 'admin' ? '/admin/dashboard' : '/agent/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  const LoginForm = ({ role }) => (
    <form onSubmit={(e) => handleSubmit(e, role)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${role}-email`} className="text-sm font-medium">
          Email
        </Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id={`${role}-email`}
            name="email"
            type="email"
            placeholder="Enter your email"
            value={formData.email}
            onChange={handleInputChange}
            data-testid={`${role}-email-input`}
            className={emailInputClassName}
            required
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? `${role}-email-error` : undefined}
          />
        </div>
        {errors.email && (
          <p id={`${role}-email-error`} className="text-sm text-red-500 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {errors.email}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${role}-password`} className="text-sm font-medium">
          Password
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id={`${role}-password`}
            name="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter your password"
            value={formData.password}
            onChange={handleInputChange}
            data-testid={`${role}-password-input`}
            className={passwordInputClassName}
            required
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? `${role}-password-error` : undefined}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none focus:text-foreground"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {errors.password && (
          <p id={`${role}-password-error`} className="text-sm text-red-500 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {errors.password}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between space-x-2">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="remember-me"
            checked={rememberMe}
            onCheckedChange={setRememberMe}
            className="h-4 w-4"
          />
          <Label
            htmlFor="remember-me"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Remember me
          </Label>
        </div>
        <Button
          type="button"
          variant="link"
          className="text-sm text-primary hover:underline p-0 h-auto"
          onClick={() => toast.info('Forgot password feature coming soon!')}
        >
          Forgot password?
        </Button>
      </div>

      <Button 
        type="submit" 
        className="w-full" 
        disabled={loading}
        data-testid={`${role}-login-btn`}
      >
        {loading ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            Signing in...
          </div>
        ) : (
          'Sign In'
        )}
      </Button>

      {role === 'admin' && (
        <div className="mt-6 p-4 bg-muted/30 rounded-lg border border-border/50">
          <p className="text-xs text-center text-muted-foreground mb-2 font-medium">
            Demo Credentials
          </p>
          <div className="text-center">
            <code className="text-xs bg-background px-2 py-1 rounded border border-border/50 font-mono">
              admin@example.com / admin123
            </code>
          </div>
        </div>
      )}
      {role === 'agent' && (
        <div className="mt-6 p-4 bg-muted/30 rounded-lg border border-border/50">
          <p className="text-xs text-center text-muted-foreground mb-2 font-medium">
            Demo Credentials
          </p>
          <div className="text-center">
            <code className="text-xs bg-background px-2 py-1 rounded border border-border/50 font-mono">
              john.smith@example.com / agent123
            </code>
          </div>
        </div>
      )}
    </form>
  );

  return (
    <div 
      className="min-h-screen flex"
      data-testid="login-page"
    >
      {/* Left Side - Image */}
      <div 
        className="hidden lg:flex lg:w-1/2 relative bg-cover bg-center"
        style={{
          backgroundImage: 'url(https://images.pexels.com/photos/12843342/pexels-photo-12843342.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940)'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-primary/70" />
        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          <div className="flex items-center gap-3 mb-6">
            <img 
              src="/assets/QStudylogo(blue).png" 
              alt="QStudy Logo" 
              className="h-12 w-auto"
            />
            <h1 className="text-4xl lg:text-5xl font-bold font-['Outfit']">
              QStudy Portal
            </h1>
          </div>
          <p className="text-lg text-white/90 max-w-md leading-relaxed mb-8">
            Manage agents, events, and student registrations all in one place. 
            Streamline your workflow with our powerful management tools.
          </p>
          <div className="flex gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold">500+</div>
              <div className="text-sm text-white/80">Agents</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">1,200+</div>
              <div className="text-sm text-white/80">Events</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">50K+</div>
              <div className="text-sm text-white/80">Students</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <img 
                src="/assets/QStudylogo(blue).png" 
                alt="QStudy Logo" 
                className="h-10 w-auto"
              />
              <h1 className="text-2xl font-bold font-['Outfit']">QStudy Portal</h1>
            </div>
          </div>

          <Card className="border-border shadow-xl backdrop-blur-sm bg-card/95">
            <CardHeader className="space-y-1 pb-6">
              <div className="flex items-center justify-center mb-4">
                <img 
                  src="/assets/QStudylogo(blue).png" 
                  alt="QStudy Logo" 
                  className="h-10 w-auto"
                />
              </div>
              <CardTitle className="text-2xl font-['Outfit'] text-center">Welcome back</CardTitle>
              <CardDescription className="text-center">
                Sign in to your QStudy Portal account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="admin" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-8 bg-muted/50 p-1">
                  <TabsTrigger 
                    value="admin" 
                    data-testid="admin-tab"
                    className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                  >
                    <Shield className="w-4 h-4" />
                    Admin
                  </TabsTrigger>
                  <TabsTrigger 
                    value="agent" 
                    data-testid="agent-tab"
                    className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                  >
                    <UserCheck className="w-4 h-4" />
                    Agent
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="admin">
                  <LoginForm role="admin" />
                </TabsContent>
                <TabsContent value="agent">
                  <LoginForm role="agent" />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-muted-foreground mt-6">
            &copy; 2025 Admin Portal. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
