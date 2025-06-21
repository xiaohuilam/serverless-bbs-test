import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';

// Layouts
import Layout from './components/Layout';

// Page Imports
import IndexPage from './pages/IndexPage';
import NodePage from './pages/NodePage';
import ThreadPage from './pages/ThreadPage';
import NewThreadPage from './pages/NewThreadPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import NotificationsPage from './pages/NotificationsPage';
import UserThreadsPage from './pages/UserThreadsPage';
import SearchPage from './pages/SearchPage';
import RankingsPage from './pages/RankingsPage';

// Admin Page Imports
import AdminLoginPage from './pages/admin/LoginPage';
import AdminDashboardPage from './pages/admin/DashboardPage';
import AdminUsersPage from './pages/admin/UsersPage';
import AdminContentPage from './pages/admin/ContentPage';
import AdminRepliesPage from './pages/admin/RepliesPage';
import AdminNodesPage from './pages/admin/NodesPage'; // 1. 引入新页面

import { useAuth } from './hooks/useAuth';

// Private Route for standard users
const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div>Loading...</div>;
  return isAuthenticated ? children : <Navigate to="/auth" />;
};

// Private Route for admin area
const AdminPrivateRoute = ({ children }: { children: JSX.Element }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/admin/login" />;
};

// Component to handle all user-facing routes with the main Layout
const MainApp = () => {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<IndexPage />} />
        <Route path="/nodes/:nodeId" element={<NodePage />} />
        <Route path="/threads/:threadId" element={<ThreadPage />} />
        <Route path="/new-thread/:nodeId" element={<PrivateRoute><NewThreadPage /></PrivateRoute>} />
        <Route path="/users/:username" element={<ProfilePage />} />
        {/* 2. 添加用户主题列表页的路由 */}
        <Route path="/users/:username/threads" element={<UserThreadsPage />} />
        <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
        <Route path="/notifications" element={<PrivateRoute><NotificationsPage /></PrivateRoute>} />
        <Route path="/search" element={<SearchPage />} /> {/* 2. 添加搜索结果页的路由 */}
        <Route path="/rankings" element={<RankingsPage />} /> {/* 2. 添加排行榜页面的路由 */}
        {/* Fallback for any other route inside the main app */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Admin routes (no main layout) */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin/dashboard" element={<AdminPrivateRoute><AdminDashboardPage /></AdminPrivateRoute>} />
        <Route path="/admin/users" element={<AdminPrivateRoute><AdminUsersPage /></AdminPrivateRoute>} />
        <Route path="/admin/content/threads" element={<AdminPrivateRoute><AdminContentPage /></AdminPrivateRoute>} />
        <Route path="/admin/content/replies" element={<AdminPrivateRoute><AdminRepliesPage /></AdminPrivateRoute>} /> {/* 2. 添加回帖管理路由 */}
        <Route path="/admin/setting/nodes" element={<AdminPrivateRoute><AdminNodesPage /></AdminPrivateRoute>} /> {/* 2. 添加版块管理路由 */}
        <Route path="/admin/*" element={<Navigate to="/admin/login" replace />} />

        {/* All user-facing routes are handled by MainApp */}
        <Route path="/*" element={<MainApp />} />
      </Routes>
    </Router>
  );
}

export default App;
