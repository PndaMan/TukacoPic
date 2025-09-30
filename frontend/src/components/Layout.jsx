import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

const Layout = ({ children }) => {
  const { isAuthenticated, user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-2">
                <img src="/logo.png" alt="TukacoPic" className="h-8 w-8" />
                <span className="text-2xl font-bold text-primary">TukacoPic</span>
              </Link>
            </div>

            <div className="flex items-center space-x-6">
              <Link
                to="/leaderboard"
                className="text-gray-700 hover:text-primary font-medium transition duration-200"
              >
                Leaderboard
              </Link>

              {isAuthenticated ? (
                <>
                  <Link
                    to="/"
                    className="text-gray-700 hover:text-primary font-medium transition duration-200"
                  >
                    Vote
                  </Link>
                  <Link
                    to="/upload"
                    className="text-gray-700 hover:text-primary font-medium transition duration-200"
                  >
                    Upload
                  </Link>
                  <Link
                    to="/profile"
                    className="text-gray-700 hover:text-primary font-medium transition duration-200"
                  >
                    Profile
                  </Link>
                  <div className="flex items-center space-x-3">
                    <span className="text-gray-700 font-medium">
                      Hi, {user?.username}
                    </span>
                    <button
                      onClick={handleLogout}
                      className="btn-secondary text-sm"
                    >
                      Logout
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-center space-x-3">
                  <Link
                    to="/login"
                    className="text-gray-700 hover:text-primary font-medium transition duration-200"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="btn-primary text-sm"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;