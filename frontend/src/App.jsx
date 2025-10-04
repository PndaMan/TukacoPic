import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect, useState } from 'react';
import useAuthStore from './store/authStore';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import LeaderboardPage from './pages/LeaderboardPage';
import ProfilePage from './pages/ProfilePage';
import UploadPage from './pages/UploadPage';
import PublicProfilePage from './pages/PublicProfilePage';
import FriendsPage from './pages/FriendsPage';
import MessagesPage from './pages/MessagesPage';
import TukacodlePage from './pages/TukacodlePage';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  const { checkAuth } = useAuthStore();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Check authentication status on app load
    const initAuth = async () => {
      await checkAuth();
      setIsInitialized(true);
    };
    initAuth();
  }, []); // Empty dependency array to run only once on mount

  if (!isInitialized) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<LeaderboardPage />} />
          <Route path="/vote" element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          } />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/profile" element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          } />
          <Route path="/upload" element={
            <ProtectedRoute>
              <UploadPage />
            </ProtectedRoute>
          } />
          <Route path="/friends" element={
            <ProtectedRoute>
              <FriendsPage />
            </ProtectedRoute>
          } />
          <Route path="/messages" element={
            <ProtectedRoute>
              <MessagesPage />
            </ProtectedRoute>
          } />
          <Route path="/messages/:userId" element={
            <ProtectedRoute>
              <MessagesPage />
            </ProtectedRoute>
          } />
          <Route path="/users/:userId" element={<PublicProfilePage />} />
          <Route path="/tukacodle" element={<TukacodlePage />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;