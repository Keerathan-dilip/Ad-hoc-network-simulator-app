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
import SensorDataTable from './SensorDataTable';
import LiveSensorControl from './LiveSensorControl';
import LiveMonitoringCharts from './LiveMonitoringCharts';

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
  const [activeInfoTab, setActiveInfoTab] = useState<'performance' | 'environment'>('performance');


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
    const generateAndRenderGraph = async (parameter: keyof SimulationParameters) => {
        const { createRoot } = await import('react-dom/client');
        const { default: html2canvas } = await import('html2canvas');
        
        const chartContainer = document.createElement('div');
        chartContainer.style.position = 'absolute';
        chartContainer.style.left = '-9999px';
        chartContainer.style.width = '800px';
        chartContainer.style.height = '500px';
        chartContainer.style.backgroundColor = '#1f2937'; // Dark background
        chartContainer.style.padding = '20px';
        document.body.appendChild(chartContainer);

        const nodeCounts = [10, 20, 40, 60, 80, 100];
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

        const currentUserDataPoint = simulationParams ? { nodes: nodes.length, 'Enhanced': simulationParams['AI-Based'][parameter], 'Baseline': simulationParams['Traditional'][parameter] } : null;

        const lowerIsBetter = parameter === 'End-to-end Delay (ms)' || parameter === 'Energy Consumption (J)';
        const unit = String(parameter).match(/\((.*?)\)/)?.[1] || '';
        const paramName = String(parameter).split('(')[0].trim();

        const ChartComponent = (
            <div style={{width: '100%', height: '100%', fontFamily: 'sans-serif', color: '#e5e7eb' }}>
                <h2 style={{color: '#e5e7eb', textAlign: 'center', fontSize: '22px', fontWeight: 'bold'}}>{paramName} vs Number of Nodes</h2>
                <h3 style={{color: '#cbd5e1', textAlign: 'center', fontSize: '16px', marginBottom: '20px'}}>Enhanced Security & Efficiency</h3>
                <ResponsiveContainer width="100%" height="85%">
                {/* FIX: The `isAnimationActive` prop is not valid on LineChart. It has been moved to the individual Line components to prevent animations during static chart generation. */}
                <LineChart data={graphData} margin={{ top: 20, right: 40, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
                    <XAxis dataKey="nodes" type="number" stroke="#9ca3af" domain={['dataMin', 'dataMax']} label={{ value: 'Number of Nodes', position: 'insideBottom', offset: -15, fill: '#9ca3af' }} />
                    <YAxis stroke="#9ca3af" domain={['auto', 'auto']} reversed={lowerIsBetter} label={{ value: `${paramName} (${unit})`, angle: -90, position: 'insideLeft', offset: -10, fill: '#9ca3af' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #22d3ee' }} isAnimationActive={false} />
                    <Legend wrapperStyle={{ color: '#e5e7eb' }}/>
                    <Line type="monotone" dataKey="Enhanced" stroke="#22d3ee" strokeWidth={3} dot={{ r: 5, fill: '#22d3ee', stroke: '#1f2937', strokeWidth: 2 }} activeDot={{r: 8}} isAnimationActive={false} />
                    <Line type="monotone" dataKey="Baseline" stroke="#f97316" strokeWidth={3} dot={{ r: 5, fill: '#f97316', stroke: '#1f2937', strokeWidth: 2 }} activeDot={{r: 8}} isAnimationActive={false} />
                    {currentUserDataPoint && <ReferenceDot x={currentUserDataPoint.nodes} y={currentUserDataPoint['Enhanced']} r={8} fill="#22d3ee" stroke="white" strokeWidth={2} />}
                    {currentUserDataPoint && <ReferenceDot x={currentUserDataPoint.nodes} y={currentUserDataPoint['Baseline']} r={8} fill="#f97316" stroke="white" strokeWidth={2} />}
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

        const pdf = new jsPDF('p', 'pt', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const margin = 40;
        const contentWidth = pdfWidth - margin * 2;
        let yPos = margin;

        const addPageBreaks = (currentY: number, neededHeight: number = 40) => {
            if (currentY > pdfHeight - margin - neededHeight) {
                pdf.addPage();
                return margin;
            }
            return currentY;
        };
        
        const renderText = (text: string, x: number, y: number, options: any = {}) => {
            const lines = pdf.splitTextToSize(text, options.maxWidth || contentWidth);
            const lineHeight = (pdf.getLineHeight() * 1.15) / pdf.internal.scaleFactor;
            const neededHeight = lines.length * lineHeight;
            
            y = addPageBreaks(y, neededHeight);

            pdf.text(lines, x, y, options);
            return y + neededHeight;
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
            y = addPageBreaks(y, 40);
            pdf.setFontSize(18);
            pdf.text(title, margin, y);
            pdf.setDrawColor(100, 100, 100);
            pdf.line(margin, y + 8, pdfWidth - margin, y + 8);
            return y + 30;
        };

        const renderSubSectionTitle = (title: string, y: number) => {
            y = addPageBreaks(y, 25);
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(12);
            pdf.setTextColor(60, 60, 60);
            y = renderText(title, margin, y, {});
            pdf.setTextColor(0, 0, 0);
            pdf.setFont('helvetica', 'normal');
            return y + 5;
        };
        
        const renderBreakdown = (breakdown: any, y: number) => {
            if (!breakdown) return y;
            y = renderSubSectionTitle(breakdown.title, y);
            pdf.setFontSize(10);
            y = renderText(breakdown.description, margin, y, {});
            y += 10;
            
            pdf.setFont('courier', 'bold');
            y = renderText(`Formula: ${breakdown.formula}`, margin, y, {});
            pdf.setFont('helvetica', 'normal');
            y += 10;

            // Render text-based table
            if (breakdown.headers && breakdown.data) {
                const colWidths = [120, 200, contentWidth - 320];
                pdf.setFont('helvetica', 'bold');
                y = addPageBreaks(y, 20);
                pdf.text(breakdown.headers[0], margin, y);
                pdf.text(breakdown.headers[1], margin + colWidths[0], y);
                if (breakdown.headers[2]) pdf.text(breakdown.headers[2], margin + colWidths[0] + colWidths[1], y);
                y += pdf.getLineHeight() / pdf.internal.scaleFactor;
                pdf.setDrawColor(150, 150, 150);
                pdf.line(margin, y, pdfWidth - margin, y);
                y += 5;
                pdf.setFont('helvetica', 'normal');

                breakdown.data.forEach((row: string[]) => {
                    const rowText1 = pdf.splitTextToSize(row[0], colWidths[0] - 10);
                    const rowText2 = pdf.splitTextToSize(row[1], colWidths[1] - 10);
                    const rowText3 = row[2] ? pdf.splitTextToSize(row[2], colWidths[2] - 10) : [];
                    const lineCount = Math.max(rowText1.length, rowText2.length, rowText3.length);
                    const rowHeight = lineCount * (pdf.getLineHeight() * 1.15) / pdf.internal.scaleFactor;
                    
                    y = addPageBreaks(y, rowHeight);
                    
                    pdf.text(rowText1, margin, y);
                    pdf.text(rowText2, margin + colWidths[0], y);
                    if (rowText3.length > 0) pdf.text(rowText3, margin + colWidths[0] + colWidths[1], y);
                    
                    y += rowHeight + 5;
                });
            }
            return y + 15;
        };

        // --- RENDER PDF CONTENT ---
        renderTitlePage();
        yPos = renderSectionTitle('1. Network Topology Visualization', margin);
        const canvasImage = await html2canvas(canvasEl, { backgroundColor: '#1f2937', useCORS: true, logging: false, scale: 2 });
        const imgHeight = contentWidth * (canvasImage.height / canvasImage.width);
        yPos = addPageBreaks(yPos, imgHeight);
        pdf.addImage(canvasImage.toDataURL('image/png'), 'PNG', margin, yPos, contentWidth, imgHeight);
        yPos += imgHeight + 20;

        yPos = renderSectionTitle('2. AI-Powered Analysis', yPos, true);
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
            yPos = addPageBreaks(yPos, 40);
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
        for (const [index, param] of parametersToDetail.entries()) {
            yPos = renderSectionTitle(`${sectionCounter}. Detailed Analysis: ${param}`, margin, true);
            
            const graphCanvas = await generateAndRenderGraph(param);
            const graphHeight = contentWidth * (graphCanvas.height / graphCanvas.width);
            yPos = addPageBreaks(yPos, graphHeight);
            pdf.addImage(graphCanvas.toDataURL('image/png'), 'PNG', margin, yPos, contentWidth, graphHeight);
            yPos += graphHeight + 20;
            
            const paramInfo = networkAnalysisService.getParameterInfoText(param);
            if(paramInfo) {
                yPos = renderBreakdown(paramInfo.traditional, yPos);
                yPos = renderBreakdown(paramInfo.enhanced, yPos);
            }

            yPos = renderSubSectionTitle('Environmental Impact Analysis', yPos);
            const impact = networkAnalysisService.getEnvironmentalImpactText(param, nodes);
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(10);
            if (impact.isCritical) {
                pdf.setTextColor(239, 68, 68); // text-red-500
            }
            yPos = renderText(impact.text, margin, yPos, {});
            pdf.setTextColor(0, 0, 0);
            
            const nextParam = parametersToDetail[index + 1];
            if (nextParam) {
                const bridgeText = networkAnalysisService.getBridgingText(param, nextParam);
                yPos = addPageBreaks(yPos, 40) + 10;
                pdf.setFont('helvetica', 'italic');
                pdf.setFontSize(10);
                yPos = renderText(bridgeText, margin, yPos, {});
                pdf.setFont('helvetica', 'normal');
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
    if (!simulationParams || !identifiedTopology) {
        alert("Please run a full analysis first to generate data for the graph.");
        return;
    }
    
    setIsDownloadingReport(true);
    try {
        const canvas = await generateAndRenderGraph(parameter);
        const link = document.createElement('a');
        const paramName = String(parameter).split('(')[0].trim().replace(/\s+/g, '_');
        link.download = `${paramName}_scalability_graph.png`;
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        console.error(`Failed to generate graph for ${parameter}:`, error);
        alert(`An error occurred while generating the graph for ${parameter}.`);
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
    
    alert(`Removed ${weakNodeIds.length} weaker node(s) and reconnected the network.`);
    
  }, [nodes, connections, setNodes, setConnections, saveSnapshot, clusterHeadIds, setClusterHeadIds]);
  
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
    
  const TabButton = ({ isActive, onClick, children }: { isActive: boolean, onClick: () => void, children: React.ReactNode }) => (
      <button
        onClick={onClick}
        className={`px-4 py-2 text-sm font-medium transition-colors duration-200 focus:outline-none ${
          isActive
            ? 'border-b-2 border-cyan-400 text-cyan-300'
            : 'text-gray-400 hover:text-white'
        }`}
        aria-pressed={isActive}
      >
        {children}
      </button>
  );

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
                  onDownloadParameterGraph={handleDownloadParameterGraph}
                  analysisPerformed={!!analysisContent}
                  isDownloadingReport={isDownloadingReport}
                  onSaveNetwork={handleSaveNetwork}
                  onLoadNetwork={handleLoadNetwork}
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
              <div className="flex border-b border-cyan-500/20 mb-[-1px] pl-2">
                  <TabButton isActive={activeInfoTab === 'performance'} onClick={() => setActiveInfoTab('performance')}>
                      Performance Report
                  </TabButton>
                  <TabButton isActive={activeInfoTab === 'environment'} onClick={() => setActiveInfoTab('environment')}>
                      Environmental Sensing
                  </TabButton>
              </div>

              {activeInfoTab === 'performance' && (
                  <>
                    <ReportDashboard
                      ref={reportDashboardRef}
                      simulationData={simulationParams}
                      isUpdating={isReportUpdating}
                      onDownloadParameterGraph={handleDownloadParameterGraph}
                      nodes={nodes}
                      onReconstruct={handleReconstruct}
                      onUpdateNodeIp={updateNodeIp}
                    />
                    <LiveMonitoringCharts initialData={simulationParams} />
                  </>
              )}
              {activeInfoTab === 'environment' && (
                <div className="bg-gray-800 rounded-lg rounded-tl-none shadow-2xl border border-cyan-500/20 p-4 animate-fadeIn">
                    <h2 className="text-2xl font-bold text-cyan-300 mb-4">Environmental Sensing & Control</h2>
                    <div className="flex flex-col lg:flex-row gap-4">
                        <div className="w-full lg:w-2/3">
                            <SensorDataTable nodes={nodes} />
                        </div>
                        <div className="w-full lg:w-1/3">
                            <LiveSensorControl
                                onSimulateEvent={handleSensorEvent}
                                disabled={isAnalyzing || isGeneratingNetwork}
                            />
                        </div>
                    </div>
                </div>
              )}
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