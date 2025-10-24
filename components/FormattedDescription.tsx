
import React from 'react';

export const FormattedDescription: React.FC<{ text: string }> = ({ text }) => {
    if (!text) return null;

    const renderText = (txt: string) => {
        const parts = txt.split(/(\*\*.*?\*\*|`.*?`)/g).filter(Boolean);
        return parts.map((part, index) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={index} className="font-bold text-cyan-400">{part.substring(2, part.length - 2)}</strong>;
            }
            if (part.startsWith('`') && part.endsWith('`')) {
                return <code key={index} className="bg-gray-900 text-yellow-300 px-1 py-0.5 rounded text-xs font-mono">{part.substring(1, part.length - 1)}</code>;
            }
            return part;
        });
    };

    const lines = text.split('\n').map((line, i) => {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('* ')) {
            return <li key={i}>{renderText(trimmedLine.substring(2))}</li>;
        }
        if (trimmedLine) {
           return <div key={i}>{renderText(trimmedLine)}</div>;
        }
        return null;
    }).filter(Boolean);
    
    // Group list items
    const groupedElements: React.ReactNode[] = [];
    let currentList: React.ReactNode[] = [];

    lines.forEach((line, index) => {
        if (React.isValidElement(line) && line.type === 'li') {
            currentList.push(line);
        } else {
            if (currentList.length > 0) {
                groupedElements.push(<ul key={`ul-${index}`} className="list-disc list-inside space-y-1 my-2 pl-2">{currentList}</ul>);
                currentList = [];
            }
            groupedElements.push(line);
        }
    });

    if (currentList.length > 0) {
        groupedElements.push(<ul key="ul-last" className="list-disc list-inside space-y-1 my-2 pl-2">{currentList}</ul>);
    }
    
    return <div className="text-sm text-gray-300 whitespace-pre-wrap space-y-2">{groupedElements}</div>;
};
