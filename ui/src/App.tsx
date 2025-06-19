import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import IndexPage from './pages/IndexPage';
import NodePage from './pages/NodePage';
import ThreadPage from './pages/ThreadPage';
import NewThreadPage from './pages/NewThreadPage';
import AuthPage from './pages/AuthPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import NotificationsPage from './pages/NotificationsPage';
import UserThreadsPage from './pages/UserThreadsPage'; // 1. 引入新页面
import { useAuth } from './hooks/useAuth';
import SearchPage from './pages/SearchPage';

function PrivateRoute({ children }: { children: JSX.Element }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div>Loading...</div>;
  return isAuthenticated ? children : <Navigate to="/auth" />;
}

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<IndexPage />} />
          <Route path="/nodes/:nodeId" element={<NodePage />} />
          <Route path="/threads/:threadId" element={<ThreadPage />} />
          <Route path="/new-thread/:nodeId" element={<PrivateRoute><NewThreadPage /></PrivateRoute>} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/users/:username" element={<ProfilePage />} />
          {/* 2. 添加用户主题列表页的路由 */}
          <Route path="/users/:username/threads" element={<UserThreadsPage />} />
          <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
          <Route path="/notifications" element={<PrivateRoute><NotificationsPage /></PrivateRoute>} />
          <Route path="/search" element={<SearchPage />} /> {/* 2. 添加搜索结果页的路由 */}
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
