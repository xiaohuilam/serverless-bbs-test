import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { startAuthentication } from '@simplewebauthn/browser';
import type { PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/types';

export default function AdminLoginPage() {
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const { toast } = useToast();

    const handleLogin = async () => {
        setIsLoading(true);
        try {
            const authOptions = await apiClient.post<PublicKeyCredentialRequestOptionsJSON>('/admin/login/challenge', {});
            const assertion = await startAuthentication(authOptions);
            const { verified, token } = await apiClient.post<{ verified: boolean; token: string }>('/admin/login/verify', assertion);

            if (verified && token) {
                localStorage.setItem('admin_token', token);
                navigate('/admin/dashboard');
            } else {
                throw new Error('Admin verification failed.');
            }
        } catch (error: any) {
            toast({ title: '登录失败', description: error.message || '无法使用Passkey登录。', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-[#004B8D] min-h-screen flex items-center justify-center">
            <div className="w-full max-w-sm text-center">
                <h1 className="text-white text-5xl mb-8 font-thin">phpwind</h1>
                <div className="bg-white p-8 rounded-sm shadow-lg">
                    <h2 className="text-xl text-gray-700 mb-6">管理员登录</h2>
                    <button
                        onClick={handleLogin}
                        disabled={isLoading}
                        className="w-full bg-[#008DD1] hover:bg-[#007AB8] text-white font-bold py-3 px-4 rounded-sm transition duration-300 disabled:bg-gray-400"
                    >
                        {isLoading ? '验证中...' : '使用 Passkey 登录'}
                    </button>
                </div>
            </div>
        </div>
    );
}
