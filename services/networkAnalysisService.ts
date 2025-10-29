import { Node, Connection, SimulationParameters, NetworkComponentType, NetworkTopology } from '../types';

type PerformanceState = 'before' | 'after';


// --- Data structure from user's table ---
interface PerformanceSet {
  pdr: number;
  delay: number;
  energyConsumption: number;
  lifetime: number;
  scalability: number;
  compEfficiency: number;
  energyEfficiency: number;
  robustness: number;
  throughput: number;
}

interface PerformanceTier {
  range: [number, number];
  before: PerformanceSet;
  after: PerformanceSet;
}

const scalabilityMap: { [key: string]: number } = {
    'Low': 0.4,
    'Medium': 0.6,
    'Medium-High': 0.75,
    'High': 0.9,
};

// Data derived from the user-provided performance table
const performanceTiers: PerformanceTier[] = [
    {
        range: [1, 50],
        before: { pdr: 0.92, delay: 60, energyConsumption: 55, lifetime: 68, scalability: scalabilityMap['Low'], compEfficiency: 90, energyEfficiency: 0.92, robustness: 0.85, throughput: 7 },
        after:  { pdr: 0.96, delay: 55, energyConsumption: 50, lifetime: 70, scalability: scalabilityMap['Medium'], compEfficiency: 94, energyEfficiency: 0.96, robustness: 0.90, throughput: 8 }
    },
    {
        range: [50, 150],
        before: { pdr: 0.88, delay: 95, energyConsumption: 240, lifetime: 52, scalability: scalabilityMap['Medium'], compEfficiency: 85, energyEfficiency: 0.88, robustness: 0.78, throughput: 7.5 },
        after:  { pdr: 0.93, delay: 80, energyConsumption: 210, lifetime: 58, scalability: scalabilityMap['High'], compEfficiency: 90, energyEfficiency: 0.93, robustness: 0.85, throughput: 9 }
    },
    {
        range: [150, 250],
        before: { pdr: 0.85, delay: 120, energyConsumption: 480, lifetime: 46, scalability: scalabilityMap['Medium'], compEfficiency: 83, energyEfficiency: 0.85, robustness: 0.75, throughput: 8 },
        after:  { pdr: 0.91, delay: 95, energyConsumption: 420, lifetime: 53, scalability: scalabilityMap['High'], compEfficiency: 89, energyEfficiency: 0.91, robustness: 0.83, throughput: 9.5 }
    },
    {
        range: [250, 350],
        before: { pdr: 0.82, delay: 150, energyConsumption: 720, lifetime: 42, scalability: scalabilityMap['Medium-High'], compEfficiency: 80, energyEfficiency: 0.82, robustness: 0.70, throughput: 7.5 },
        after:  { pdr: 0.88, delay: 120, energyConsumption: 650, lifetime: 50, scalability: scalabilityMap['High'], compEfficiency: 87, energyEfficiency: 0.88, robustness: 0.80, throughput: 9 }
    },
    {
        range: [350, 450], // Max nodes is 450
        before: { pdr: 0.80, delay: 180, energyConsumption: 1100, lifetime: 36, scalability: scalabilityMap['Medium'], compEfficiency: 75, energyEfficiency: 0.80, robustness: 0.65, throughput: 9 },
        after:  { pdr: 0.87, delay: 140, energyConsumption: 950, lifetime: 45, scalability: scalabilityMap['High'], compEfficiency: 85, energyEfficiency: 0.87, robustness: 0.78, throughput: 11 }
    }
];

const AVERAGE_NODE_ENERGY_JOULES = 1000;

