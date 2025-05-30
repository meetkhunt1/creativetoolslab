import React from 'react';
import { BookOpen } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center mb-4 md:mb-0">
            <BookOpen className="text-indigo-600 mr-3" size={28} />
            <h1 className="text-2xl font-bold text-gray-800">Button Hover Gallery</h1>
          </div>
          <p className="text-gray-600 text-sm md:text-base">
            A collection of beautiful button hover effects with copy-to-clipboard functionality
          </p>
        </div>
      </div>
    </header>
  );
};

export default Header;