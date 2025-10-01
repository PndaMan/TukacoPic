import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import useAuthStore from '../store/authStore';

const Layout = ({ children }) => {
  const { isAuthenticated, user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setMobileMenuOpen(false);
    navigate('/login');
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-2" onClick={closeMobileMenu}>
                <img src="/logo.png" alt="TukacoPic" className="h-8 w-8" />
                <span className="text-xl sm:text-2xl font-bold text-primary">TukacoPic</span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6">
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

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-primary hover:bg-gray-100 focus:outline-none"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  {mobileMenuOpen ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link
                to="/leaderboard"
                onClick={closeMobileMenu}
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary hover:bg-gray-50"
              >
                Leaderboard
              </Link>

              {isAuthenticated ? (
                <>
                  <Link
                    to="/"
                    onClick={closeMobileMenu}
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary hover:bg-gray-50"
                  >
                    Vote
                  </Link>
                  <Link
                    to="/upload"
                    onClick={closeMobileMenu}
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary hover:bg-gray-50"
                  >
                    Upload
                  </Link>
                  <Link
                    to="/profile"
                    onClick={closeMobileMenu}
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary hover:bg-gray-50"
                  >
                    Profile
                  </Link>
                  <div className="px-3 py-2 text-sm text-gray-700 font-medium">
                    Hi, {user?.username}
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary hover:bg-gray-50"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={closeMobileMenu}
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary hover:bg-gray-50"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    onClick={closeMobileMenu}
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary hover:bg-gray-50"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      <main className="max-w-7xl mx-auto py-4 sm:py-8 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;