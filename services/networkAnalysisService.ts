
import { Node, Connection, SimulationParameters, NetworkComponentType } from '../types';

type PerformanceState = 'before' | 'after';

const scalabilityMap: { [key: string]: number } = {
  'Low': 0.6,
  'Medium': 0.75,
  'Medium-High': 0.85,
  'High': 0.95,
};

const performanceData: { [key: number]: { [key in PerformanceState]: any } } = {
  2: { // Manually crafted for a small, efficient network
    before: { 'Packet Delivery Ratio': 0.98, 'End-to-End Delay (ms)': 20, 'Energy Consumption (J)': 10, 'Network Lifetime (hours)': 100, 'Scalability': 'Low', 'Computational Efficiency (%)': 98, 'Energy Efficiency': 0.98, 'Robustness Index': 0.95, 'Throughput (Mbps)': 15 },
    after: { 'Packet Delivery Ratio': 0.99, 'End-to-End Delay (ms)': 15, 'Energy Consumption (J)': 8, 'Network Lifetime (hours)': 110, 'Scalability': 'Low', 'Computational Efficiency (%)': 99, 'Energy Efficiency': 0.99, 'Robustness Index': 0.98, 'Throughput (Mbps)': 18 }
  },
  50: {
    before: { 'Packet Delivery Ratio': 0.92, 'End-to-End Delay (ms)': 60, 'Energy Consumption (J)': 55, 'Network Lifetime (hours)': 68, 'Scalability': 'Low', 'Computational Efficiency (%)': 90, 'Energy Efficiency': 0.92, 'Robustness Index': 0.85, 'Throughput (Mbps)': 7 },
    after: { 'Packet Delivery Ratio': 0.96, 'End-to-End Delay (ms)': 55, 'Energy Consumption (J)': 50, 'Network Lifetime (hours)': 70, 'Scalability': 'Medium', 'Computational Efficiency (%)': 94, 'Energy Efficiency': 0.96, 'Robustness Index': 0.90, 'Throughput (Mbps)': 8 }
  },
  150: {
    before: { 'Packet Delivery Ratio': 0.88, 'End-to-End Delay (ms)': 95, 'Energy Consumption (J)': 240, 'Network Lifetime (hours)': 52, 'Scalability': 'Medium', 'Computational Efficiency (%)': 85, 'Energy Efficiency': 0.88, 'Robustness Index': 0.78, 'Throughput (Mbps)': 7.5 },
    after: { 'Packet Delivery Ratio': 0.93, 'End-to-End Delay (ms)': 80, 'Energy Consumption (J)': 210, 'Network Lifetime (hours)': 58, 'Scalability': 'High', 'Computational Efficiency (%)': 90, 'Energy Efficiency': 0.93, 'Robustness Index': 0.85, 'Throughput (Mbps)': 9 }
  },
  250: {
    before: { 'Packet Delivery Ratio': 0.85, 'End-to-End Delay (ms)': 120, 'Energy Consumption (J)': 480, 'Network Lifetime (hours)': 46, 'Scalability': 'Medium', 'Computational Efficiency (%)': 83, 'Energy Efficiency': 0.85, 'Robustness Index': 0.75, 'Throughput (Mbps)': 8 },
    after: { 'Packet Delivery Ratio': 0.91, 'End-to-End Delay (ms)': 95, 'Energy Consumption (J)': 420, 'Network Lifetime (hours)': 53, 'Scalability': 'High', 'Computational Efficiency (%)': 89, 'Energy Efficiency': 0.91, 'Robustness Index': 0.83, 'Throughput (Mbps)': 9.5 }
  },
  350: {
    before: { 'Packet Delivery Ratio': 0.82, 'End-to-End Delay (ms)': 150, 'Energy Consumption (J)': 720, 'Network Lifetime (hours)': 42, 'Scalability': 'Medium-High', 'Computational Efficiency (%)': 80, 'Energy Efficiency': 0.82, 'Robustness Index': 0.70, 'Throughput (Mbps)': 7.5 },
    after: { 'Packet Delivery Ratio': 0.88, 'End-to-End Delay (ms)': 120, 'Energy Consumption (J)': 650, 'Network Lifetime (hours)': 50, 'Scalability': 'High', 'Computational Efficiency (%)': 87, 'Energy Efficiency': 0.88, 'Robustness Index': 0.80, 'Throughput (Mbps)': 9 }
  },
  500: {
    before: { 'Packet Delivery Ratio': 0.80, 'End-to-End Delay (ms)': 180, 'Energy Consumption (J)': 1100, 'Network Lifetime (hours)': 36, 'Scalability': 'Medium', 'Computational Efficiency (%)': 75, 'Energy Efficiency': 0.80, 'Robustness Index': 0.65, 'Throughput (Mbps)': 9 },
    after: { 'Packet Delivery Ratio': 0.87, 'End-to-End Delay (ms)': 140, 'Energy Consumption (J)': 950, 'Network Lifetime (hours)': 45, 'Scalability': 'High', 'Computational Efficiency (%)': 85, 'Energy Efficiency': 0.87, 'Robustness Index': 0.78, 'Throughput (Mbps)': 11 }
  }
};

