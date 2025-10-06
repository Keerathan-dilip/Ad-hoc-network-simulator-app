
import React, { useState, useEffect, useRef } from 'react';
import { Node, Connection, NetworkTopology } from '../types';
import { networkGenerationService } from '../services/networkGenerationService';
import { geminiService } from '../services/geminiService';
import { FormattedDescription } from './FormattedDescription';


interface ChatbotProps {
    setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
    setConnections: React.Dispatch<React.SetStateAction<Connection[]>>;
    setClusterHeadIds: React.Dispatch<React.SetStateAction<string[]>>;
}

type ConversationStage = 'GREETING' | 'ASK_TOPOLOGY' | 'ASK_NODE_COUNT' | 'CONFIRM' | 'GENERATING' | 'EXPLAINING';

interface Message {
    sender: 'bot' | 'user';
    text: string | React.ReactNode;
}

const TOPOLOGIES: NetworkTopology[] = ['cluster', 'mesh', 'cluster-mesh', 'star', 'ring', 'bus', 'grid', 'random'];

const Chatbot: React.FC<ChatbotProps> = ({ setNodes, setConnections, setClusterHeadIds }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [stage, setStage] = useState<ConversationStage>('GREETING');
    const [userInput, setUserInput] = useState('');
    const [isBotTyping, setIsBotTyping] = useState(false);

    const [topology, setTopology] = useState<NetworkTopology | null>(null);
    const [nodeCount, setNodeCount] = useState<number | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages, isBotTyping]);

    const addMessage = (sender: 'bot' | 'user', text: string | React.ReactNode) => {
        setMessages(prev => [...prev, { sender, text }]);
    };

    const handleBotTurn = (nextStage: ConversationStage, message?: string | React.ReactNode) => {
        setIsBotTyping(true);
        setTimeout(() => {
            if (message) {
                addMessage('bot', message);
            }
            setStage(nextStage);
            setIsBotTyping(false);
        }, 800 + Math.random() * 400);
    };

    useEffect(() => {
        if (isOpen) {
            if (messages.length === 0) {
                handleBotTurn('GREETING', "Hello! I'm here to help you generate a network. What kind of network topology would you like to create?");
            }
        }
    }, [isOpen, messages.length]);

    const resetConversation = () => {
        setMessages([]);
        setTopology(null);
        setNodeCount(null);
        handleBotTurn('GREETING', "Let's start over. What kind of network topology would you like to create?");
    };

    const handleGenerateNetwork = async () => {
        if (!topology || !nodeCount) return;

        handleBotTurn('GENERATING', `Great! I'm now generating a ${topology} network with ${nodeCount} nodes...`);

        const { nodes, connections, clusterHeadIds } = networkGenerationService.generateNetworkLayout(
            nodeCount, topology, true, false, Math.max(2, Math.floor(nodeCount / 15)),
            { width: 3000, height: 2000 } // Default canvas dimensions
        );

        setNodes(nodes);
        setConnections(connections);
        setClusterHeadIds(clusterHeadIds);

        // TODO: The method getTopologyDescription does not exist. It needs to be added to geminiService.
        if (typeof (geminiService as any).getTopologyDescription !== 'function') {
            console.error("geminiService.getTopologyDescription is not implemented.");
            handleBotTurn('EXPLAINING', <>
                <p>Your network has been created! You can switch to the 'Visual Builder' tab to see it.</p>
                <button onClick={resetConversation} className="mt-3 text-xs bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-1 px-2 rounded">
                    Create Another Network
                </button>
            </>);
            return;
        }

        const description = await (geminiService as any).getTopologyDescription(topology);
        handleBotTurn('EXPLAINING', <>
            <p>Your network has been created! You can switch to the 'Visual Builder' tab to see it.</p>
            <p className="mt-2">Here's a little more about the <strong>{topology}</strong> topology:</p>
            <div className="mt-2 text-xs bg-gray-900/50 p-2 rounded">
                <FormattedDescription text={description} />
            </div>
            <button onClick={resetConversation} className="mt-3 text-xs bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-1 px-2 rounded">
                Create Another Network
            </button>
        </>);
    };

    const handleUserInput = (e: React.FormEvent) => {
        e.preventDefault();
        if (!userInput.trim() || isBotTyping) return;

        addMessage('user', userInput);
        const inputLower = userInput.toLowerCase();

        if (stage === 'GREETING' || stage === 'ASK_TOPOLOGY') {
            const foundTopology = TOPOLOGIES.find(t => inputLower.includes(t));
            if (foundTopology) {
                setTopology(foundTopology);
                handleBotTurn('ASK_NODE_COUNT', `Excellent choice! How many nodes would you like in your ${foundTopology} network?`);
            } else {
                handleBotTurn('ASK_TOPOLOGY', "I'm not familiar with that topology. Please choose from: cluster, mesh, star, ring, bus, grid, or random.");
            }
        } else if (stage === 'ASK_NODE_COUNT') {
            const count = parseInt(inputLower.match(/\d+/)?.[0] || '', 10);
            if (!isNaN(count) && count > 0 && count <= 450) {
                setNodeCount(count);
                handleBotTurn('CONFIRM', `Perfect. A ${topology} network with ${count} nodes. Shall I proceed? (yes/no)`);
            } else {
                handleBotTurn('ASK_NODE_COUNT', "Please provide a valid number of nodes between 1 and 450.");
            }
        } else if (stage === 'CONFIRM') {
            if (inputLower.includes('yes') || inputLower.includes('ok') || inputLower.includes('proceed')) {
                handleGenerateNetwork();
            } else {
                resetConversation();
            }
        }

        setUserInput('');
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 right-6 bg-cyan-500 hover:bg-cyan-600 text-white rounded-full p-4 shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-cyan-400 transition-transform transform hover:scale-110 z-20"
                aria-label="Open network generator chatbot"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                    <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h1a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                </svg>
            </button>
            {isOpen && (
                <div className="fixed bottom-24 right-6 w-96 h-[32rem] bg-gray-800/80 backdrop-blur-md border border-cyan-500/30 rounded-lg shadow-2xl flex flex-col animate-fadeIn z-20">
                    <header className="bg-gray-900/50 p-3 border-b border-cyan-500/20 flex justify-between items-center">
                        <h3 className="font-bold text-cyan-300">AI Network Generator</h3>
                        <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
                    </header>
                    <div className="flex-grow p-4 overflow-y-auto space-y-4">
                        {messages.map((msg, index) => (
                            <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${msg.sender === 'user' ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-200'}`}>
                                    {typeof msg.text === 'string' ? <p className="text-sm">{msg.text}</p> : msg.text}
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
                            placeholder={isBotTyping ? "..." : "Type your message..."}
                            disabled={isBotTyping || stage === 'GENERATING' || stage === 'EXPLAINING'}
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
