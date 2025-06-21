import React, { useEffect, useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { apiClient } from '@/lib/api';

const DashboardPage = () => {
    const [stats, setStats] = useState({ userCount: 0, threadCount: 0, replyCount: 0 });

    useEffect(() => {
        apiClient.get('/admin/stats').then(setStats).catch(console.error);
    }, []);

    return (
        <AdminLayout>
            <div className="bg-white p-6 border rounded-sm">
                <h2 className="text-lg font-bold mb-4 border-b pb-2">系统信息</h2>
                <ul className="text-sm space-y-2">
                    <li>软件版本: ServerlessDiscuz!-v1.0</li>
                    <li>用户总数: {stats.userCount}</li>
                    <li>主题总数: {stats.threadCount}</li>
                    <li>回复总数: {stats.replyCount}</li>
                </ul>
            </div>
        </AdminLayout>
    );
};

export default DashboardPage;
