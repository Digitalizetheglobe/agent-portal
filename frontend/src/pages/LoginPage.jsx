import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Eye, EyeOff, User, Lock, Shield, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';

const LoginPage = () => {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    userId: '',
    password: ''
  });

  // Redirect if already authenticated
  if (isAuthenticated) {
    const redirectPath = user?.role === 'admin' ? '/admin/dashboard' : '/agent/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  const handleSubmit = async (e, role) => {
    e.preventDefault();
    setLoading(true);

    // Simulate loading
    await new Promise(resolve => setTimeout(resolve, 500));

    const result = login(formData.userId, formData.password);

    if (result.success) {
      toast.success(`Welcome back!`, {
        description: `Logged in as ${role}`
      });
      navigate(result.role === 'admin' ? '/admin/dashboard' : '/agent/dashboard');
    } else {
      toast.error('Login failed', {
        description: result.error
      });
    }

    setLoading(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const LoginForm = ({ role }) => (
    <form onSubmit={(e) => handleSubmit(e, role)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${role}-userId`} className="text-sm font-medium">
          User ID
        </Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id={`${role}-userId`}
            name="userId"
            type="text"
            placeholder="Enter your user ID"
            value={formData.userId}
            onChange={handleInputChange}
            data-testid={`${role}-userid-input`}
            className="pl-10"
            required
          />
        </div>
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
            className="pl-10 pr-10"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
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
        <p className="text-xs text-center text-muted-foreground mt-4">
          Demo credentials: <span className="font-mono">admin / admin123</span>
        </p>
      )}
      {role === 'agent' && (
        <p className="text-xs text-center text-muted-foreground mt-4">
          Demo credentials: <span className="font-mono">john.smith / agent123</span>
        </p>
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
          <h1 className="text-4xl lg:text-5xl font-bold mb-4 font-['Outfit']">
            Admin Portal
          </h1>
          <p className="text-lg text-white/90 max-w-md leading-relaxed">
            Manage agents, events, and student registrations all in one place. 
            Streamline your workflow with our powerful management tools.
          </p>
          <div className="mt-8 flex gap-6">
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
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary mb-3">
              <span className="text-primary-foreground font-bold text-lg">AP</span>
            </div>
            <h1 className="text-2xl font-bold font-['Outfit']">Admin Portal</h1>
          </div>

          <Card className="border-border shadow-lg">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-2xl font-['Outfit']">Welcome back</CardTitle>
              <CardDescription>
                Sign in to your account to continue
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="admin" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger 
                    value="admin" 
                    data-testid="admin-tab"
                    className="flex items-center gap-2"
                  >
                    <Shield className="w-4 h-4" />
                    Admin
                  </TabsTrigger>
                  <TabsTrigger 
                    value="agent" 
                    data-testid="agent-tab"
                    className="flex items-center gap-2"
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
