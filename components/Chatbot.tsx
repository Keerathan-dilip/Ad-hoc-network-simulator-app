
import React, { useState, useEffect, useRef } from 'react';
import { Node, Connection } from '../types';
import { geminiService } from '../services/geminiService';
import { FormattedDescription } from './FormattedDescription';

interface ChatbotProps {
    nodes: Node[];
    connections: Connection[];
    topology: string;
    cppCode: string;
    tclCode: string;
    awkCode: string;
    simulationData: any[] | null;
    awkOutput: string | null;
}

interface Message {
    sender: 'bot' | 'user';
    content: React.ReactNode;
    rawText: string;
}

const Chatbot: React.FC<ChatbotProps> = (props) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isBotTyping, setIsBotTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages, isBotTyping]);

    const addMessage = (sender: 'bot' | 'user', content: React.ReactNode, rawText: string) => {
        setMessages(prev => [...prev, { sender, content, rawText }]);
    };
    
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            setIsBotTyping(true);
            setTimeout(() => {
                addMessage(
                    'bot',
                    "Hello! I'm your network analyst assistant. Ask me anything about your network, the code, simulation results, or general networking concepts.",
                    "Hello! I'm your network analyst assistant. Ask me anything about your network, the code, simulation results, or general networking concepts."
                );
                setIsBotTyping(false);
            }, 800);
        }
    }, [isOpen, messages.length]);

    const handleUserInput = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userInput.trim() || isBotTyping) return;

        const userMessage = userInput;
        addMessage('user', userMessage, userMessage);
        setUserInput('');
        setIsBotTyping(true);

        // FIX: Explicitly type historyForApi to match the expected type for the Gemini service chat history.
        const historyForApi: { role: 'user' | 'model'; parts: { text: string }[] }[] = messages.map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'model',
            parts: [{ text: msg.rawText }]
        }));
    
        try {
            const responseText = await geminiService.getChatResponse(userMessage, historyForApi, { ...props });
            addMessage('bot', <FormattedDescription text={responseText} />, responseText);
        } catch (error) {
            console.error("Chatbot error:", error);
            const errorMsg = "Sorry, I encountered an error. Please try again.";
            addMessage('bot', errorMsg, errorMsg);
        } finally {
            setIsBotTyping(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 right-6 bg-cyan-500 hover:bg-cyan-600 text-white rounded-full p-4 shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-cyan-400 transition-transform transform hover:scale-110 z-20"
                aria-label="Open network analyst chatbot"
            >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                </svg>
            </button>
            {isOpen && (
                <div className="fixed bottom-24 right-6 w-96 h-[32rem] bg-gray-800/80 backdrop-blur-md border border-cyan-500/30 rounded-lg shadow-2xl flex flex-col animate-fadeIn z-20">
                    <header className="bg-gray-900/50 p-3 border-b border-cyan-500/20 flex justify-between items-center">
                        <h3 className="font-bold text-cyan-300">AI Network Analyst</h3>
                        <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
                    </header>
                    <div className="flex-grow p-4 overflow-y-auto space-y-4">
                        {messages.map((msg, index) => (
                            <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${msg.sender === 'user' ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-200'}`}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {isBotTyping && (
                            <div className="flex justify-start">
                                <div className="max-w-xs lg:max-w-md px-3 py-2 rounded-lg bg-gray-700 text-gray-200 flex items-center space-x-1">
                                    <span className="h-2 w-2 bg-cyan-300 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                    <span className="h-2 w-2 bg-cyan-300 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                    <span className="h-2 w-2 bg-cyan-300 rounded-full animate-bounce"></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                    <form onSubmit={handleUserInput} className="p-3 border-t border-cyan-500/20">
                        <input
                            type="text"
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            placeholder={isBotTyping ? "..." : "Ask about the network..."}
                            disabled={isBotTyping}
                            className="w-full bg-gray-700 border border-gray-600 rounded-full px-4 py-2 text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none disabled:cursor-not-allowed"
                            aria-label="Chat input"
                        />
                    </form>
                </div>
            )}
        </>
    );
};

export default Chatbot;
