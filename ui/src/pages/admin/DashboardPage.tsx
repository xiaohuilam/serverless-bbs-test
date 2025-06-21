import React, { useEffect, useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { apiClient } from '@/lib/api';

const InfoRow = ({ label, children }: { label: string, children: React.ReactNode }) => (
    <tr className="border-0 border-gray-200">
        <td className="px-2 py-1 text-[12px] text-[#666] w-48">{label}</td>
        <td className="px-2 py-1 text-[12px] text-[#666]">{children}</td>
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
            <div className="space-y-6">
                <table className="w-full">
                    <tbody>
                        <tr>
                            <td colSpan={2}>
                                <h2 className="bg-[#e6e6e6] text-[#666] px-[9px] py-[5px] border-y border-b-white border-t-[#ddd]">系统信息</h2>
                            </td>
                        </tr>
                        <InfoRow label="软件版本">ServerlessDiscuz!-v1.0 查看最新版本</InfoRow>
                        <InfoRow label="PHP版本">5.6.40-68+0~20230902.80+debian12~1.gbpa2012b</InfoRow>
                        <InfoRow label="MYSQL版本">5.5.5-10.11.4-MariaDB-1~deb12u1</InfoRow>
                        <InfoRow label="服务器端信息">nginx/1.22.1</InfoRow>
                        <InfoRow label="最大上传限制">1024M</InfoRow>
                        <InfoRow label="最大执行时间">30 seconds</InfoRow>
                        <InfoRow label="邮件支持模式">Unix Sendmail ( Path: /usr/sbin/sendmail -t -i )</InfoRow>
                        <InfoRow label="用户总数">{stats.userCount}</InfoRow>
                        <InfoRow label="主题总数">{stats.threadCount}</InfoRow>
                        <InfoRow label="回复总数">{stats.replyCount}</InfoRow>
                    </tbody>
                </table>
                <table className="w-full">
                    <tbody>
                        <tr>
                            <td colSpan={2}>
                                <h2 className="bg-[#e6e6e6] text-[#666] px-[9px] py-[5px] border-y border-b-white border-t-[#ddd]">版权声明</h2>
                            </td>
                        </tr>
                        <InfoRow label="版权没有"><a href='https://github.com/serverless-bbs/serverless-bbs' target='_blank'>https://github.com/serverless-bbs/serverless-bbs</a></InfoRow>
                        <InfoRow label="用户协议"><a href='https://github.com/serverless-bbs/serverless-bbs/blob/master/LICENSE.md' target='_blank'>查看用户协议</a></InfoRow>
                    </tbody>
                </table>
            </div>
        </AdminLayout>
    );
};

export default DashboardPage;
