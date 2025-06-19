import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Breadcrumbs from '@/components/Breadcrumbs';
import { Select, SelectContent, SelectTrigger, SelectValue } from './ui/select';
import { SelectItem } from '@radix-ui/react-select';
import { Search } from 'lucide-react';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('threads');

  const handleSearch = () => {
      if (!searchTerm.trim()) return;
      navigate(`/search?q=${encodeURIComponent(searchTerm)}&type=${searchType}`);
  };

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F5]">
      {/* 顶部用户信息栏 */}
      <div className="bg-white border-b border-[#E5EDF2] text-xs">
        <div className="max-w-[960px] mx-auto px-4 h-8 flex justify-end items-center space-x-4 text-[#666]">
            {isAuthenticated && user ? (
              <>
                <strong className="text-black">{user.username}</strong>
                <span>|</span>
                <a href="/settings" className="hover:text-red-500">我的设置</a>
                <span>|</span>
                <a href="/notifications" className="hover:text-red-500">消息</a>
                <span>|</span>
                <a href="#" onClick={handleLogout} className="hover:text-red-500">退出</a>
              </>
            ) : (
              <>
                <a href="/auth" className="text-[#336699] hover:text-red-500">登录</a>
                <span>|</span>
                <a href="/auth" className="text-[#336699] hover:text-red-500">注册</a>
              </>
            )}
        </div>
      </div>
      
      {/* 主 Logo 和搜索栏 */}
      <div className="bg-white py-4 shadow-sm">
        <div className="max-w-[960px] mx-auto flex justify-between items-center">
          <Link to="/" className="flex-shrink-0">
            <h1 className="text-3xl font-bold text-[#336699] tracking-tighter">HOSTLOC.COM</h1>
            <p className="text-xs text-gray-400">全球主机交流</p>
          </Link>
          {/* 更新后的搜索框 */}
            <div className="flex items-center">
                <Input 
                    type="text" 
                    placeholder="请输入搜索内容" 
                    className="w-56 h-8 text-xs rounded-r-none border-gray-300 focus:border-gray-600"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Select value={searchType} onValueChange={setSearchType}>
                    <SelectTrigger className="w-[70px] h-8 rounded-none text-xs border-l-0 border-gray-300">
                        {searchType === 'threads' ? '帖子' : '用户'}
                    </SelectTrigger>
                    <SelectContent className='bg-white dark:bg-gray-800'>
                        <SelectItem className='cursor-pointer' value="threads">帖子</SelectItem>
                        <SelectItem className='cursor-pointer' value="users">用户</SelectItem>
                    </SelectContent>
                </Select>
                <Button className="h-8 bg-[#336699] hover:bg-[#2366A8] rounded-l-none" onClick={handleSearch}>
                    <Search className='w-[16px] text-white' />
                </Button>
            </div>
        </div>
      </div>

      {/* 主导航 */}
      <div className="bg-[#336699] text-white shadow-inner">
         <div className="max-w-[960px] mx-auto h-10 flex justify-between items-center">
            <div className="flex items-center">
                <Link to="/" className="h-10 font-bold text-sm bg-[#12406f] px-4 py-2 rounded-sm">论坛</Link>
                <Link to="/rankings" className="h-10 font-bold text-sm hover:bg-[#12406f] px-4 py-2 rounded-sm">排行榜</Link>
            </div>
         </div>
      </div>
      
      {/* 面包屑导航和公告区 */}
      <Breadcrumbs />

      <main className="flex-grow w-full">
        {children}
      </main>

      <footer className="w-full mt-8">
          <div className="max-w-[960px] mx-auto py-4 px-4 text-center text-xs text-[#666] border-t border-[#CDCDCD]">
            <p>Powered by <strong>Discuz! X3.5</strong></p>
            <p className="mt-1">© 2001-2025 Comsenz Inc.</p>
          </div>
      </footer>
    </div>
  );
}