// This is a simplified analysis service for demonstration purposes.
class NetworkAnalysisService {
  public getNetworkStats(nodes: Node[], connections: Connection[]) {
    const nodeCount = nodes.length;
    if (nodeCount === 0) {
        return {
            nodeCount: 0,
            connectionCount: 0,
            avgDegree: 0,
            isolatedNodes: 0,
            routerCount: 0,
            switchCount: 0,
            baseStationCount: 0,
            avgEnergyEfficiency: 0,
            weakNodes: 0,
        };
    }

    const adjacency: { [key: string]: string[] } = {};
    nodes.forEach(n => adjacency[n.id] = []);
    connections.forEach(c => {
      adjacency[c.from]?.push(c.to);
      adjacency[c.to]?.push(c.from);
    });

    const nodeDegrees = nodes.map(n => adjacency[n.id]?.length || 0);
    const avgDegree = nodeDegrees.reduce((a, b) => a + b, 0) / nodeCount;
    const endNodes = nodes.filter(n => n.type === NetworkComponentType.NODE);
    
    return {
        nodeCount: nodeCount,
        connectionCount: connections.length,
        avgDegree: avgDegree,
        isolatedNodes: nodeDegrees.filter(d => d === 0).length,
        routerCount: nodes.filter(n => n.type === NetworkComponentType.ROUTER).length,
        switchCount: nodes.filter(n => n.type === NetworkComponentType.SWITCH).length,
        baseStationCount: nodes.filter(n => n.type === NetworkComponentType.BASE_STATION).length,
        avgEnergyEfficiency: endNodes.length > 0 ? endNodes.reduce((sum, node) => sum + node.energyEfficiency, 0) / endNodes.length : 100,
        weakNodes: endNodes.filter(n => n.energyEfficiency < 85).length,
    };
  }

  public identifyTopology(nodes: Node[], connections: Connection[], clusterHeadIds: string[] = []): string {
    const nodeCount = nodes.length;
    if (nodeCount < 3) return 'Linear Topology';

    const adjacency: { [key: string]: string[] } = {};
    nodes.forEach(n => { adjacency[n.id] = []; });
    connections.forEach(c => {
        if (adjacency[c.from] && adjacency[c.to]) {
            adjacency[c.from].push(c.to);
            adjacency[c.to].push(c.from);
        }
    });

    const nodeDegrees = new Map<string, number>();
    nodes.forEach(n => nodeDegrees.set(n.id, adjacency[n.id]?.length || 0));
    const degrees = Array.from(nodeDegrees.values());
    const avgDegree = degrees.reduce((a, b) => a + b, 0) / nodeCount;
    const components = this.findNetworkComponents(nodes, connections);

    // --- 1. Priority check for high-connectivity topologies (Mesh/Grid) ---
    if (components.length <= 2 && avgDegree > 2.5) {
        const nodePositions = nodes.map(n => ({x: n.x, y: n.y}));
        const xCoords = [...new Set(nodePositions.map(p => p.x))].sort((a,b) => a - b);
        const yCoords = [...new Set(nodePositions.map(p => p.y))].sort((a,b) => a - b);
        
        if (xCoords.length > 2 && yCoords.length > 2) {
            const xGaps = xCoords.slice(1).map((x, i) => x - xCoords[i]);
            const yGaps = yCoords.slice(1).map((y, i) => y - yCoords[i]);
            const avgXGap = xGaps.reduce((a,b) => a + b, 0) / xGaps.length;
            const avgYGap = yGaps.reduce((a,b) => a + b, 0) / yGaps.length;
            const xStdDev = Math.sqrt(xGaps.map(g => (g - avgXGap) ** 2).reduce((a,b) => a+b, 0) / xGaps.length);
            const yStdDev = Math.sqrt(yGaps.map(g => (g - avgYGap) ** 2).reduce((a,b) => a+b, 0) / yGaps.length);

            if (avgXGap > 0 && xStdDev / avgXGap < 0.3 && avgYGap > 0 && yStdDev / avgYGap < 0.3 && xCoords.length * yCoords.length >= nodeCount * 0.7) {
                return 'Grid Topology';
            }
        }
        return 'Mesh Topology';
    }

    // --- 2. Check for explicit Cluster topology ---
    if (clusterHeadIds.length > 0) {
        const endNodes = nodes.filter(n => !clusterHeadIds.includes(n.id) && n.type !== NetworkComponentType.BASE_STATION);
        let clusterConnections = 0;
        endNodes.forEach(en => {
            if ((adjacency[en.id] || []).some(neighborId => clusterHeadIds.includes(neighborId))) {
                clusterConnections++;
            }
        });
        if (endNodes.length > 0 && clusterConnections / endNodes.length > 0.5) {
            return avgDegree > 3.0 ? 'Cluster Mesh Topology' : 'Cluster Topology';
        }
    }

    // --- 3. Stricter check for Star topology ---
    const highDegreeNodesCount = degrees.filter(d => d >= nodeCount - 3).length;
    const lowDegreeNodesCount = degrees.filter(d => d === 1).length;
    if (highDegreeNodesCount === 1 && lowDegreeNodesCount >= nodeCount - 2) {
        return 'Star Topology';
    }

    // --- 4. Check for degree-based topologies ---
    if (degrees.every(d => d === 2)) return 'Ring Topology';
    if (degrees.filter(d => d === 1).length === 2 && degrees.filter(d => d === 2).length === nodeCount - 2) {
        return 'Bus Topology';
    }
    
    // --- 5. Fallback ---
    if (components.length > 2) {
        return `Hybrid Topology (${components.length} disconnected components)`;
    }
    return 'Hybrid Topology';
  }

