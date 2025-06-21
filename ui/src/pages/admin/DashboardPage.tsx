import React, { useEffect, useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { apiClient } from '@/lib/api';

const InfoRow = ({ label, children }: { label: string, children: React.ReactNode }) => (
    <tr className="border-b border-gray-200">
        <td className="px-4 py-3 text-sm text-gray-600 w-48">{label}</td>
        <td className="px-4 py-3 text-sm text-gray-800">{children}</td>
    </tr>
);

interface Stats {
    userCount: number;
    threadCount: number;
    replyCount: number;
}

const DashboardPage = () => {
    const [stats, setStats] = useState<Stats>({ userCount: 0, threadCount: 0, replyCount: 0 });

    useEffect(() => {
        // 修复：使用箭头函数来正确处理 Promise 的解析值
        apiClient.get<Stats>('/admin/stats')
            .then(data => {
                if (data) {
                    setStats(data);
                }
            })
            .catch(console.error);
    }, []);

    return (
        <AdminLayout>
            <div className="bg-white p-6 border rounded-sm shadow-sm">
                <h2 className="text-lg font-semibold text-gray-700 mb-4 border-b pb-3">系统信息</h2>
                <table className="w-full">
                    <tbody>
                        <InfoRow label="软件版本">ServerlessDiscuz!-v1.0</InfoRow>
                        <InfoRow label="用户总数">{stats.userCount}</InfoRow>
                        <InfoRow label="主题总数">{stats.threadCount}</InfoRow>
                        <InfoRow label="回复总数">{stats.replyCount}</InfoRow>
                    </tbody>
                </table>
            </div>
        </AdminLayout>
    );
};

export default DashboardPage;
