import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Node, Connection, NetworkComponentType, NetworkTopology, AnimatedPacket, DeliveredPacketInfo, SimulationParameters, SensorEventType } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceDot } from 'recharts';
import NetworkCanvas from './NetworkCanvas';
import Toolbar from './Toolbar';
import PropertiesPanel from './PropertiesPanel';
import ConnectionPanel from './ConnectionPanel';
import ReportDashboard from './ReportDashboard';
import { networkAnalysisService } from '../services/networkAnalysisService';
import { geminiService } from '../services/geminiService';
import { pathfindingService } from '../services/pathfindingService';
import AIInsightsPanel from './AIInsightsPanel';
import PacketDeliveryLog from './PacketDeliveryLog';
import { networkGenerationService } from '../services/networkGenerationService';

const WEAK_NODE_EFFICIENCY_THRESHOLD = 85;
const PACKET_ANIMATION_DURATION_AI = 4000; // ms
const PACKET_ANIMATION_DURATION_TRADITIONAL = 5500; // ms
const PACKET_SIMULATION_DURATION = 8000; // 8s
const JIGGLE_AMPLITUDE = 2; // Pixels for node movement in simulation
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 3.0;
const ZOOM_STEP = 0.1;

const SaveNetworkModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    initialContent: string;
    onSave: (fileName: string, content: string) => void;
}> = ({ isOpen, onClose, initialContent, onSave }) => {
    const [fileName, setFileName] = useState('network-config.json');
    const [content, setContent] = useState('');

    useEffect(() => {
        if (isOpen) {
            setContent(initialContent);
            setFileName('network-config.json');
        }
    }, [isOpen, initialContent]);

    if (!isOpen) return null;

    const handleSaveClick = () => {
        onSave(fileName, content);
    };

    const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fadeIn" onClick={handleContainerClick}>
            <div className="bg-gray-800 rounded-lg shadow-xl border border-cyan-500/20 w-full max-w-2xl flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-cyan-500/20 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-cyan-300">Save Network Configuration</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
                </div>
                <div className="p-4 space-y-4 overflow-y-auto">
                    <div>
                        <label htmlFor="save-filename" className="block text-sm font-medium text-gray-300 mb-1">File Name</label>
                        <input
                            id="save-filename"
                            type="text"
                            value={fileName}
                            onChange={(e) => setFileName(e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                        />
                    </div>
                    <div>
                        <label htmlFor="save-content" className="block text-sm font-medium text-gray-300 mb-1">Network Data (JSON) - Editable</label>
                        <textarea
                            id="save-content"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="w-full h-64 bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-white font-mono text-sm resize-y focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                            spellCheck="false"
                        />
                    </div>
                </div>
                <div className="p-4 border-t border-cyan-500/20 flex justify-end items-center space-x-3 bg-gray-800/50 rounded-b-lg">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-500 transition-colors">Cancel</button>
                    <button onClick={handleSaveClick} className="px-4 py-2 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition-colors">Save to File</button>
                </div>
            </div>
        </div>
    );
};

interface VisualBuilderWorkspaceProps {
    nodes: Node[];
    setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
    connections: Connection[];
    setConnections: React.Dispatch<React.SetStateAction<Connection[]>>;
    saveSnapshot: () => void;
    clusterHeadIds: string[];
    setClusterHeadIds: React.Dispatch<React.SetStateAction<string[]>>;
    addToHistory: (name: string) => void;
}

const VisualBuilderWorkspace: React.FC<VisualBuilderWorkspaceProps> = ({ nodes, setNodes, connections, setConnections, saveSnapshot, clusterHeadIds, setClusterHeadIds, addToHistory }) => {
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  
  const [simulationParams, setSimulationParams] = useState<{ 'AI-Based': SimulationParameters; 'Traditional': SimulationParameters; } | null>(null);
  const [analysisContent, setAnalysisContent] = useState<string | null>(null);
  const [identifiedTopology, setIdentifiedTopology] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [isConnectionMode, setIsConnectionMode] = useState(false);
  const [isPacketSimulationMode, setIsPacketSimulationMode] = useState(false);
  const [packetSimSourceNodes, setPacketSimSourceNodes] = useState<string[]>([]);
  const [animatedPackets, setAnimatedPackets] = useState<AnimatedPacket[]>([]);
  const canvasRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mobilityFrameRef = useRef<number | null>(null);
  const [zoom, setZoom] = useState(1);

  // New states for real-time updates and message simulation
  const [hasAnalyzedOnce, setHasAnalyzedOnce] = useState(false);
  const [isReportUpdating, setIsReportUpdating] = useState(false);
  const [packetMessage, setPacketMessage] = useState('This is a test packet transmission. Data integrity check: SUCCESS.');
  const [deliveredPackets, setDeliveredPackets] = useState<DeliveredPacketInfo[]>([]);
  const reportDashboardRef = useRef<HTMLDivElement>(null);
  const [isDownloadingReport, setIsDownloadingReport] = useState(false);
  const [nodeInitialPositions, setNodeInitialPositions] = useState<Map<string, {x: number, y: number}> | null>(null);

  // State for new features
  const [isGeneratingNetwork, setIsGeneratingNetwork] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [isolatedMaliciousNodeIds, setIsolatedMaliciousNodeIds] = useState<string[]>([]);
  const [droppedPacketEvents, setDroppedPacketEvents] = useState<{ id: string, x: number, y: number }[]>([]);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [networkDataToSave, setNetworkDataToSave] = useState('');
  const canvasViewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (canvasViewportRef.current) {
        const { scrollWidth, scrollHeight, clientWidth, clientHeight } = canvasViewportRef.current;
        canvasViewportRef.current.scrollLeft = (scrollWidth - clientWidth) / 2;
        canvasViewportRef.current.scrollTop = (scrollHeight - clientHeight) / 2;
    }
  }, []);

  const stopMobility = useCallback(() => {
    if (mobilityFrameRef.current) {
        cancelAnimationFrame(mobilityFrameRef.current);
        mobilityFrameRef.current = null;
    }
    if (nodeInitialPositions) {
        setNodes(prevNodes => prevNodes.map(n => {
            const initialPos = nodeInitialPositions.get(n.id);
            const { vx, vy, ...rest } = n;
            if (initialPos) {
                return { ...rest, x: initialPos.x, y: initialPos.y };
            }
            return rest;
        }));
    }
    setNodeInitialPositions(null);
  }, [setNodes, nodeInitialPositions]);

  const clearAnalysis = useCallback(() => {
    setAnalysisContent(null);
    setIdentifiedTopology(null);
    setSimulationParams(null);
    setAnimatedPackets([]);
    setSelectedConnectionId(null);
    setHasAnalyzedOnce(false);
    setIsolatedMaliciousNodeIds([]);
    // Do not clear clusterHeadIds here, it's needed for reconstruction
    stopMobility();
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, [stopMobility]);

  // Effect for real-time report updates
  useEffect(() => {
    if (!hasAnalyzedOnce || nodes.length < 2) {
        if (nodes.length < 2) setSimulationParams(null);
        return;
    };

    setIsReportUpdating(true);
    const handler = setTimeout(() => {
        const maliciousNodes = nodes.filter(n => n.isMalicious).map(n => n.id);
        const topology = networkAnalysisService.identifyTopology(nodes, connections, clusterHeadIds);
        const params = networkAnalysisService.simulatePerformance(topology, nodes, connections, maliciousNodes);
        setSimulationParams(params);
        setIsReportUpdating(false);
    }, 300); // Debounce for 300ms for snappier updates

    return () => {
        clearTimeout(handler);
        setIsReportUpdating(false);
    };
  }, [nodes, connections, hasAnalyzedOnce, clusterHeadIds]);

  const deleteSelectedConnection = useCallback(() => {
    if (selectedConnectionId) {
        saveSnapshot();
        setConnections(prev => prev.filter(c => c.id !== selectedConnectionId));
        setSelectedConnectionId(null);
    }
  }, [selectedConnectionId, setConnections, saveSnapshot]);

    const deleteSelectedNodes = useCallback(() => {
        if (selectedNodeIds.length > 0) {
            saveSnapshot();
            setNodes(prev => prev.filter(n => !selectedNodeIds.includes(n.id)));
            setConnections(prev => prev.filter(c => !selectedNodeIds.includes(c.from) && !selectedNodeIds.includes(c.to)));
            setSelectedNodeIds([]);
        }
    }, [selectedNodeIds, setNodes, setConnections, saveSnapshot]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
        if ((event.key === 'Delete' || event.key === 'Backspace')) {
            if (selectedConnectionId) {
                deleteSelectedConnection();
            } else if (selectedNodeIds.length > 0) {
                deleteSelectedNodes();
            }
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedConnectionId, selectedNodeIds, deleteSelectedConnection, deleteSelectedNodes]);


  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (mobilityFrameRef.current) {
        cancelAnimationFrame(mobilityFrameRef.current);
      }
    };
  }, []);

  const animationLoop = useCallback(() => {
    const maliciousNodes = nodes.filter(n => n.isMalicious).map(n => n.id);

    setAnimatedPackets(prevPackets => {
        const now = performance.now();
        const completedPackets: AnimatedPacket[] = [];
        const updatedPackets = prevPackets.map(p => {
            const elapsedTime = now - p.startTime;
            let progress = Math.min(elapsedTime / p.duration, 1);

            // Check for packet drop with traditional protocol
            if (p.id.startsWith('packet-trad') || p.id.startsWith('sim-packet-trad-')) {
                 const currentSegmentIndex = Math.min(Math.floor(progress * (p.path.length - 1)), p.path.length - 2);
                 const nextNodeId = p.path[currentSegmentIndex + 1];
                 if (maliciousNodes.includes(nextNodeId)) {
                     const fromNode = nodes.find(n => n.id === p.path[currentSegmentIndex]);
                     const toNode = nodes.find(n => n.id === nextNodeId);
                     if (fromNode && toNode) {
                         const dropX = fromNode.x + (toNode.x - fromNode.x) * 0.5;
                         const dropY = fromNode.y + (toNode.y - fromNode.y) * 0.5;
                         setDroppedPacketEvents(prev => [...prev, {id: `drop-${p.id}`, x: dropX, y: dropY}]);
                         setTimeout(() => setDroppedPacketEvents(prev => prev.filter(e => e.id !== `drop-${p.id}`)), 1000);
                     }
                     progress = 1; // Mark for completion/removal
                 }
            }

            if (progress >= 1) {
                completedPackets.push(p);
            }
            return { ...p, progress };
        }).filter(p => p.progress < 1);

        completedPackets.forEach(p => {
            if ((p.id.startsWith('sim-packet-ai-') || p.id.startsWith('packet-ai')) && p.message) {
                const fromNode = nodes.find(n => n.id === p.path[0]);
                const toNode = nodes.find(n => n.id === p.path[p.path.length - 1]);
                if(fromNode && toNode) {
                    const fromNodeIndex = nodes.findIndex(n => n.id === fromNode.id) + 1;
                    const toNodeIndex = nodes.findIndex(n => n.id === toNode.id) + 1;
                    const fullPath = p.path.map(nodeId => `Node ${nodes.findIndex(n => n.id === nodeId) + 1}`);
                    
                    const isDropped = p.path.some(nodeId => maliciousNodes.includes(nodeId));

                    setDeliveredPackets(prev => [...prev, {
                        id: `log-${p.id}-${Date.now()}`,
                        from: `Node ${fromNodeIndex}`, to: `Node ${toNodeIndex}`,
                        message: p.message!, path: fullPath, status: isDropped ? 'dropped' : 'delivered',
                        transmissionTime: p.duration
                    }]);
                }
            }
        });

        if (updatedPackets.length > 0) {
            animationFrameRef.current = requestAnimationFrame(animationLoop);
        } else {
            animationFrameRef.current = null;
        }
        return updatedPackets;
    });
  }, [nodes]);

  const ensureAnimationLoop = useCallback(() => {
    if (!animationFrameRef.current) {
      animationFrameRef.current = requestAnimationFrame(animationLoop);
    }
  }, [animationLoop]);

  const startAnalysisPacketAnimation = (path: string[], pathTrad: string[], topology: string) => {
    const startTime = performance.now();
    const newPackets: AnimatedPacket[] = [];
    
    const pathOptions = { clusterHeadIds, topology };

    if (path) newPackets.push({ id: 'packet-ai', path, progress: 0, color: '#22d3ee', startTime, duration: PACKET_ANIMATION_DURATION_AI, message: "AI protocol test packet." });
    if (pathTrad) newPackets.push({ id: 'packet-trad', path: pathTrad, progress: 0, color: '#f97316', startTime, duration: PACKET_ANIMATION_DURATION_TRADITIONAL, message: "Traditional protocol test packet." });
    
    setAnimatedPackets(prev => [...prev, ...newPackets]);
    ensureAnimationLoop();
  };

  const mobilityLoop = useCallback(() => {
    if (!nodeInitialPositions) {
      mobilityFrameRef.current = null;
      return;
    }

    setNodes(prevNodes => prevNodes.map(node => {
      const initialPos = nodeInitialPositions.get(node.id);
      if (!initialPos) return node;

      const x = initialPos.x + (Math.random() - 0.5) * JIGGLE_AMPLITUDE;
      const y = initialPos.y + (Math.random() - 0.5) * JIGGLE_AMPLITUDE;
      
      return { ...node, x, y };
    }));

    mobilityFrameRef.current = requestAnimationFrame(mobilityLoop);
  }, [setNodes, nodeInitialPositions]);

  const startMobility = useCallback(() => {
    if (!mobilityFrameRef.current) {
        const initialPositions = new Map<string, { x: number, y: number }>();
        nodes.forEach(n => initialPositions.set(n.id, { x: n.x, y: n.y }));
        setNodeInitialPositions(initialPositions);
        mobilityFrameRef.current = requestAnimationFrame(mobilityLoop);
    }
  }, [mobilityLoop, nodes]);

  const toggleConnectionMode = () => {
    setIsConnectionMode(prev => {
        const isEntering = !prev;
        if (isEntering) {
            setIsPacketSimulationMode(false);
            setPacketSimSourceNodes([]);
            stopMobility();
        }
        setSelectedNodeIds([]);
        setSelectedConnectionId(null);
        return isEntering;
    });
  };

  const togglePacketSimulationMode = () => {
    setIsPacketSimulationMode(prev => {
        const isEntering = !prev;
        if (isEntering) {
            setIsConnectionMode(false);
            setSelectedNodeIds([]);
            setSelectedConnectionId(null);
            startMobility();
        } else {
            stopMobility();
        }
        setPacketSimSourceNodes([]);
        return isEntering;
    });
  };

  const handleNodeClickForSimulation = (nodeId: string) => {
    const targetNode = nodes.find(n => n.id === nodeId);
    if (!targetNode || targetNode.type === NetworkComponentType.BASE_STATION) {
        return; // Can't select base stations as source
    }

    const baseStation = nodes.find(n => n.type === NetworkComponentType.BASE_STATION);
    if (!baseStation) {
        alert("A Base Station is required to act as the destination for packet simulations.");
        return;
    }
    const destinationNodeId = baseStation.id;

    const isAlreadySource = packetSimSourceNodes.includes(nodeId);

    if (isAlreadySource) {
        // Deselecting node
        const newSourceNodes = packetSimSourceNodes.filter(id => id !== nodeId);
        setPacketSimSourceNodes(newSourceNodes);
    } else {
        // Selecting new source node
        if (packetSimSourceNodes.length >= 15) {
            alert("You can select a maximum of 15 source nodes for simulation.");
            return;
        }

        const newSourceNodes = [...packetSimSourceNodes, nodeId];
        setPacketSimSourceNodes(newSourceNodes);

        const maliciousNodeIds = nodes.filter(n => n.isMalicious).map(n => n.id);
        const newPackets: AnimatedPacket[] = [];
        const sourceNodeId = nodeId;
        
        const topology = networkAnalysisService.identifyTopology(nodes, connections, clusterHeadIds);
        const pathOptions = { excludeNodeIds: maliciousNodeIds, clusterHeadIds, topology };
        const pathTradOptions = { clusterHeadIds, topology };

        const pathAI = pathfindingService.findShortestPath(sourceNodeId, destinationNodeId, nodes, connections, pathOptions);
        const pathTrad = pathfindingService.findShortestPath(sourceNodeId, destinationNodeId, nodes, connections, pathTradOptions);

        if (pathAI) {
            newPackets.push({
                id: `sim-packet-ai-${sourceNodeId}-${Date.now()}`, path: pathAI, progress: 0, color: '#22d3ee',
                startTime: performance.now(), duration: PACKET_SIMULATION_DURATION, message: packetMessage
            });
        }
        if (pathTrad) {
                newPackets.push({
                id: `sim-packet-trad-${sourceNodeId}-${Date.now()}`, path: pathTrad, progress: 0, color: '#f97316',
                startTime: performance.now(), duration: PACKET_SIMULATION_DURATION, message: packetMessage
            });
        }
        
        if (newPackets.length > 0) {
            setAnimatedPackets(prev => [...prev, ...newPackets]);
            ensureAnimationLoop();
        } else {
            alert(`No path found from the selected node to the Base Station. A switch may be disabled or the network may be disconnected.`);
        }
    }
  };


  const addNode = (type: NetworkComponentType, x: number, y: number) => {
    saveSnapshot();
    const baseNode = {
      id: `${type.toLowerCase()}-${Date.now()}`,
      type,
      x,
      y,
      ipAddress: `192.168.1.${nodes.length + 1}`,
      isMalicious: false,
      sensorData: {
        temperature: 25.0,
        humidity: 45.0,
        signalInterference: -90,
      },
    };

    let newNode: Node;

    switch (type) {
      case NetworkComponentType.ROUTER:
        newNode = { ...baseNode, energyEfficiency: 100, energySpent: 25, packetForwardingCapacity: 5000 };
        break;
      case NetworkComponentType.SWITCH:
        newNode = { ...baseNode, energyEfficiency: 100, energySpent: 10, portCount: 16, isEnabled: true };
        break;
      case NetworkComponentType.BASE_STATION:
        newNode = { ...baseNode, energyEfficiency: 100, energySpent: 50, isReceiver: true };
        break;
      case NetworkComponentType.NODE:
      default:
        newNode = { ...baseNode, energyEfficiency: Math.round(80 + Math.random() * 20), energySpent: Math.round(Math.random() * 10) + 5 };
        break;
    }
    setNodes((prev) => [...prev, newNode]);
  };

    const handleFitToView = useCallback(() => {
        if (nodes.length === 0 || !canvasViewportRef.current) return;

        const padding = 50;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        nodes.forEach(node => {
            minX = Math.min(minX, node.x);
            minY = Math.min(minY, node.y);
            maxX = Math.max(maxX, node.x);
            maxY = Math.max(maxY, node.y);
        });

        const networkWidth = maxX - minX;
        const networkHeight = maxY - minY;
        
        if (networkWidth === 0 && networkHeight === 0) {
            setZoom(1);
            if (canvasViewportRef.current) {
              canvasViewportRef.current.scrollLeft = minX - (canvasViewportRef.current.clientWidth / 2);
              canvasViewportRef.current.scrollTop = minY - (canvasViewportRef.current.clientHeight / 2);
            }
            return;
        }

        const { clientWidth: viewportWidth, clientHeight: viewportHeight } = canvasViewportRef.current;
        
        const zoomX = networkWidth > 0 ? (viewportWidth - padding * 2) / networkWidth : Infinity;
        const zoomY = networkHeight > 0 ? (viewportHeight - padding * 2) / networkHeight : Infinity;
        const newZoom = Math.min(zoomX, zoomY, MAX_ZOOM, 1);
        
        setZoom(newZoom);

        setTimeout(() => {
            if (canvasViewportRef.current) {
                const centerX = minX + networkWidth / 2;
                const centerY = minY + networkHeight / 2;
                canvasViewportRef.current.scrollLeft = (centerX * newZoom) - (viewportWidth / 2) + padding;
                canvasViewportRef.current.scrollTop = (centerY * newZoom) - (viewportHeight / 2) + padding;
            }
        }, 0);
    }, [nodes]);

  const generateNetwork = useCallback(async (
    count: number, 
    topology: NetworkTopology,
    includeRouters: boolean,
    includeSwitches: boolean,
    numClusterHeads: number
  ) => {
    if (count <= 0) return;
    if (count > 450) {
      alert('The maximum number of nodes is 450.');
      return;
    }
    if (!canvasViewportRef.current) return;

    setIsGeneratingNetwork(true);
    setLoadingMessage(`Generating ${count}-node ${topology} network...`);
    
    try {
        let delay = 0;
        if (count <= 50)       delay = 5000;
        else if (count <= 150) delay = 10000;
        else if (count <= 250) delay = 15000;
        else if (count <= 350) delay = 25000;
        else                   delay = 40000;

        await new Promise(resolve => setTimeout(resolve, delay));

        saveSnapshot();
        clearAnalysis();
        
        const { clientWidth, clientHeight } = canvasViewportRef.current;
        const { nodes: newNodes, connections: newConnections, clusterHeadIds: newClusterHeadIds } = 
            networkGenerationService.generateNetworkLayout(
                count,
                topology,
                includeRouters,
                includeSwitches,
                numClusterHeads,
                { width: clientWidth, height: clientHeight }
            );

        setNodes(newNodes);
        setConnections(newConnections);
        setClusterHeadIds(newClusterHeadIds);
        setSelectedNodeIds([]);
        setIsConnectionMode(false);
        addToHistory(`Generated ${count}-node ${topology} network`);
        
        setTimeout(() => handleFitToView(), 100);
    } finally {
        setIsGeneratingNetwork(false);
        setLoadingMessage(null);
    }
  }, [setNodes, setConnections, setClusterHeadIds, clearAnalysis, saveSnapshot, handleFitToView, addToHistory]);

  const updateNode = useCallback((updatedNode: Node) => {
    setNodes((prev) => prev.map((n) => (n.id === updatedNode.id ? updatedNode : n)));
  }, [setNodes]);

  const updateNodeIp = useCallback((nodeId: string, ipAddress: string) => {
    setNodes(prev => prev.map(n => (n.id === nodeId ? { ...n, ipAddress } : n)));
  }, [setNodes]);

  const handleRouterAutoConnect = useCallback((routerId: string) => {
        saveSnapshot();
        const routerNode = nodes.find(n => n.id === routerId);
        if (!routerNode) return;

        const connectedNodeIds = new Set(
            connections
                .filter(c => c.from === routerId || c.to === routerId)
                .flatMap(c => [c.from, c.to])
        );

        const unconnectedNodes = nodes.filter(n => n.id !== routerId && !connectedNodeIds.has(n.id));

        const distances = unconnectedNodes.map(targetNode => {
            const dist = Math.sqrt(Math.pow(routerNode.x - targetNode.x, 2) + Math.pow(routerNode.y - targetNode.y, 2));
            return { id: targetNode.id, dist };
        }).sort((a, b) => a.dist - b.dist);

        const K_NEAREST = 3;
        const newConnections = distances.slice(0, K_NEAREST).map(target => ({
            id: `${routerId}-${target.id}-${Date.now()}`,
            from: routerId,
            to: target.id,
        }));

        if (newConnections.length > 0) {
            setConnections(prev => [...prev, ...newConnections]);
            alert(`Connected router to ${newConnections.length} nearest node(s).`);
        } else {
            alert('Router is already connected to all available nodes.');
        }
    }, [nodes, connections, setConnections, saveSnapshot]);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setLoadingMessage('Analyzing network performance...');
    setAnalysisContent(null);
    setIdentifiedTopology(null);
    setSimulationParams(null);
    setAnimatedPackets([]);
    setIsConnectionMode(false);
    setIsPacketSimulationMode(false);
    setPacketSimSourceNodes([]);
    
    startMobility();

    try {
      const nodeCount = nodes.length;
      let generationDelay = 0;
      if (nodeCount <= 50)       generationDelay = 5000;
      else if (nodeCount <= 150) generationDelay = 10000;
      else if (nodeCount <= 250) generationDelay = 15000;
      else if (nodeCount <= 350) generationDelay = 25000;
      else                       generationDelay = 40000;
      
      await new Promise(resolve => setTimeout(resolve, generationDelay / 2));
      
      const maliciousNodeIds = nodes.filter(n => n.isMalicious).map(n => n.id);
      setIsolatedMaliciousNodeIds(maliciousNodeIds); // Simulate AI isolating the nodes

      const topology = networkAnalysisService.identifyTopology(nodes, connections, clusterHeadIds);
      setIdentifiedTopology(topology);
      const networkData = networkAnalysisService.getNetworkStats(nodes, connections);
      
      const analysisPromise = geminiService.getStructuredAnalysis({ ...networkData, topology });

      const params = networkAnalysisService.simulatePerformance(topology, nodes, connections, maliciousNodeIds, 'before');
      setSimulationParams(params);
      setHasAnalyzedOnce(true);
      
      const generatedAnalysis = await analysisPromise;
      let finalAnalysis = generatedAnalysis;
      if (maliciousNodeIds.length > 0) {
            finalAnalysis += `\n\n**Security Alert:**\n* ${maliciousNodeIds.length} malicious node(s) were detected. The AI protocol will attempt to mitigate the threat by isolating them and re-routing traffic. Expect a significant performance drop for traditional protocols.`;
      }
      setAnalysisContent(finalAnalysis);
      
      const farthestNodes = pathfindingService.findFarthestNodes(nodes, maliciousNodeIds);
      if (farthestNodes) {
        const pathOptions = { excludeNodeIds: maliciousNodeIds, clusterHeadIds, topology };
        const pathTradOptions = { clusterHeadIds, topology };
        
        const path = pathfindingService.findShortestPath(farthestNodes[0], farthestNodes[1], nodes, connections, pathOptions);
        const pathTrad = pathfindingService.findShortestPath(farthestNodes[0], farthestNodes[1], nodes, connections, pathTradOptions);
        startAnalysisPacketAnimation(path, pathTrad, topology);
      }

    } catch (error) {
      console.error("Analysis failed:", error);
      setAnalysisContent("**Error:** Could not generate network analysis. The API may be unavailable or the key may be invalid.");
    } finally {
      setIsAnalyzing(false);
      setLoadingMessage(null);
      stopMobility();
    }
  };

  const handleDownloadFullReport = async () => {
    const canvasEl = canvasRef.current;
    if (!canvasEl || !analysisContent || !simulationParams || !identifiedTopology) {
        alert("Please run a full analysis first to generate all report components.");
        return;
    }
    setIsDownloadingReport(true);

    try {
        const { default: html2canvas } = await import('html2canvas');
        const { default: jsPDF } = await import('jspdf');
        const { createRoot } = await import('react-dom/client');

        const pdf = new jsPDF('p', 'pt', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const margin = 40;
        const contentWidth = pdfWidth - margin * 2;
        let yPos = margin;

        const addPageBreaks = (currentY: number) => {
            if (currentY > pdfHeight - margin * 2) {
                pdf.addPage();
                return margin;
            }
            return currentY;
        };

        const renderText = (text: string, x: number, y: number, options: any = {}) => {
            const lines = pdf.splitTextToSize(text, options.maxWidth || contentWidth);
            pdf.text(lines, x, y, options);
            return y + (lines.length * (pdf.getLineHeight() * 1.15)) / pdf.internal.scaleFactor; // Increased line spacing
        };
        
        const renderSingleTable = (startY: number, headers: string[], data: string[][]) => {
            let y = startY;
            if (data.length === 0) return y;
            const columnWidths = headers.map(() => contentWidth / headers.length);
            
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(9);
            let x = margin;
            y = addPageBreaks(y + 12);
            pdf.setFillColor(230, 230, 230); // Light gray header
            pdf.rect(margin, y - 10, contentWidth, 12, 'F');
            pdf.setTextColor(0, 0, 0);
            headers.forEach((header, i) => {
                pdf.text(header, x + 3, y);
                x += columnWidths[i];
            });
            pdf.setTextColor(0, 0, 0); // Reset color
            y += 5;
            
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(8);
            
            data.forEach((row, rowIndex) => {
                let maxRowHeight = 0;
                 // Pre-calculate height of the tallest cell in the row
                row.forEach((cell, i) => {
                    const lines = pdf.splitTextToSize(String(cell), columnWidths[i] - 6);
                    const cellHeight = (lines.length * (pdf.getLineHeight() * 1.15)) / pdf.internal.scaleFactor;
                    if (cellHeight > maxRowHeight) maxRowHeight = cellHeight;
                });

                y = addPageBreaks(y + maxRowHeight + 4); // +4 for padding
                
                pdf.setFillColor(rowIndex % 2 === 0 ? 255 : 245, 255, 255); // White/off-white striping
                pdf.rect(margin, y - 10, contentWidth, maxRowHeight + 4, 'F');
                
                x = margin;
                row.forEach((cell, i) => {
                    renderText(String(cell), x + 3, y, { maxWidth: columnWidths[i] - 6 });
                    x += columnWidths[i];
                });
                y += maxRowHeight + 4;
            });
            return y;
        };


        const renderTitlePage = () => {
            pdf.setFontSize(28);
            pdf.text('Ad Hoc Network Simulation Report', pdfWidth / 2, pdfHeight / 2 - 60, { align: 'center' });
            pdf.setFontSize(16);
            pdf.text(`Analysis of a ${nodes.length}-Node ${identifiedTopology}`, pdfWidth / 2, pdfHeight / 2 - 30, { align: 'center' });
            pdf.setFontSize(12);
            pdf.text(`Report Generated: ${new Date().toLocaleString()}`, pdfWidth / 2, pdfHeight / 2 + 20, { align: 'center' });
            pdf.addPage();
        };

        const renderSectionTitle = (title: string, y: number, newPage = false) => {
            if (newPage) {
                pdf.addPage();
                y = margin;
            }
            y = addPageBreaks(y);
            pdf.setFontSize(18);
            pdf.text(title, margin, y);
            pdf.setDrawColor(100, 100, 100);
            pdf.line(margin, y + 8, pdfWidth - margin, y + 8);
            return y + 30;
        };
        
        const generateAndRenderGraph = async (parameter: keyof SimulationParameters) => {
            const chartContainer = document.createElement('div');
            chartContainer.style.position = 'absolute';
            chartContainer.style.left = '-9999px';
            chartContainer.style.width = '800px';
            chartContainer.style.height = '500px';
            chartContainer.style.backgroundColor = '#1f2937'; // Dark background
            chartContainer.style.padding = '20px';
            document.body.appendChild(chartContainer);

            const nodeCounts = [10, 25, 50, 75, 100, 125, 150];
            const graphData = [];
            
            const toGenerationTopology = (topology: string): NetworkTopology => {
                const lower = topology.toLowerCase();
                if (lower.includes('cluster-mesh')) return 'cluster-mesh';
                if (lower.includes('cluster')) return 'cluster';
                return 'random'; 
            };
            const generationTopology = toGenerationTopology(identifiedTopology || 'random');

            for (const count of nodeCounts) {
                const { nodes: simNodes, connections: simConnections } = networkGenerationService.generateNetworkLayout(count, generationTopology, true, false, Math.max(2, Math.floor(count / 15)), { width: 1200, height: 800 });
                const results = networkAnalysisService.simulatePerformance(generationTopology, simNodes, simConnections, []);
                graphData.push({ nodes: count, 'Enhanced': results['AI-Based'][parameter], 'Baseline': results['Traditional'][parameter] });
            }

            const currentUserDataPoint = { nodes: nodes.length, 'Enhanced': simulationParams['AI-Based'][parameter], 'Baseline': simulationParams['Traditional'][parameter] };

            const lowerIsBetter = parameter === 'End-to-end Delay (ms)' || parameter === 'Energy Consumption (J)';
            const unit = String(parameter).match(/\((.*?)\)/)?.[1] || '';
            const paramName = String(parameter).split('(')[0].trim();

            const ChartComponent = (
                <div style={{width: '100%', height: '100%', fontFamily: 'sans-serif', color: '#e5e7eb' }}>
                  <h2 style={{color: '#e5e7eb', textAlign: 'center', fontSize: '22px', fontWeight: 'bold'}}>{paramName} vs Number of Nodes</h2>
                  <h3 style={{color: '#cbd5e1', textAlign: 'center', fontSize: '16px', marginBottom: '20px'}}>Enhanced Security & Efficiency</h3>
                  <ResponsiveContainer width="100%" height="85%">
                    <LineChart data={graphData} margin={{ top: 20, right: 40, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
                      <XAxis dataKey="nodes" type="number" stroke="#9ca3af" domain={['dataMin', 'dataMax']} label={{ value: 'Number of Nodes', position: 'insideBottom', offset: -15, fill: '#9ca3af' }} />
                      <YAxis stroke="#9ca3af" domain={['auto', 'auto']} reversed={lowerIsBetter} label={{ value: `${paramName} (${unit})`, angle: -90, position: 'insideLeft', offset: -10, fill: '#9ca3af' }} />
                      <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #22d3ee' }} />
                      <Legend wrapperStyle={{ color: '#e5e7eb' }}/>
                      <Line type="monotone" dataKey="Enhanced" stroke="#22d3ee" strokeWidth={3} dot={{ r: 5, fill: '#22d3ee', stroke: '#1f2937', strokeWidth: 2 }} activeDot={{r: 8}} />
                      <Line type="monotone" dataKey="Baseline" stroke="#f97316" strokeWidth={3} dot={{ r: 5, fill: '#f97316', stroke: '#1f2937', strokeWidth: 2 }} activeDot={{r: 8}} />
                      <ReferenceDot x={currentUserDataPoint.nodes} y={currentUserDataPoint['Enhanced']} r={8} fill="#22d3ee" stroke="white" strokeWidth={2}/>
                      <ReferenceDot x={currentUserDataPoint.nodes} y={currentUserDataPoint['Baseline']} r={8} fill="#f97316" stroke="white" strokeWidth={2}/>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
            );
            
            const root = createRoot(chartContainer);
            root.render(ChartComponent);
            await new Promise(resolve => setTimeout(resolve, 500));
            const canvas = await html2canvas(chartContainer, { scale: 2 });
            root.unmount();
            document.body.removeChild(chartContainer);
            return canvas;
        };
        
        const getParameterInfo = (parameter: keyof SimulationParameters, currentNodes: Node[]) => {
            const aiValue = simulationParams['AI-Based'][parameter];
            const tradValue = simulationParams['Traditional'][parameter];
            const makeBreakdown = (isEnhanced: boolean) => {
                switch(parameter) {
                    case 'Packet Delivery Ratio':
                        return isEnhanced ? {
                            title: "Enhanced AI Algorithm Logic (Reinforcement Learning)",
                            description: "The AI model learns the most reliable routes by rewarding successful packet deliveries. It uses a Q-learning approach to assign a 'quality' value to routing decisions, prioritizing paths with a higher historical success rate.",
                            formula: "Q(s,a) ← Q(s,a) + α[R + γ * max Q(s',a') - Q(s,a)]",
                            headers: ['Component', 'Description'],
                            data: [
                                ["Q(s,a)", "The 'Quality' of forwarding a packet from node 's' to neighbor 'a'"],
                                ['R (Reward)', 'A positive reward (e.g., +1) is given if the packet is acknowledged, incentivizing reliable paths.'],
                            ]
                        } : {
                            title: "Traditional Algorithm Logic (e.g., AODV)",
                            description: "Traditional protocols like AODV select the shortest path, which might not be the most stable, leading to packet loss if a link breaks.",
                            formula: "PDR = (Total Packets Received / Total Packets Sent)",
                            headers: ['Component', 'Description', 'Example Value'],
                            data: [
                                ['Packets Sent', 'Total data packets initiated.', '1000 packets'],
                                ['Packets Received', `Packets successfully reaching the destination.`, `${Math.round(tradValue * 1000)} packets`],
                                ['Calculation', `(${Math.round(tradValue * 1000)} / 1000)`, `${tradValue}`],
                            ]
                        };
                    case 'Throughput (Mbps)':
                        return isEnhanced ? {
                             title: "Enhanced AI Algorithm Logic (Reinforcement Learning)",
                            description: "The AI model optimizes for throughput by learning which routes have higher available bandwidth and lower congestion, rewarding faster data transmission.",
                            formula: "Q(s,a) ← Q(s,a) + α[R + γ * max Q(s',a') - Q(s,a)]",
                            headers: ['Component', 'Description'],
                            data: [
                                ["Q(s,a)", "The 'Quality' of choosing a path based on its potential data rate."],
                                ['R (Reward)', 'Reward is proportional to the throughput achieved on the chosen path, encouraging high-capacity routes.'],
                            ]
                        } : {
                             title: "Traditional Algorithm Logic (e.g., DSR)",
                            description: "Traditional methods do not actively manage for bandwidth, leading to congestion on shortest paths and lower overall throughput.",
                            formula: "Throughput = (Total Data Received (bits) / Time)",
                            headers: ['Component', 'Description', 'Example Value'],
                            data: [
                                ['Data Received', 'Sum of sizes of all delivered packets.', `${(tradValue * 10 * 1000000).toExponential(2)} bits`],
                                ['Time', 'The simulation measurement period.', '10 seconds'],
                                ['Calculation', `${(tradValue * 10 * 1000000).toExponential(2)} / 10`, `${tradValue} Mbps`],
                            ]
                        };
                     case 'End-to-end Delay (ms)':
                        return isEnhanced ? {
                            title: "Enhanced AI Algorithm Logic (Reinforcement Learning)",
                            description: "The AI model minimizes delay by learning to avoid congested nodes and low-quality links. The reward function penalizes longer transit times.",
                            formula: "Q(s,a) ← Q(s,a) + α[R + γ * max Q(s',a') - Q(s,a)]",
                            headers: ['Component', 'Description'],
                            data: [
                                ["Q(s,a)", "The 'Quality' of a route based on its expected speed."],
                                ['R (Reward)', 'The reward is inversely proportional to the measured delay (e.g., R = 1 / delay), penalizing slow paths.'],
                            ]
                        } : {
                             title: "Traditional Algorithm Logic (e.g., AODV)",
                            description: "Choosing the shortest path in hops can lead to queuing delays at busy nodes, increasing the overall end-to-end delay.",
                            formula: "Avg. Delay = Σ (Packet Rx Time - Packet Tx Time) / Total Packets Received",
                             headers: ['Component', 'Description', 'Example Value'],
                             data: [
                                 ['Σ (Packet Rx - Tx)', 'The sum of transit times for all successful packets.', `${(tradValue * 985).toLocaleString()} ms`],
                                 ['Packets Received', 'Total successful packets.', '985 packets'],
                                 ['Calculation', `${(tradValue * 985).toLocaleString()} / 985`, `${tradValue} ms`],
                             ]
                        };
                     case 'Energy Consumption (J)':
                        return isEnhanced ? {
                             title: "Enhanced AI Algorithm Logic (Reinforcement Learning)",
                            description: "The AI model is explicitly trained to conserve energy. The reward function penalizes routes that use nodes with low battery or require high transmission power.",
                            formula: "Q(s,a) ← Q(s,a) + α[R + γ * max Q(s',a') - Q(s,a)]",
                            headers: ['Component', 'Description'],
                            data: [
                                ["Q(s,a)", "The 'Quality' of a route based on its energy cost."],
                                ['R (Reward)', 'The reward is inversely proportional to the energy consumed (e.g., R = 1 / energy_cost), favoring efficient paths.'],
                            ]
                        } : {
                             title: "Traditional Algorithm Logic",
                            description: "Traditional protocols are generally not energy-aware. Consumption is a direct result of the total number of transmissions required.",
                            formula: "Total Consumption = Σ (Energy Spent by each node)",
                              headers: ["Component", "Description", "Example Value"],
                              data: [
                                  ['Avg. Energy Spent', 'Energy used by a single node for all operations.', `${(tradValue / currentNodes.length).toFixed(2)} J per node`],
                                  ['Number of Nodes', 'Total active nodes in the network.', `${currentNodes.length} nodes`],
                                  ['Calculation', `${(tradValue / currentNodes.length).toFixed(2)} * ${currentNodes.length}`, `${tradValue} J`],
                              ]
                        };
                     case 'Network Lifetime (hours)':
                        return isEnhanced ? {
                             title: "Enhanced AI Algorithm Logic (Load Balancing)",
                            description: "The AI extends network lifetime by intelligently distributing routing tasks across the network, preventing any single node's battery from draining prematurely. The reward function considers the remaining energy of nodes in a path.",
                             formula: "Q(s,a) ← Q(s,a) + α[R + γ * max Q(s',a') - Q(s,a)]",
                            headers: ['Component', 'Description'],
                            data: [
                                ["Q(s,a)", "The 'Quality' of a route, factoring in long-term network survival."],
                                ['R (Reward)', 'Reward is higher for routes that use nodes with high remaining energy, ensuring balanced energy drain.'],
                            ]
                        } : {
                             title: "Traditional Algorithm Logic",
                            description: "Traditional protocols often create 'hotspots' by overusing centrally-located nodes for routing, leading to their rapid failure and network fragmentation.",
                            formula: "Lifetime = (Total Initial Energy / Total Consumption Rate)",
                            headers: ["Component", "Description", "Example Value"],
                            data: [
                                ['Total Initial Energy', 'Sum of battery capacity of all mobile nodes.', `${nodes.filter(n=>n.type === 'NODE').length * 1000} J`],
                                ['Consumption Rate', 'Simulated energy consumed per hour.', `${(simulationParams['Traditional']['Energy Consumption (J)'] * 5).toFixed(0)} J/hour`],
                                ['Calculation', `(${nodes.filter(n=>n.type === 'NODE').length * 1000}) / ${(simulationParams['Traditional']['Energy Consumption (J)'] * 5).toFixed(0)}`, `${tradValue.toFixed(1)} hours`],
                            ]
                        };
                    case 'Robustness Index':
                         return isEnhanced ? {
                             title: "Enhanced AI Algorithm Logic (Proactive Rerouting)",
                             description: "The AI model improves robustness by monitoring link quality in real-time. It can predict link failures before they happen and proactively reroute traffic, minimizing disruption.",
                             formula: "Q(s,a) ← Q(s,a) + α[R + γ * max Q(s',a') - Q(s,a)]",
                             headers: ['Component', 'Description'],
                             data: [
                                 ["Q(s,a)", "The 'Quality' of a route, factoring in link stability metrics."],
                                 ['R (Reward)', 'Reward is higher for stable, high-quality links and lower for links showing signs of degradation.'],
                             ]
                         } : {
                             title: "Traditional Algorithm Logic (Reactive Rerouting)",
                             description: "Traditional protocols are reactive. They only begin searching for a new path after a link has already failed, resulting in packet loss and significant recovery time.",
                             formula: "Robustness = 1 - (Impact of Failure / Network Size)",
                             headers: ["Component", "Description", "Example Value"],
                             data: [
                                 ['Impact of Failure', 'A simulated score for performance degradation when nodes fail.', `${((1 - tradValue) * currentNodes.length).toFixed(1)}`],
                                 ['Network Size', 'The total number of nodes.', `${currentNodes.length}`],
                                 ['Calculation', `1 - (${((1 - tradValue) * currentNodes.length).toFixed(1)} / ${currentNodes.length})`, `${tradValue.toFixed(2)}`],
                             ]
                         };
                    default: return null;
                }
            };

            return {
                definition: 'This is a placeholder definition.', // This will be populated by the main function call logic
                formulaInfo: {
                    breakdowns: [makeBreakdown(false), makeBreakdown(true)].filter(Boolean) as any[]
                },
                interpretation: 'This is a placeholder interpretation.',
                comparison: 'This is a placeholder comparison.'
            };
        };

        // --- RENDER PDF CONTENT ---
        renderTitlePage();
        yPos = renderSectionTitle('1. Network Topology Visualization', margin);
        const canvasImage = await html2canvas(canvasEl, { backgroundColor: '#1f2937', useCORS: true, logging: false, scale: 2 });
        pdf.addImage(canvasImage.toDataURL('image/png'), 'PNG', margin, yPos, contentWidth, contentWidth * (canvasImage.height / canvasImage.width));

        yPos = renderSectionTitle('2. AI-Powered Analysis', margin, true);
        const sections: { [key: string]: string[] } = {};
        let currentSection = '';
        analysisContent.split('\n').forEach(line => {
            line = line.trim();
            if (line.startsWith('**') && line.endsWith('**')) {
                currentSection = line.substring(2, line.length - 2);
                sections[currentSection] = [];
            } else if (currentSection && line) {
                const content = line.startsWith('*') ? line.substring(1).trim() : line;
                if (content) sections[currentSection].push(content);
            }
        });
        Object.entries(sections).forEach(([title, content]) => {
            yPos = addPageBreaks(yPos);
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(12);
            yPos = renderText(title, margin, yPos, {});
            yPos += 5;
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(10);
            content.forEach(item => {
                const itemText = (title.toLowerCase().includes('advantages') || title.toLowerCase().includes('disadvantages') || title.toLowerCase().includes('recommendations')) ? `• ${item}` : item;
                yPos = renderText(itemText, margin + 10, yPos, { maxWidth: contentWidth - 10 });
                yPos += 2;
            });
            yPos += 10;
        });

        const parametersToDetail: (keyof SimulationParameters)[] = ['Packet Delivery Ratio', 'Throughput (Mbps)', 'End-to-end Delay (ms)', 'Energy Consumption (J)', 'Network Lifetime (hours)', 'Robustness Index'];
        
        let sectionCounter = 3;
        for (const param of parametersToDetail) {
            yPos = renderSectionTitle(`${sectionCounter}. Detailed Analysis: ${param}`, margin, true);
            const info = getParameterInfo(param, nodes); // This gets the generic template
            
            // This is the actual text content from the original function.
            const { definition, interpretation, comparison } = networkAnalysisService.getParameterInfoText(param);

            const graphCanvas = await generateAndRenderGraph(param);
            const graphHeight = contentWidth * (graphCanvas.height / graphCanvas.width);
            if (yPos + graphHeight > pdfHeight - margin) {
                pdf.addPage();
                yPos = margin;
            }
            pdf.addImage(graphCanvas.toDataURL('image/png'), 'PNG', margin, yPos, contentWidth, graphHeight);
            yPos += graphHeight + 15;

            yPos = addPageBreaks(yPos);
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(12);
            yPos = renderText('Graph Interpretation', margin, yPos, {});
            yPos += 5;
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(10);
            yPos = renderText(interpretation, margin, yPos, {});
            yPos += 15;

            yPos = addPageBreaks(yPos);
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(12);
            yPos = renderText('Algorithm Comparison', margin, yPos, {});
            yPos += 5;
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(10);
            yPos = renderText(comparison, margin, yPos, {});
            yPos += 15;

            yPos = addPageBreaks(yPos);
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(12);
            yPos = renderText('Parameter Definition & Logic', margin, yPos, {});
            yPos += 5;
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(10);
            yPos = renderText(definition, margin, yPos, {});
            yPos += 10;

            if (info.formulaInfo && info.formulaInfo.breakdowns) {
                for (const breakdown of info.formulaInfo.breakdowns) {
                    yPos = addPageBreaks(yPos);
                    pdf.setFont('helvetica', 'bold');
                    pdf.setFontSize(11);
                    yPos = renderText(breakdown.title, margin, yPos, {});
                    yPos += 5;
                    pdf.setFont('helvetica', 'normal');
                    pdf.setFontSize(9);
                    yPos = renderText(breakdown.description, margin, yPos, {});
                    if (breakdown.formula) {
                        yPos += 5;
                        pdf.setFont('courier', 'bold');
                        yPos = renderText(breakdown.formula, margin + 5, yPos, { maxWidth: contentWidth - 10 });
                        pdf.setFont('helvetica', 'normal');
                    }
                    yPos += 8;
                    yPos = renderSingleTable(yPos, breakdown.headers, breakdown.data);
                    yPos += 15;
                }
            }
            sectionCounter++;
        }

        pdf.save("full_network_report.pdf");

    } catch (error) {
        console.error("Failed to generate PDF report:", error);
        alert("An error occurred while generating the PDF report. Please check the console for details.");
    } finally {
        setIsDownloadingReport(false);
    }
  };


  const handleDownloadParameterGraph = async (parameter: keyof SimulationParameters) => {
    setIsDownloadingReport(true);
    try {
        const { createRoot } = await import('react-dom/client');
        const chartContainer = document.createElement('div');
        chartContainer.style.position = 'absolute';
        chartContainer.style.left = '-9999px';
        chartContainer.style.width = '800px';
        chartContainer.style.height = '500px';
        chartContainer.style.backgroundColor = '#111827';
        chartContainer.style.padding = '20px';
        document.body.appendChild(chartContainer);
        
        const nodeCounts = [10, 30, 50, 80, 120, 150];
        const graphData = [];
        
        const currentTopology = networkAnalysisService.identifyTopology(nodes, connections, clusterHeadIds);
        const toGenerationTopology = (topology: string): NetworkTopology => {
            const lower = topology.toLowerCase();
            if (lower.includes('cluster-mesh')) return 'cluster-mesh';
            if (lower.includes('cluster')) return 'cluster';
            if (lower.includes('mesh')) return 'mesh';
            if (lower.includes('star')) return 'star';
            if (lower.includes('ring')) return 'ring';
            if (lower.includes('bus')) return 'bus';
            if (lower.includes('grid')) return 'grid';
            return 'random'; 
        };
        const generationTopology = toGenerationTopology(currentTopology);

        for (const count of nodeCounts) {
            const { nodes: simNodes, connections: simConnections } = networkGenerationService.generateNetworkLayout(count, generationTopology, true, false, Math.max(2, Math.floor(count / 15)), { width: 1200, height: 800 });
            const results = networkAnalysisService.simulatePerformance(generationTopology, simNodes, simConnections, []);
            graphData.push({ nodes: count, 'AI-Based': results['AI-Based'][parameter], 'Traditional': results['Traditional'][parameter] });
        }
        
        const ChartComponent = (
            <div style={{width: '100%', height: '100%'}}>
              <h2 style={{color: '#9ca3af', textAlign: 'center'}}>{parameter} vs. Number of Nodes ({currentTopology})</h2>
              <ResponsiveContainer width="100%" height="90%">
                <LineChart data={graphData} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="nodes" stroke="#9ca3af" label={{ value: 'Number of Nodes', position: 'insideBottom', offset: -5, fill: '#9ca3af' }} />
                  <YAxis stroke="#9ca3af" label={{ value: String(parameter), angle: -90, position: 'insideLeft', fill: '#9ca3af' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #38bdf8' }} />
                  <Legend />
                  <Line type="monotone" dataKey="AI-Based" stroke="#22d3ee" strokeWidth={2} />
                  <Line type="monotone" dataKey="Traditional" stroke="#f97316" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
        );

        const root = createRoot(chartContainer);
        root.render(ChartComponent);
        await new Promise(resolve => setTimeout(resolve, 500));

        const { default: html2canvas } = await import('html2canvas');
        const { default: jsPDF } = await import('jspdf');

        const canvas = await html2canvas(chartContainer, { backgroundColor: '#111827', useCORS: true, scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        
        const pdf = new jsPDF('l', 'pt', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        pdf.addImage(imgData, 'PNG', 40, 40, pdfWidth - 80, pdfHeight - 80);
        pdf.save(`${String(parameter).replace(/ /g, '_')}_vs_Nodes.pdf`);

        root.unmount();
        document.body.removeChild(chartContainer);

    } catch (error) {
        console.error("Failed to generate parameter graph PDF:", error);
        alert("An error occurred while generating the graph PDF.");
    } finally {
        setIsDownloadingReport(false);
    }
  };


  const handleReconstruct = useCallback(async () => {
    saveSnapshot();
    const weakNodeIds = nodes
      .filter(n => n.type === NetworkComponentType.NODE && n.energyEfficiency < WEAK_NODE_EFFICIENCY_THRESHOLD)
      .map(n => n.id);

    if (weakNodeIds.length === 0) return;

    const newNodes = nodes.filter(n => !weakNodeIds.includes(n.id));
    let newConnections: Connection[] = [];

    const topology = networkAnalysisService.identifyTopology(newNodes, connections, clusterHeadIds);

    // --- ENHANCED RECONSTRUCTION LOGIC ---
    if (topology.toLowerCase().includes('star')) {
        let hubNode = newNodes.find(n => n.type === NetworkComponentType.BASE_STATION || n.type === NetworkComponentType.SWITCH);
        if (!hubNode) { // If original hub was removed, find new most central node
            let minAvgDist = Infinity;
            newNodes.forEach(n1 => {
                const avgDist = newNodes.reduce((sum, n2) => sum + Math.hypot(n1.x - n2.x, n1.y - n2.y), 0) / newNodes.length;
                if (avgDist < minAvgDist) {
                    minAvgDist = avgDist;
                    hubNode = n1;
                }
            });
        }
        if (hubNode) {
            newConnections = newNodes
                .filter(n => n.id !== hubNode!.id)
                .map(n => ({ id: `re-${n.id}-${hubNode!.id}`, from: n.id, to: hubNode!.id }));
        }

    } else if (topology.toLowerCase().includes('ring')) {
        if (newNodes.length >= 2) {
            const getCentroid = (pts: Node[]) => {
                const center = pts.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
                center.x /= pts.length;
                center.y /= pts.length;
                return center;
            };
            const center = getCentroid(newNodes);
            const sortedNodes = [...newNodes].sort((a, b) => {
                const angleA = Math.atan2(a.y - center.y, a.x - center.x);
                const angleB = Math.atan2(b.y - center.y, b.x - center.x);
                return angleA - angleB;
            });
            for (let i = 0; i < sortedNodes.length; i++) {
                const fromNode = sortedNodes[i];
                const toNode = sortedNodes[(i + 1) % sortedNodes.length];
                newConnections.push({ id: `re-${fromNode.id}-${toNode.id}`, from: fromNode.id, to: toNode.id });
            }
        }
    } else if (topology.toLowerCase().includes('grid') || topology.toLowerCase().includes('mesh')) {
        // For Grid and Mesh, a k-nearest neighbor approach is robust.
        const K_NEAREST = newNodes.length > 5 ? 3 : 2;
        newNodes.forEach(sourceNode => {
            const distances = newNodes
                .filter(n => n.id !== sourceNode.id)
                .map(targetNode => ({ id: targetNode.id, dist: Math.hypot(sourceNode.x - targetNode.x, sourceNode.y - targetNode.y) }))
                .sort((a, b) => a.dist - b.dist);
            
            for (let k = 0; k < Math.min(K_NEAREST, distances.length); k++) {
                const targetNodeId = distances[k].id;
                const exists = newConnections.some(c => (c.from === sourceNode.id && c.to === targetNodeId) || (c.from === targetNodeId && c.to === sourceNode.id));
                if (!exists) {
                    newConnections.push({ id: `re-${sourceNode.id}-${targetNodeId}`, from: sourceNode.id, to: targetNodeId });
                }
            }
        });

    } else {
        // --- Generic/Cluster Fallback Reconnection Logic ---
        newConnections = connections.filter(c => !weakNodeIds.includes(c.from) && !weakNodeIds.includes(c.to));
    }
    
    // --- Final Step: Ensure full connectivity for all topologies ---
    if (newNodes.length >= 2) {
        const components = networkAnalysisService.findNetworkComponents(newNodes, newConnections);
        if (components.length > 1) {
            components.sort((a, b) => b.length - a.length);
            const mainComponent = components.shift()!;
            for (const isolatedComponent of components) {
                let minDistance = Infinity;
                let bestConnection: { from: string; to: string } | null = null;
                for (const sourceNode of isolatedComponent) {
                    for (const targetNode of mainComponent) {
                        const distance = Math.hypot(sourceNode.x - targetNode.x, sourceNode.y - targetNode.y);
                        if (distance < minDistance) {
                            minDistance = distance;
                            bestConnection = { from: sourceNode.id, to: targetNode.id };
                        }
                    }
                }
                if (bestConnection) {
                    newConnections.push({ id: `${bestConnection.from}-${bestConnection.to}-${Date.now()}`, from: bestConnection.from, to: bestConnection.to });
                    mainComponent.push(...isolatedComponent);
                }
            }
        }
    }


    setNodes(newNodes);
    setConnections(newConnections);
    const remainingClusterHeadIds = clusterHeadIds.filter(id => !weakNodeIds.includes(id));
    setClusterHeadIds(remainingClusterHeadIds);
    setSelectedNodeIds([]);
    setAnalysisContent(null);
    setIdentifiedTopology(null);
    setAnimatedPackets([]);
    
    alert(`Removed ${weakNodeIds.length} weaker node(s). The network has been reconnected and the report will now be updated.`);
    
    if (newNodes.length >= 2) {
      setIsAnalyzing(true);
      try {
        const newTopology = networkAnalysisService.identifyTopology(newNodes, newConnections, remainingClusterHeadIds);
        setIdentifiedTopology(newTopology);
        const networkData = networkAnalysisService.getNetworkStats(newNodes, newConnections);
        const analysisPromise = geminiService.getStructuredAnalysis({ ...networkData, topology: newTopology });
        
        const params = networkAnalysisService.simulatePerformance(newTopology, newNodes, newConnections, [], 'after');
        setSimulationParams(params);

        const newAnalysis = await analysisPromise;
        setAnalysisContent(newAnalysis);

      } catch (error) {
        console.error("Re-analysis failed after reconstruction:", error);
        setAnalysisContent('**Error:** Could not regenerate analysis after reconstruction.');
      } finally {
        setIsAnalyzing(false);
        startMobility(); // Keep the network "live" after reconstruction
      }
    } else {
        clearAnalysis();
    }
  }, [nodes, connections, setNodes, setConnections, clearAnalysis, startMobility, saveSnapshot, clusterHeadIds, setClusterHeadIds]);
  
  const handleSaveNetwork = useCallback(() => {
    if (nodes.length === 0) {
        return; // Button is disabled, but this is a safeguard
    }
    addToHistory('Saved current network layout');
    const dataToSave = {
        nodes,
        connections,
    };
    const jsonString = JSON.stringify(dataToSave, null, 2);
    setNetworkDataToSave(jsonString);
    setIsSaveModalOpen(true);
  }, [nodes, connections, addToHistory]);

  const performSave = useCallback((fileName: string, content: string) => {
    let parsedContent;
    try {
        parsedContent = JSON.parse(content);
    } catch (error) {
        alert("The content is not valid JSON. Please correct it before saving.");
        return;
    }

    if (!parsedContent.nodes || !parsedContent.connections || !Array.isArray(parsedContent.nodes) || !Array.isArray(parsedContent.connections)) {
        alert("Invalid network structure. The JSON must contain 'nodes' and 'connections' arrays.");
        return;
    }

    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = fileName.endsWith('.json') ? fileName : `${fileName}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setIsSaveModalOpen(false);
  }, []);

  const handleLoadNetwork = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.json')) {
      alert('Invalid file type. Please select a valid network configuration file (.json).');
      if (event.target) {
        event.target.value = '';
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') {
          throw new Error("Failed to read file content.");
        }
        const data = JSON.parse(text);

        // Basic validation
        if (Array.isArray(data.nodes) && Array.isArray(data.connections)) {
          saveSnapshot();
          clearAnalysis();
          setNodes(data.nodes);
          setConnections(data.connections);
          alert(`Successfully loaded network from ${file.name}`);
        } else {
          throw new Error("Invalid network file format. 'nodes' and 'connections' arrays are required.");
        }
      } catch (error) {
        console.error("Failed to load network file:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        alert(`Error loading file: ${file.name}.\n\nPlease ensure the file is a valid JSON network configuration.\n\nDetails: ${errorMessage}`);
      } finally {
        // Reset file input value to allow loading the same file again
        if (event.target) {
          event.target.value = '';
        }
      }
    };
    reader.onerror = () => {
      alert(`Failed to read the file: ${reader.error}`);
      if (event.target) {
        event.target.value = '';
      }
    };
    reader.readAsText(file);

  }, [setNodes, setConnections, clearAnalysis, saveSnapshot]);

    const handleSensorEvent = useCallback((eventType: SensorEventType) => {
    saveSnapshot();
    setNodes(prevNodes => {
      if (prevNodes.length === 0) return [];

      const baseline = {
        temperature: 25.0,
        humidity: 45.0,
        signalInterference: -90,
      };

      if (eventType === 'reset') {
        return prevNodes.map(node => ({
          ...node,
          // also reset efficiency of damaged nodes
          energyEfficiency: node.type === NetworkComponentType.NODE ? Math.round(80 + Math.random() * 20) : 100,
          sensorData: { ...baseline }
        }));
      }

      return prevNodes.map(node => {
        const currentData = node.sensorData || { ...baseline };
        let newData = { ...currentData };
        let newEnergyEfficiency = node.energyEfficiency;
        
        switch (eventType) {
            case 'heat':
                // Affect 40% of nodes with a major spike
                if (Math.random() < 0.4) {
                newData.temperature = baseline.temperature + 20 + Math.random() * 15; // 45-60°C
                }
                break;
            case 'humidity':
                // Affect 80% of nodes
                if (Math.random() < 0.8) {
                newData.humidity = Math.min(100, baseline.humidity + 30 + Math.random() * 20); // 75-95%
                }
                break;
            case 'flood':
                // Affect 90% of nodes with max humidity, interference, and potential damage
                if (Math.random() < 0.9) {
                    newData.humidity = 100.0;
                    newData.signalInterference = baseline.signalInterference - 30 - Math.random() * 20; // -120 to -140 dBm
                    // 30% chance of physical damage from flooding for non-infrastructure nodes
                    if (node.type === NetworkComponentType.NODE && Math.random() < 0.3) {
                        newEnergyEfficiency = Math.round(Math.random() * 15); // 0-15% efficiency (damaged)
                    }
                }
                break;
            case 'interference':
                // Affect 50% of nodes with significant interference
                if (Math.random() < 0.5) {
                newData.signalInterference = baseline.signalInterference - 20 - Math.random() * 15; // -110 to -125 dBm
                }
                break;
        }
        
        return { ...node, sensorData: newData, energyEfficiency: newEnergyEfficiency };
      });
    });
  }, [setNodes, saveSnapshot]);


  const selectedNode = selectedNodeIds.length === 1 ? nodes.find((n) => n.id === selectedNodeIds[0]) : null;
  const selectedConnection = connections.find(c => c.id === selectedConnectionId) || null;
  const weakNodes = nodes.filter(n => n.type === NetworkComponentType.NODE && n.energyEfficiency < WEAK_NODE_EFFICIENCY_THRESHOLD);

  const handleZoomIn = () => setZoom(z => Math.min(MAX_ZOOM, z + ZOOM_STEP));
  const handleZoomOut = () => setZoom(z => Math.max(MIN_ZOOM, z - ZOOM_STEP));
  const handleZoomReset = () => setZoom(1);

  return (
    <>
      <div className="h-full flex flex-col gap-4 animate-fadeIn">
        <div className="flex-grow flex flex-col lg:flex-row gap-4">
          <div className="w-full lg:w-1/4 xl:w-1/5 flex flex-col gap-4">
              <Toolbar 
                  onAnalyze={handleAnalyze} 
                  isAnalyzing={isAnalyzing} 
                  nodeCount={nodes.length}
                  onGenerateNetwork={generateNetwork}
                  isGeneratingNetwork={isGeneratingNetwork}
                  isConnectionMode={isConnectionMode}
                  onToggleConnectionMode={toggleConnectionMode}
                  isPacketSimulationMode={isPacketSimulationMode}
                  onTogglePacketSimulationMode={togglePacketSimulationMode}
                  onDownloadReport={handleDownloadFullReport}
                  analysisPerformed={!!analysisContent}
                  isDownloadingReport={isDownloadingReport}
                  onSaveNetwork={handleSaveNetwork}
                  onLoadNetwork={handleLoadNetwork}
                  onDownloadParameterGraph={handleDownloadParameterGraph}
              />
              {isPacketSimulationMode && (
                  <div className="bg-gray-800/60 rounded-lg shadow-xl border border-cyan-500/20 p-4 animate-fadeIn">
                      <h3 className="text-lg font-bold text-cyan-300 mb-2">Packet Message</h3>
                      <p className="text-xs text-gray-400 mb-2">Edit the message for the AI (blue) and Traditional (orange) packets.</p>
                      <textarea 
                          value={packetMessage}
                          onChange={(e) => setPacketMessage(e.target.value)}
                          className="w-full h-28 bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white text-sm resize-none focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                          aria-label="Packet message editor"
                      />
                  </div>
              )}
              {selectedNode && !isConnectionMode && !isPacketSimulationMode && (
                  <PropertiesPanel 
                      node={selectedNode} 
                      onUpdate={updateNode} 
                      onRouterAutoConnect={handleRouterAutoConnect}
                      onDelete={deleteSelectedNodes}
                  />
              )}
              {selectedConnection && !isConnectionMode && !isPacketSimulationMode && <ConnectionPanel connection={selectedConnection} nodes={nodes} onDelete={deleteSelectedConnection} />}
              
              {deliveredPackets.length > 0 && (
                <PacketDeliveryLog
                  packets={deliveredPackets}
                  onClear={() => setDeliveredPackets([])}
                />
              )}

              <div className="bg-gray-800/60 rounded-lg shadow-xl border border-cyan-500/20">
                  {(isAnalyzing || analysisContent) && (
                    <AIInsightsPanel
                      isLoading={isAnalyzing}
                      content={analysisContent}
                      topologyName={identifiedTopology}
                    />
                  )}
              </div>

          </div>
          <div className="w-full lg:w-3/4 xl:w-4/5 relative">
             {(isGeneratingNetwork || isAnalyzing) && (
                <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center rounded-lg">
                    <svg className="animate-spin h-10 w-10 text-cyan-400 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-xl font-bold text-cyan-200">{loadingMessage}</p>
                </div>
            )}
            <div ref={canvasViewportRef} className="w-full h-full bg-gray-800/60 rounded-lg shadow-xl border border-cyan-500/20 overflow-auto">
                <NetworkCanvas
                    ref={canvasRef}
                    nodes={nodes}
                    setNodes={setNodes}
                    connections={connections}
                    setConnections={setConnections}
                    selectedNodeIds={selectedNodeIds}
                    setSelectedNodeIds={setSelectedNodeIds}
                    selectedConnectionId={selectedConnectionId}
                    setSelectedConnectionId={setSelectedConnectionId}
                    onAddComponent={addNode}
                    isConnectionMode={isConnectionMode}
                    isPacketSimulationMode={isPacketSimulationMode}
                    onNodeClickForSimulation={handleNodeClickForSimulation}
                    packetSimSourceNodes={packetSimSourceNodes}
                    animatedPackets={animatedPackets}
                    isolatedMaliciousNodeIds={isolatedMaliciousNodeIds}
                    droppedPacketEvents={droppedPacketEvents}
                    weakNodeIds={weakNodes.map(n => n.id)}
                    clusterHeadIds={clusterHeadIds}
                    saveSnapshot={saveSnapshot}
                    zoom={zoom}
                />
            </div>
            <div className="absolute left-4 top-4 z-10 bg-gray-900/50 backdrop-blur-sm rounded-lg p-2 flex flex-col items-center space-y-2 border border-cyan-500/10">
                <button onClick={handleZoomIn} title="Zoom In" className="w-8 h-8 flex items-center justify-center bg-gray-700 hover:bg-cyan-500 rounded-md transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" /></svg></button>
                <span className="font-bold text-xs text-cyan-200 select-none">{Math.round(zoom * 100)}%</span>
                <button onClick={handleZoomOut} title="Zoom Out" className="w-8 h-8 flex items-center justify-center bg-gray-700 hover:bg-cyan-500 rounded-md transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" /></svg></button>
                <div className="w-full h-px bg-cyan-500/20"></div>
                <button onClick={handleFitToView} title="Fit to View" className="w-8 h-8 flex items-center justify-center bg-gray-700 hover:bg-cyan-500 rounded-md transition-colors" disabled={nodes.length === 0}><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm14 1a1 1 0 01.993.883L19 5v10a1 1 0 11-2 0V5a1 1 0 011-1zm-9 0a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1z" clipRule="evenodd" /></svg></button>
                <button onClick={handleZoomReset} title="Reset Zoom" className="w-8 h-8 flex items-center justify-center bg-gray-700 hover:bg-cyan-500 rounded-md transition-colors">1:1</button>
            </div>
          </div>
        </div>
        {simulationParams && (
          <div className="mt-4">
              <ReportDashboard
                ref={reportDashboardRef}
                simulationData={simulationParams}
                nodes={nodes}
                weakNodes={weakNodes}
                onReconstruct={handleReconstruct}
                onUpdateNodeIp={updateNodeIp}
                isUpdating={isReportUpdating}
                onSimulateSensorEvent={handleSensorEvent}
              />
          </div>
          )}
      </div>
      <SaveNetworkModal
          isOpen={isSaveModalOpen}
          onClose={() => setIsSaveModalOpen(false)}
          initialContent={networkDataToSave}
          onSave={performSave}
      />
    </>
  );
};

export default VisualBuilderWorkspace;