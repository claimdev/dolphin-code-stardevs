import React, { useState, useEffect } from 'react';
import { MessageCircle, Code, GraduationCap, Users, Github, Twitter, MessageSquare } from 'lucide-react';
import { DiscordStats } from '../types';
import { apiUtils } from '../utils/api';

const Home: React.FC = () => {
  const [stats, setStats] = useState<DiscordStats>({
    memberCount: 111,
    activeProjects: 23,
    contributors: 127,
    codeCommits: '1.2k',
    lastUpdated: new Date().toISOString()
  });

  useEffect(() => {
    const loadStats = async () => {
      const response = await apiUtils.getDiscordStats();
      if (response.success && response.data) {
        setStats(response.data);
      }
    };
    loadStats();
  }, []);

  const handleJoinDiscord = () => {
    window.open('https://discord.gg/kDVhe4zkUB', '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          {/* Logo and Hero Section */}
          <div className="mb-12">
            <div className="inline-block mb-8">
              <img 
                src="/logo.png" 
                alt="Star Devs Logo" 
                className="w-24 h-24 mx-auto rounded-3xl shadow-2xl shadow-purple-600/25 animate-pulse"
              />
            </div>
            
            <h1 className="text-6xl sm:text-7xl font-bold mb-6">
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-blue-500 bg-clip-text text-transparent animate-gradient bg-300% bg-gradient-to-r">
                Star Devs
              </span>
            </h1>
            
            <div className="space-y-4 text-gray-300 text-lg sm:text-xl max-w-3xl mx-auto">
              <p>
                Welcome to <span className="text-blue-400 font-semibold">Star Devs</span>, a thriving community of{' '}
                <span className="text-white font-bold text-2xl bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  {stats.memberCount}
                </span>{' '}
                passionate developers.
              </p>
              <p>
                Join us to connect, learn, and grow together in a supportive environment.
              </p>
            </div>
          </div>

          {/* Discord Button */}
          <div className="flex justify-center mb-16">
            <button 
              onClick={handleJoinDiscord}
              className="group inline-flex items-center space-x-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold px-8 py-4 rounded-2xl shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 transition-all duration-300 transform hover:scale-105"
            >
              <MessageCircle className="w-6 h-6 group-hover:animate-bounce" />
              <span className="text-lg">Join the Discord!</span>
            </button>
          </div>

          {/* Why Star Devs Section */}
          <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700 rounded-3xl p-8 mb-16">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-12">
              Why Star Devs?
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Code Together */}
              <div className="text-center group">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Code className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-4">Code Together</h3>
                <p className="text-gray-400 leading-relaxed">
                  Collaborate on exciting projects and build amazing things together.
                </p>
              </div>

              {/* Learn & Grow */}
              <div className="text-center group">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl mb-6 group-hover:scale-110 transition-transform duration-300">
                  <GraduationCap className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-4">Learn & Grow</h3>
                <p className="text-gray-400 leading-relaxed">
                  Share knowledge, get mentorship, and level up your skills.
                </p>
              </div>

              {/* Community */}
              <div className="text-center group">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-4">Community</h3>
                <p className="text-gray-400 leading-relaxed">
                  Connect with like-minded developers in a supportive environment.
                </p>
              </div>
            </div>
          </div>

          {/* Last Updated */}
          <div className="text-center">
            <p className="text-xs text-gray-500">
              Stats last updated: {new Date(stats.lastUpdated).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900/50 border-t border-gray-800 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img 
                src="/logo.png" 
                alt="Star Devs Logo" 
                className="w-8 h-8 rounded-lg"
              />
              <span className="text-lg font-semibold text-white">Star Devs Community</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Github className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <MessageSquare className="w-5 h-5" />
              </a>
            </div>
            
            <div className="text-sm text-gray-500">
              © 2025 Star Devs. Built with ❤️ by Dolphin_dev
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