  public findNetworkComponents(nodes: Node[], connections: Connection[]): Node[][] {
    const components: Node[][] = [];
    if (nodes.length === 0) return components;

    const visited = new Set<string>();
    const adjacency: { [key: string]: string[] } = {};
    
    nodes.forEach(n => adjacency[n.id] = []);
    connections.forEach(c => {
        adjacency[c.from]?.push(c.to);
        adjacency[c.to]?.push(c.from);
    });

    for (const node of nodes) {
        if (!visited.has(node.id)) {
            const currentComponentNodes: Node[] = [];
            const queue: Node[] = [node];
            visited.add(node.id);
            
            while (queue.length > 0) {
                const currentNode = queue.shift()!;
                currentComponentNodes.push(currentNode);
                
                const neighbors = adjacency[currentNode.id] || [];
                for (const neighborId of neighbors) {
                    if (!visited.has(neighborId)) {
                        visited.add(neighborId);
                        const neighborNode = nodes.find(n => n.id === neighborId);
                        if (neighborNode) {
                            queue.push(neighborNode);
                        }
                    }
                }
            }
            components.push(currentComponentNodes);
        }
    }
    
    return components;
  }

  public getParameterInfoText(parameter: keyof SimulationParameters): { definition: string, interpretation: string, comparison: string } {
    switch(parameter) {
        case 'Packet Delivery Ratio':
            return {
                definition: "Packet Delivery Ratio (PDR) is the ratio of data packets successfully delivered to a destination compared to the number of packets sent by the source. It is a fundamental measure of network reliability.",
                interpretation: "The graph shows how PDR changes as the network size increases. A higher, flatter line indicates a more reliable protocol that maintains performance under scale. The current network's PDR is marked on the graph for both protocols, showing their relative reliability for this specific topology.",
                comparison: "The AI-based algorithm consistently maintains a higher PDR. Its reinforcement learning model adapts to network changes, finding more stable routes and avoiding congested or failing nodes. Traditional protocols, often choosing the shortest path, are more susceptible to link breakages, resulting in higher packet loss, especially in larger or more dynamic networks."
            };
        case 'Throughput (Mbps)':
            return {
                definition: "Throughput measures the rate of successful data transmission through a network, typically in Megabits per second (Mbps). It reflects the actual bandwidth available to the application.",
                interpretation: "This graph illustrates the network's capacity to handle data traffic as it grows. A higher throughput value indicates better efficiency. The position of the current network's performance shows how its current configuration impacts data rate compared to a scaled scenario.",
                comparison: "The AI-based protocol achieves higher throughput by intelligently balancing loads and selecting routes with greater available capacity, avoiding the bottlenecks that can form in traditional shortest-path routing. This leads to more efficient use of the network's resources and better performance for data-intensive applications."
            };
        case 'End-to-end Delay (ms)':
            return {
                definition: "End-to-end Delay (or latency) is the time it takes for a packet to travel from its source to its destination across the network, measured in milliseconds (ms). It includes transmission, propagation, and queuing delays.",
                interpretation: "Lower delay is critical for real-time applications. This graph shows that as the network grows, delay tends to increase. The AI protocol's ability to manage congestion helps keep this increase in check. The current network's delay is highlighted.",
                comparison: "The AI model significantly reduces delay by learning to avoid congested nodes and inefficient paths. While traditional protocols might select a path with fewer hops, the AI considers the actual transit time, resulting in faster and more predictable delivery times."
            };
        case 'Energy Consumption (J)':
            return {
                definition: "Energy Consumption measures the total energy, in Joules (J), used by all nodes in the network to transmit, receive, and process data over a period. It is a critical metric for battery-powered ad hoc networks.",
                interpretation: "This graph demonstrates the energy efficiency of the protocols under scale. Lower consumption is vital for extending the operational life of the network. The current network's energy footprint is shown, providing a baseline for optimization.",
                comparison: "The AI's routing algorithm is designed for energy conservation. It prioritizes routes that use energy-efficient nodes and avoids over-utilizing specific nodes, leading to balanced energy drain and significantly lower overall consumption compared to energy-agnostic traditional protocols."
            };
        case 'Network Lifetime (hours)':
            return {
                definition: "Network Lifetime is the estimated time, in hours, until the first essential node in the network depletes its energy and fails. It is a key indicator of the network's long-term sustainability.",
                interpretation: "A longer network lifetime is crucial for long-term deployments. The graph shows that the AI protocol's energy-aware routing results in a much slower decline in lifetime as the network scales. The current network's projected lifetime highlights the benefit of the advanced protocol.",
                comparison: "By intelligently distributing the routing load and minimizing unnecessary transmissions, the AI-based protocol prevents premature node failure. This load-balancing strategy ensures that no single node becomes a 'hotspot' of activity, dramatically extending the operational life of the entire network compared to traditional methods."
            };
        case 'Robustness Index':
            return {
                definition: "The Robustness Index is a measure of a network's ability to maintain connectivity and performance in the face of node failures or link degradation. A higher index indicates greater resilience.",
                interpretation: "This graph shows the protocol's ability to withstand network disruptions as the number of nodes increases. The AI protocol's high and stable robustness index indicates its superior adaptability. The current network's robustness score reflects its resilience to potential failures.",
                comparison: "The AI-based protocol is proactive; it continuously monitors link quality and can predict potential failures, allowing it to reroute traffic before a link breaks. Traditional protocols are reactive, only seeking new routes after a failure has occurred, which leads to packet loss and lower robustness."
            };
        default:
            return {
                definition: "No definition available for this parameter.",
                interpretation: "No interpretation available for this parameter.",
                comparison: "No comparison available for this parameter."
            };
    }
  }

