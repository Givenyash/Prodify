import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { CheckSquare, Loader2, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = await login(email, password);
        
        if (result.success) {
            navigate('/');
        } else {
            setError(result.error);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
            <div className="w-full max-w-md animate-fade-up">
                {/* Logo */}
                <div className="flex items-center justify-center gap-2 mb-8">
                    <CheckSquare className="h-8 w-8 text-primary" strokeWidth={1.5} />
                    <span className="text-2xl font-semibold tracking-tight font-[Outfit]">ProdiFY</span>
                </div>

                <Card className="border-border/50">
                    <CardHeader className="space-y-1 text-center">
                        <CardTitle className="text-2xl">Welcome back</CardTitle>
                        <CardDescription>Enter your credentials to sign in</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div 
                                    data-testid="login-error"
                                    className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm"
                                >
                                    {error}
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    data-testid="login-email-input"
                                    className="focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        data-testid="login-password-input"
                                        className="pr-10 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        data-testid="toggle-password-visibility"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            <Button 
                                type="submit" 
                                className="w-full" 
                                disabled={loading}
                                data-testid="login-submit-button"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Signing in...
                                    </>
                                ) : (
                                    'Sign in'
                                )}
                            </Button>
                        </form>

                        <div className="mt-6 text-center text-sm text-muted-foreground">
                            Don't have an account?{' '}
                            <Link 
                                to="/register" 
                                className="text-primary hover:underline font-medium"
                                data-testid="register-link"
                            >
                                Create one
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
