import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navbar: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-900/80 backdrop-blur-md border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-2 group">
            <div className="w-10 h-10 rounded-lg overflow-hidden group-hover:scale-105 transition-transform duration-300">
              <img 
                src="/logo.png" 
                alt="Star Devs Logo" 
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Star Devs
            </span>
          </Link>

          <div className="flex items-center space-x-8">
            <Link
              to="/"
              className={`px-4 py-2 rounded-lg transition-all duration-300 font-medium ${
                isActive('/') 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25' 
                  : 'text-gray-300 hover:text-white hover:bg-gray-800'
              }`}
            >
              Home
            </Link>
            <Link
              to="/scamlogs"
              className={`px-4 py-2 rounded-lg transition-all duration-300 font-medium ${
                isActive('/scamlogs') 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25' 
                  : 'text-gray-300 hover:text-white hover:bg-gray-800'
              }`}
            >
              Scamlogs
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;