  public simulatePerformance(
    topology: string,
    nodes: Node[],
    connections: Connection[],
    maliciousNodeIds: string[] = [],
    state: PerformanceState = 'before'
  ): { 'AI-Based': SimulationParameters; 'Traditional': SimulationParameters } {
    const nodeCount = nodes.length;

    if (nodeCount === 0) { // Handle case with 0 or 1 node
        const emptyParams: SimulationParameters = {
            'Packet Delivery Ratio': 0, 'End-to-end Delay (ms)': 0, 'Energy Consumption (J)': 0,
            'Network Lifetime (hours)': 0, 'Sustained Operations (cycles)': 0, 'Scalability Index': 0,
            'Computational Efficiency (%)': 0, 'Energy Efficiency': 0, 'Robustness Index': 0, 'Throughput (Mbps)': 0,
        };
        return { 'AI-Based': emptyParams, 'Traditional': emptyParams };
    }
    
    // --- New logic using interpolation from the performance tiers table ---
    const getInterpolatedSet = (protocol: 'AI-Based' | 'Traditional'): PerformanceSet => {
        // Find the tiers to interpolate between
        let lowerTier = performanceTiers[0];
        let upperTier = performanceTiers[0];

        for (let i = 0; i < performanceTiers.length; i++) {
            const currentTier = performanceTiers[i];
            if (nodeCount <= currentTier.range[1]) {
                upperTier = currentTier;
                lowerTier = i > 0 ? performanceTiers[i - 1] : currentTier;
                break;
            }
            if (i === performanceTiers.length - 1) {
                lowerTier = upperTier = currentTier;
            }
        }
        
        const lowerSet = protocol === 'AI-Based' ? lowerTier.after : lowerTier.before;
        const upperSet = protocol === 'AI-Based' ? upperTier.after : upperTier.before;
        const lowerBound = lowerTier.range[1];
        const upperBound = upperTier.range[1];

        if (lowerBound === upperBound || nodeCount <= performanceTiers[0].range[1]) {
            return protocol === 'AI-Based' ? upperTier.after : upperTier.before;
        }

        const range = upperBound - lowerBound;
        const factor = range > 0 ? (nodeCount - lowerBound) / range : 0;

        const interpolated: Partial<PerformanceSet> = {};
        for (const key in lowerSet) {
            const k = key as keyof PerformanceSet;
            const lowerVal = lowerSet[k];
            const upperVal = upperSet[k];
            interpolated[k] = lowerVal + (upperVal - lowerVal) * factor;
        }
        return interpolated as PerformanceSet;
    }

    const mapSetToParams = (set: PerformanceSet): Partial<SimulationParameters> => ({
        'Packet Delivery Ratio': set.pdr,
        'End-to-end Delay (ms)': set.delay,
        'Energy Consumption (J)': set.energyConsumption,
        'Network Lifetime (hours)': set.lifetime,
        'Scalability Index': set.scalability,
        'Computational Efficiency (%)': set.compEfficiency,
        'Energy Efficiency': set.energyEfficiency,
        'Robustness Index': set.robustness,
        'Throughput (Mbps)': set.throughput,
    });
    
    // "AI-Based" protocol always uses the optimized 'after' values.
    // "Traditional" protocol always uses the standard 'before' values.
    let aiBased: Partial<SimulationParameters> = mapSetToParams(getInterpolatedSet('AI-Based'));
    let traditional: Partial<SimulationParameters> = mapSetToParams(getInterpolatedSet('Traditional'));

    // Apply Malicious Node Penalties on top of the baseline values
    if (maliciousNodeIds.length > 0) {
        const attackSeverity = 1 + maliciousNodeIds.length / nodes.length * 5;
        traditional['Packet Delivery Ratio']! *= (0.3 / attackSeverity);
        traditional['End-to-end Delay (ms)']! *= (1.5 * attackSeverity);
        traditional['Robustness Index']! *= 0.2;
        traditional['Throughput (Mbps)']! *= (0.1 / attackSeverity);
        // AI model is resilient but takes a small hit
        aiBased['Robustness Index']! *= 0.95;
        aiBased['Packet Delivery Ratio']! *= 0.98;
    }

    // Finalize parameters (rounding, clamping, calculating derived values)
    const endNodesCount = nodes.filter(n => n.type === NetworkComponentType.NODE).length || 1;
    const totalNetworkEnergy = endNodesCount * AVERAGE_NODE_ENERGY_JOULES;

    const finalizeParams = (params: Partial<SimulationParameters>): SimulationParameters => {
        if (params['Energy Consumption (J)']! > 0) {
             params['Sustained Operations (cycles)'] = totalNetworkEnergy / params['Energy Consumption (J)']!;
        } else {
             params['Sustained Operations (cycles)'] = Infinity;
        }

        const final = { ...params } as SimulationParameters;
        Object.keys(final).forEach(key => {
            const k = key as keyof SimulationParameters;
            if (['Packet Delivery Ratio', 'Energy Efficiency', 'Scalability Index', 'Robustness Index'].includes(k)) {
                final[k] = parseFloat(Math.max(0.1, Math.min(0.99, final[k])).toPrecision(3));
            } else if (k === 'Computational Efficiency (%)') {
                 final[k] = Math.max(50, Math.min(99, Math.round(final[k])));
            } else {
                final[k] = parseFloat(Math.max(0, final[k]).toPrecision(3));
            }
        });
        
        final['Network Lifetime (hours)'] = Math.round(params['Network Lifetime (hours)']!);
        final['Sustained Operations (cycles)'] = Math.round(params['Sustained Operations (cycles)']!);
        final['Energy Consumption (J)'] = Math.round(params['Energy Consumption (J)']!);
        final['End-to-end Delay (ms)'] = Math.round(params['End-to-end Delay (ms)']!);
        
        return final;
    };
    
    return {
      'AI-Based': finalizeParams(aiBased),
      'Traditional': finalizeParams(traditional),
    };
  }
}

export const networkAnalysisService = new NetworkAnalysisService();