
import React from 'react';

interface AIInsightsPanelProps {
  isLoading: boolean;
  content: string | null;
  topologyName?: string | null;
}

const Section: React.FC<{ title: string; content: string[] }> = ({ title, content }) => {
  const renderContent = (item: string) => {
    const parts = item.split(/(\*\*.*?\*\*)/g).filter(part => part.length > 0);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-bold text-cyan-400">{part.substring(2, part.length - 2)}</strong>;
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div>
      <h4 className="font-semibold text-cyan-300 mb-2">{title}</h4>
      <div className="space-y-1 text-sm text-gray-300">
        {content.map((item, index) => {
           if(title.toLowerCase().includes('advantages') || title.toLowerCase().includes('disadvantages') || title.toLowerCase().includes('recommendations')) {
               return <div key={index} className="flex items-start"><span className="mr-2 mt-1">•</span><span>{renderContent(item)}</span></div>;
           }
           return <p key={index}>{renderContent(item)}</p>
        })}
      </div>
    </div>
  );
};

const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({ isLoading, content, topologyName }) => {
  if (isLoading) {
    return (
      <div className="bg-gray-800/60 p-4 space-y-3 animate-fadeIn flex items-center justify-center min-h-[12rem]">
          <div className="flex flex-col items-center">
             <svg className="animate-spin h-8 w-8 text-cyan-400 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-cyan-200">Generating AI Analysis...</p>
          </div>
      </div>
    );
  }

  if (!content) {
    return null;
  }
  
  const sections: { [key: string]: string[] } = {};
  let currentSection = '';

  content.split('\n').forEach(line => {
    line = line.trim();
    if (line.startsWith('**') && line.endsWith('**')) {
      currentSection = line.substring(2, line.length - 2);
      sections[currentSection] = [];
    } else if (currentSection && line) {
        const itemContent = line.startsWith('*') ? line.substring(1).trim() : line;
        if(itemContent) sections[currentSection].push(itemContent);
    }
  });

  const hasError = content.toLowerCase().includes('error');

  return (
    <div className="p-4">
      <h3 className={`text-lg font-bold ${hasError ? 'text-red-400' : 'text-cyan-300'}`}>
        {hasError ? 'Analysis Failed' : 'Topology Analysis'}
      </h3>
       {topologyName && !hasError && (
          <p className="text-sm text-cyan-200 font-semibold mt-3">
              Identified Network: <span className="text-white font-normal">{topologyName}</span>
          </p>
      )}
      <div className="mt-3 space-y-4">
        {hasError && Object.keys(sections).length === 0 ? <p className="text-red-300">{content}</p> : null}
        {Object.entries(sections).map(([title, sectionContent]) => {
          if (sectionContent.length === 0) return null;
          return <Section key={title} title={title} content={sectionContent} />;
        })}
      </div>
    </div>
  );
};

export default AIInsightsPanel;
