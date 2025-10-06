
import React from 'react';

export const FormattedDescription: React.FC<{ text: string }> = ({ text }) => {
    if (!text) return null;
    const parts = text.split(/(\*\*.*?\*\*)/g).filter(part => part.length > 0);
  
    return (
      <p className="text-sm text-gray-300 whitespace-pre-wrap">
        {parts.map((part, index) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <strong key={index} className="font-bold text-cyan-400">
                {part.substring(2, part.length - 2)}
              </strong>
            );
          }
          return <span key={index}>{part}</span>;
        })}
      </p>
    );
};
