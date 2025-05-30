import React, { useState } from 'react';
import ButtonCard from './components/ButtonCard';
import Header from './components/Header';
import { buttonEffects } from './data/buttonEffects';
import './styles/App.css';

function App() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, css: string) => {
    navigator.clipboard.writeText(css)
      .then(() => {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
      });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {buttonEffects.map((effect) => (
            <ButtonCard 
              key={effect.id}
              effect={effect}
              isCopied={copiedId === effect.id}
              onCopy={handleCopy}
            />
          ))}
        </div>
      </main>
      <footer className="container mx-auto px-4 py-8 text-center text-gray-500 text-sm">
        <p>Created with ❤️ | Button Hover Effects Gallery © {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}

export default App;