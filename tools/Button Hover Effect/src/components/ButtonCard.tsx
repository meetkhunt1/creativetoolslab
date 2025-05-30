import React from 'react';
import { Clipboard, Check } from 'lucide-react';
import { ButtonEffect } from '../types';
import '../styles/ButtonCard.css';

interface ButtonCardProps {
  effect: ButtonEffect;
  isCopied: boolean;
  onCopy: (id: string, css: string) => void;
}

const ButtonCard: React.FC<ButtonCardProps> = ({ effect, isCopied, onCopy }) => {
  return (
    <div 
      className="button-card bg-white rounded-lg shadow-md overflow-hidden transition-all hover:shadow-lg"
    >
      <div className="p-6 flex flex-col items-center">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">{effect.name}</h3>
        <div className="button-preview flex items-center justify-center w-full h-24 bg-gray-50 rounded-md mb-4">
          <button className={`btn ${effect.className}`}>{effect.label}</button>
        </div>
        <button
          className="copy-button flex items-center space-x-2 text-sm font-medium px-3 py-2 rounded-md bg-gray-100 hover:bg-gray-200 transition-colors relative"
          onClick={() => onCopy(effect.id, effect.css)}
          aria-label="Copy CSS"
        >
          <span>{isCopied ? <Check size={16} /> : <Clipboard size={16} />}</span>
          <span>{isCopied ? 'Copied!' : 'Copy CSS'}</span>
          
          {isCopied && (
            <span className="tooltip">
              Copied to clipboard!
            </span>
          )}
        </button>
      </div>
      <div className="code-container bg-gray-50 border-t border-gray-100 p-4 overflow-x-auto">
        <pre className="text-xs text-gray-700 whitespace-pre"><code>{effect.css}</code></pre>
      </div>
    </div>
  );
};

export default ButtonCard;