const dataPoints = Object.keys(performanceData).map(Number).sort((a, b) => a - b);
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

    // --- 1. Check for Cluster topology based on explicit cluster heads ---
    if (clusterHeadIds.length > 0) {
        const clusterHeads = nodes.filter(n => clusterHeadIds.includes(n.id));
        if (clusterHeads.length > 0) {
            // Check if non-head nodes are primarily connected to heads
            const endNodes = nodes.filter(n => !clusterHeadIds.includes(n.id) && n.type !== NetworkComponentType.BASE_STATION);
            let clusterConnections = 0;
            endNodes.forEach(en => {
                const neighbors = adjacency[en.id] || [];
                if (neighbors.some(neighborId => clusterHeadIds.includes(neighborId))) {
                    clusterConnections++;
                }
            });

            // If a significant number of end nodes connect to heads, it's a cluster.
            if (endNodes.length > 0 && clusterConnections / endNodes.length > 0.5) {
                // Check for mesh-like connections within clusters or between heads
                const avgHeadDegree = clusterHeads.reduce((sum, h) => sum + (nodeDegrees.get(h.id) || 0), 0) / clusterHeads.length;
                if (avgHeadDegree > clusterHeads.length) { // A heuristic
                     return 'Cluster Mesh Topology';
                }
                return 'Cluster Topology';
            }
        }
    }
    
    // --- 2. Check for strict, degree-based topologies ---
    const degrees = Array.from(nodeDegrees.values());
    const centralNode = nodes.find(n => (nodeDegrees.get(n.id) || 0) >= nodeCount - 2);
    // Star: one central node connected to almost all others
    if (centralNode && (centralNode.type === NetworkComponentType.BASE_STATION || centralNode.type === NetworkComponentType.SWITCH)) {
        return 'Star Topology';
    }

    // Ring: all nodes have degree 2
    if (degrees.every(d => d === 2)) {
        return 'Ring Topology';
    }

    // Bus: two nodes with degree 1, rest with degree 2
    const degreeOneCount = degrees.filter(d => d === 1).length;
    const degreeTwoCount = degrees.filter(d => d === 2).length;
    if (degreeOneCount === 2 && degreeTwoCount === nodeCount - 2) {
        return 'Bus Topology';
    }
    
    // --- 3. Differentiate between Mesh and other topologies ---
    const avgDegree = degrees.reduce((a, b) => a + b, 0) / nodeCount;
    const components = this.findNetworkComponents(nodes, connections);

    // Mesh: highly connected, robust (often one single component)
    if (components.length <= 2 && avgDegree > 2.5) { // Allow for a single isolated node
        // Check for grid-like spatial distribution
        const nodePositions = nodes.map(n => ({x: n.x, y: n.y}));
        const xCoords = [...new Set(nodePositions.map(p => p.x))].sort((a,b) => a - b);
        const yCoords = [...new Set(nodePositions.map(p => p.y))].sort((a,b) => a - b);
        
        // A simple heuristic for grid: if nodes align well on X/Y coordinates
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

    // --- 4. Fallback for everything else ---
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

  public simulatePerformance(
    topology: string,
    nodes: Node[],
    connections: Connection[],
    maliciousNodeIds: string[] = [],
    state: PerformanceState = 'before'
  ): { 'AI-Based': SimulationParameters; 'Traditional': SimulationParameters } {
    const nodeCount = nodes.length;
    const aiBased = {} as SimulationParameters;
    
    if (nodeCount < 2) {
        const emptyParams: SimulationParameters = {
            'Packet Delivery Ratio': 0, 'End-to-end Delay (ms)': 0, 'Energy Consumption (J)': 0,
            'Network Lifetime (hours)': 0, 'Sustained Operations (cycles)': 0, 'Scalability Index': 0,
            'Computational Efficiency (%)': 0, 'Energy Efficiency': 0, 'Robustness Index': 0, 'Throughput (Mbps)': 0,
        };
        return { 'AI-Based': emptyParams, 'Traditional': emptyParams };
    }
    
    let lowerBound = dataPoints[0];
    let upperBound = dataPoints[dataPoints.length - 1];

    for (let i = 0; i < dataPoints.length - 1; i++) {
        if (nodeCount >= dataPoints[i] && nodeCount <= dataPoints[i + 1]) {
            lowerBound = dataPoints[i];
            upperBound = dataPoints[i + 1];
            break;
        }
    }
    if (nodeCount > dataPoints[dataPoints.length - 1]) {
        lowerBound = dataPoints[dataPoints.length - 2];
        upperBound = dataPoints[dataPoints.length - 1];
    }
    
    const lowerData = performanceData[lowerBound][state];
    const upperData = performanceData[upperBound][state];

    const progress = (nodeCount - lowerBound) / (upperBound - lowerBound);

    const interpolate = (key: string) => {
        let lowerVal = lowerData[key];
        let upperVal = upperData[key];

        if (key === 'Scalability') {
            lowerVal = scalabilityMap[lowerVal] || 0;
            upperVal = scalabilityMap[upperVal] || 0;
        }
        
        return lowerVal + (upperVal - lowerVal) * progress;
    };

    aiBased['Packet Delivery Ratio'] = interpolate('Packet Delivery Ratio');
    aiBased['End-to-end Delay (ms)'] = interpolate('End-to-End Delay (ms)');
    aiBased['Energy Consumption (J)'] = interpolate('Energy Consumption (J)');
    aiBased['Network Lifetime (hours)'] = interpolate('Network Lifetime (hours)');
    aiBased['Scalability Index'] = interpolate('Scalability');
    aiBased['Computational Efficiency (%)'] = interpolate('Computational Efficiency (%)');
    aiBased['Energy Efficiency'] = interpolate('Energy Efficiency');
    aiBased['Robustness Index'] = interpolate('Robustness Index');
    aiBased['Throughput (Mbps)'] = interpolate('Throughput (Mbps)');

    // Calculate Sustained Operations
    const endNodesCount = nodes.filter(n => n.type === NetworkComponentType.NODE).length || 1;
    const totalNetworkEnergy = endNodesCount * AVERAGE_NODE_ENERGY_JOULES;
    
    aiBased['Sustained Operations (cycles)'] = aiBased['Energy Consumption (J)'] > 0
        ? totalNetworkEnergy / aiBased['Energy Consumption (J)']
        : Infinity;

    const traditional = { ...aiBased };
    traditional['Packet Delivery Ratio'] *= 0.92;
    traditional['End-to-end Delay (ms)'] *= 1.25;
    traditional['Energy Consumption (J)'] *= 1.18;
    traditional['Network Lifetime (hours)'] *= 0.85;
    traditional['Scalability Index'] *= 0.9;
    traditional['Computational Efficiency (%)'] *= 0.95;
    traditional['Energy Efficiency'] *= 0.93;
    traditional['Robustness Index'] *= 0.88;
    traditional['Throughput (Mbps)'] *= 0.8;
    traditional['Sustained Operations (cycles)'] = traditional['Energy Consumption (J)'] > 0
        ? totalNetworkEnergy / traditional['Energy Consumption (J)']
        : Infinity;


    // Apply malicious node penalties, primarily to traditional protocol
    if (maliciousNodeIds.length > 0) {
        const attackSeverity = 1 + maliciousNodeIds.length / nodes.length * 5;
        traditional['Packet Delivery Ratio'] *= (0.3 / attackSeverity);
        traditional['End-to-end Delay (ms)'] *= (1.5 * attackSeverity);
        traditional['Robustness Index'] *= 0.2;
        traditional['Network Lifetime (hours)'] *= 0.5;
        traditional['Sustained Operations (cycles)'] *= 0.4;
        traditional['Throughput (Mbps)'] *= (0.1 / attackSeverity);
        // AI model is resilient, but still takes a small hit
        aiBased['Robustness Index'] = Math.min(0.99, aiBased['Robustness Index'] * 0.95);
        aiBased['Packet Delivery Ratio'] *= 0.98;
    }
    
    // Final cleanup: Clamp percentage-based values and round numbers
    Object.keys(aiBased).forEach(key => {
        const paramKey = key as keyof SimulationParameters;
        
        if (['Packet Delivery Ratio', 'Energy Efficiency', 'Scalability Index', 'Robustness Index'].includes(key)) {
            aiBased[paramKey] = Math.max(0.40, Math.min(0.99, aiBased[paramKey]));
            const tradUpperCap = Math.min(0.95, aiBased[paramKey] - 0.05);
            traditional[paramKey] = Math.max(0.35, Math.min(tradUpperCap, traditional[paramKey]));
        } else {
             aiBased[paramKey] = Math.round(aiBased[paramKey]);
             traditional[paramKey] = Math.round(traditional[paramKey]);
        }
    });

    return {
      'AI-Based': aiBased,
      'Traditional': traditional,
    };
  }
}

export const networkAnalysisService = new NetworkAnalysisService();