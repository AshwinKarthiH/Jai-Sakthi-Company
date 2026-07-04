import React, { useState, useEffect } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useStore } from '../store/StoreContext';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '../components/ui/Card';
import { Label } from '../components/ui/Label';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { toast } from 'sonner';

export const Route = createFileRoute('/')({
  component: LoginComponent,
});

function LoginComponent() {
  const { user, login } = useStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [shake, setShake] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate({ to: `/${user.role}` });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error('Please enter both username and password.');
      setShake(true);
      return;
    }

    const success = await login(username.trim(), password);
    if (success) {
      toast.success('Logged in successfully!');
    } else {
      toast.error('Invalid credentials');
      setShake(true);
    }
  };

  useEffect(() => {
    if (shake) {
      const timer = setTimeout(() => setShake(false), 400);
      return () => clearTimeout(timer);
    }
  }, [shake]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className={shake ? "animate-shake" : ""}>
        <Card className="w-full max-w-md border-border-custom bg-surface-card shadow-md rounded-2xl">
          <CardHeader className="space-y-2 text-center pb-6">
            <div className="text-3xl font-bold tracking-tight text-[#1E3A5F] font-sans">
              JaiSakthi Packaging
            </div>
            <CardTitle className="text-sm font-semibold text-text-muted uppercase tracking-wider">
              Enterprise Operations Portal
            </CardTitle>
            <CardDescription className="text-xs text-text-muted/80">
              Enter your department credentials to gain access
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="e.g. manager, sales, dispatch"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="rounded-lg border-border-custom bg-white"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="rounded-lg border-border-custom bg-white"
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                className="w-full rounded-lg py-3 mt-4 text-sm font-semibold tracking-wide bg-[#1D4ED8] hover:bg-[#1E40AF] text-white"
              >
                Sign In
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
