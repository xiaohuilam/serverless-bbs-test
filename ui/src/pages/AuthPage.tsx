import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from "@/components/ui/use-toast";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';

export default function AuthPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  // 注册 Passkey
  const handleRegister = async () => {
    setIsRegistering(true);
    try {
      // 1. 从后端获取注册选项 (challenge)
      const regOptions = await apiClient.post('/auth/register/challenge', { username, email });
      
      // 2. 使用浏览器 API 创建凭证
      const attestation = await startRegistration(regOptions);

      // 3. 将结果发送到后端进行验证
      const verificationResponse = await apiClient.post<{verified: boolean, token: string}>(
          '/auth/register/verify', 
          { userId: regOptions.user.id, response: attestation }
      );
      
      if (verificationResponse.verified && verificationResponse.token) {
        toast({ title: "注册成功", description: "您已成功注册并登录。" });
        login(verificationResponse.token);
        navigate('/');
      } else {
        throw new Error('Passkey verification failed.');
      }
    } catch (error) {
      toast({ title: "注册失败", description: `${error}`, variant: "destructive" });
      console.error(error);
    } finally {
        setIsRegistering(false);
    }
  };

  // 登录 Passkey
  const handleLogin = async () => {
    try {
        // 1. 从后端获取认证选项
        const authOptions = await apiClient.post('/auth/login/challenge', {});
        
        // 2. 使用浏览器 API 获取断言
        const assertion = await startAuthentication(authOptions);

        // 3. 将结果发送到后端进行验证
        const verificationResponse = await apiClient.post<{verified: boolean, token: string}>(
            '/auth/login/verify',
            assertion
        );

        if (verificationResponse.verified && verificationResponse.token) {
            toast({ title: "登录成功", description: "欢迎回来！" });
            login(verificationResponse.token);
            navigate('/');
        } else {
            throw new Error('Login verification failed.');
        }

    } catch (error) {
        toast({ title: "登录失败", description: `${error}`, variant: "destructive" });
        console.error(error);
    }
  };

  return (
    <div className="container mx-auto p-4 flex justify-center items-center h-[80vh]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>欢迎</CardTitle>
          <CardDescription>使用 Passkey (面容ID/指纹/安全密钥) 安全地登录或注册。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">用户名</Label>
            <Input id="username" value={username} onChange={e => setUsername(e.target.value)} placeholder="输入您的用户名" />
          </div>
           <div className="space-y-2">
            <Label htmlFor="email">邮箱</Label>
            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="输入您的邮箱" />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button onClick={handleRegister} className="w-full" disabled={!username || !email || isRegistering}>
            {isRegistering ? '注册中...' : '注册新 Passkey'}
          </Button>
          <Button onClick={handleLogin} variant="outline" className="w-full">使用 Passkey 登录</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
