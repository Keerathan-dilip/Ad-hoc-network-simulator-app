import { Node, Connection, SimulationParameters, NetworkComponentType, NetworkTopology } from '../types';

type PerformanceState = 'before' | 'after';

const NODE_MAX_ENERGY = 1000; // Joules
const AVG_CYCLE_ENERGY_COST = 50; // Joules per abstract "cycle"

// --- Data structure from user's table ---
interface PerformanceSet {
  pdr: number;
  delay: number;
  energyConsumption: number;
  networkLifetime: number;
  compEfficiency: number; 
  robustness: number;
  throughput: number;
  responsiveness: number;
  energyConservation: number;
  scalabilityIndex: number;
  adaptabilityRate: number;
  energyEfficiency: number;
}

interface PerformanceTier {
  range: [number, number];
  before: PerformanceSet; // Maps to "Traditional"
  after: PerformanceSet;  // Maps to "AI-Based"
}

// Data derived from the user-provided performance table
const performanceTiers: PerformanceTier[] = [
    {
        range: [1, 50],
        before: { 
            pdr: 0.92, delay: 60, energyConsumption: 55, networkLifetime: 68, 
            compEfficiency: 90, robustness: 0.85, throughput: 7, energyEfficiency: 0.92,
            // Copied from previous stable version
            responsiveness: 1.7, energyConservation: 0.165, scalabilityIndex: 0.82, adaptabilityRate: 0.68 
        },
        after:  { 
            pdr: 0.96, delay: 55, energyConsumption: 50, networkLifetime: 70, 
            compEfficiency: 94, robustness: 0.90, throughput: 8, energyEfficiency: 0.96,
            responsiveness: 3.4, energyConservation: 0.22, scalabilityIndex: 0.88, adaptabilityRate: 0.90 
        }
    },
    {
        range: [50, 150],
        before: { 
            pdr: 0.88, delay: 95, energyConsumption: 240, networkLifetime: 52, 
            compEfficiency: 85, robustness: 0.78, throughput: 7.5, energyEfficiency: 0.88,
            responsiveness: 1.6, energyConservation: 0.15, scalabilityIndex: 0.78, adaptabilityRate: 0.64 
        },
        after:  { 
            pdr: 0.93, delay: 80, energyConsumption: 210, networkLifetime: 58, 
            compEfficiency: 90, robustness: 0.85, throughput: 9, energyEfficiency: 0.93,
            responsiveness: 3.3, energyConservation: 0.21, scalabilityIndex: 0.85, adaptabilityRate: 0.88 
        }
    },
    {
        range: [150, 250],
        before: { 
            pdr: 0.85, delay: 120, energyConsumption: 480, networkLifetime: 46, 
            compEfficiency: 83, robustness: 0.75, throughput: 8, energyEfficiency: 0.85,
            responsiveness: 1.5, energyConservation: 0.14, scalabilityIndex: 0.75, adaptabilityRate: 0.62 
        },
        after:  { 
            pdr: 0.91, delay: 95, energyConsumption: 420, networkLifetime: 53, 
            compEfficiency: 89, robustness: 0.83, throughput: 9.5, energyEfficiency: 0.91,
            responsiveness: 3.2, energyConservation: 0.20, scalabilityIndex: 0.83, adaptabilityRate: 0.85 
        }
    },
    {
        range: [250, 350],
        before: { 
            pdr: 0.82, delay: 150, energyConsumption: 720, networkLifetime: 42, 
            compEfficiency: 80, robustness: 0.70, throughput: 7.5, energyEfficiency: 0.82,
            responsiveness: 1.4, energyConservation: 0.13, scalabilityIndex: 0.70, adaptabilityRate: 0.60 
        },
        after:  { 
            pdr: 0.88, delay: 120, energyConsumption: 650, networkLifetime: 50, 
            compEfficiency: 87, robustness: 0.80, throughput: 9, energyEfficiency: 0.88,
            responsiveness: 3.1, energyConservation: 0.19, scalabilityIndex: 0.80, adaptabilityRate: 0.82 
        }
    },
    {
        range: [350, 451], // Max nodes is 450
        before: { 
            pdr: 0.80, delay: 180, energyConsumption: 1100, networkLifetime: 36, 
            compEfficiency: 75, robustness: 0.65, throughput: 9, energyEfficiency: 0.80,
            responsiveness: 1.3, energyConservation: 0.12, scalabilityIndex: 0.65, adaptabilityRate: 0.58 
        },
        after:  { 
            pdr: 0.87, delay: 140, energyConsumption: 950, networkLifetime: 45, 
            compEfficiency: 85, robustness: 0.78, throughput: 11, energyEfficiency: 0.87,
            responsiveness: 3.0, energyConservation: 0.18, scalabilityIndex: 0.78, adaptabilityRate: 0.80 
        }
    }
];

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

    // --- 1. Check for explicit Cluster topology FIRST ---
    // If the network was generated with cluster heads, it is a Cluster topology, even if meshed internally.
    if (clusterHeadIds.length > 0) {
        return 'Cluster Topology';
    }

    // --- 2. Priority check for high-connectivity topologies (Mesh/Grid) ---
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

  public getBridgingText(currentParam: keyof SimulationParameters, nextParam: keyof SimulationParameters): string {
      const transitions: Record<string, string> = {
          'Packet Delivery Ratio': `While PDR focuses on reliability, the following section on ${nextParam.split('(')[0].trim()} will explore the network's data handling capacity.`,
          'Throughput (Mbps)': `High throughput is essential, but it's equally important to consider the speed of individual packet delivery. The next section on ${nextParam.split('(')[0].trim()} examines this latency.`,
          'End-to-end Delay (ms)': `Minimizing delay is crucial, but not at the expense of battery life. The analysis now shifts to ${nextParam.split('(')[0].trim()}, a key factor for network longevity.`,
          'Energy Consumption (J)': `Efficient energy use directly impacts the network's operational lifespan. The following section on ${nextParam.split('(')[0].trim()} quantifies this duration.`,
          'Network Lifetime (hours)': `A long network lifetime is supported by resilience to failures. The report now turns to the ${nextParam.split('(')[0].trim()}, which measures the network's ability to withstand disruptions.`,
          'Robustness Index': `This concludes the primary performance metrics.`,
      };
      return transitions[currentParam] || '';
  }

  public getParameterInfoText(parameter: keyof SimulationParameters) {
        const makeBreakdown = (isEnhanced: boolean, param: keyof SimulationParameters) => {
            const common = {
                pdr: {
                    title: isEnhanced ? "Enhanced AI Algorithm Logic (Reinforcement Learning)" : "Traditional Algorithm Logic (e.g., AODV)",
                    description: isEnhanced
                        ? "The AI model learns the most reliable routes by rewarding successful packet deliveries. It uses a Q-learning approach to assign a 'quality' value to routing decisions, prioritizing paths with a higher historical success rate and stability."
                        : "Traditional protocols like AODV (Ad-hoc On-demand Distance Vector) select the shortest path based on hop count. This path might not be the most stable, leading to packet loss if a link breaks.",
                    formula: isEnhanced ? "Q(s,a) \u2190 Q(s,a) + \u03B1[R + \u03B3 * max Q(s',a') - Q(s,a)]" : "PDR = (Total Packets Received / Total Packets Sent)",
                    headers: isEnhanced ? ['Component', 'Description'] : ['Step', 'Action', 'Example'],
                    data: isEnhanced
                        ? [["Q(s,a)", "The 'Quality' of forwarding a packet from node 's' to neighbor 'a'."], ['R (Reward)', 'A positive reward (+1) is given for acknowledged deliveries, incentivizing reliable paths.'], ['\u03B3 (Discount)', 'Balances immediate vs. future rewards, promoting long-term stability.']]
                        : [["1. Route Discovery", "Source node broadcasts a Route Request (RREQ) packet.", "Node 1 sends RREQ for Node 10."], ["2. Path Selection", "Destination replies along the first-arrived RREQ's path (shortest hops).", "Node 10 replies via path 1-4-7-10."], ["3. Data Transmission", "Packets are sent along the established route.", "Data flows from 1 to 10."], ["4. Link Failure", "If a link breaks (e.g., 4-7), packets are dropped until a new route is found.", "Packets lost until a new path is discovered."]]
                },
                throughput: {
                    title: isEnhanced ? "Enhanced AI Algorithm Logic (Congestion-Aware Routing)" : "Traditional Algorithm Logic (e.g., DSR)",
                    description: isEnhanced
                        ? "The AI model optimizes for throughput by learning which routes have higher available bandwidth and lower congestion. The reward function is proportional to the data rate achieved on a path."
                        : "Traditional methods like DSR (Dynamic Source Routing) do not actively manage for bandwidth. This can lead to congestion on shortest paths, lowering the overall data rate.",
                    formula: isEnhanced ? "Reward = k * (Achieved Bandwidth / Path Latency)" : "Throughput = (Total Data Received in bits) / Time",
                    headers: ['Step', 'Action', 'Example'],
                    data: isEnhanced
                        ? [["1. Monitor Links", "The AI continuously estimates the available bandwidth and queuing delay on neighboring links.", "Node 3 observes high traffic to Node 5."], ["2. Adjust Q-Values", "The Q-learning model lowers the 'quality' score for congested links.", "Q(3,5) is reduced due to low throughput potential."], ["3. Select High-Capacity Path", "The AI selects a slightly longer but less congested path to maximize data flow.", "Routes through 3-6-8 instead of 3-5-8."], ["4. Load Balancing", "Traffic is naturally distributed across multiple efficient paths, preventing bottlenecks.", "Data is shared between two viable routes."]]
                        : [["1. Route Discovery", "Source includes the entire path in the packet header as it discovers it.", "Packet from 1 to 10 has header [1,4,7,10]."], ["2. Transmission", "All packets follow this exact, pre-determined path.", "All traffic from 1 to 10 uses this route."], ["3. Congestion", "If Node 4 is busy, packets queue up, increasing delay and potentially causing drops.", "A bottleneck forms at Node 4."], ["4. No Adaptation", "The protocol does not seek alternative routes unless the primary one completely fails.", "Throughput drops significantly."]]
                },
                 delay: {
                    title: isEnhanced ? "Enhanced AI Algorithm Logic (Predictive Latency Optimization)" : "Traditional Algorithm Logic (Hop-Count Focus)",
                    description: isEnhanced 
                        ? "The AI model minimizes delay by learning to avoid nodes with high queuing delays and links with low signal quality. The reward function penalizes longer transit times."
                        : "Choosing the shortest path in hops can lead to significant queuing delays at busy 'crossroad' nodes, increasing the overall end-to-end transit time.",
                    formula: isEnhanced ? "Cost(Path) = \u03A3 (TransmissionDelay + PropagationDelay + QueuingDelay)" : "Avg. Delay = \u03A3 (Packet Rx Time - Tx Time) / Total Packets Received",
                    headers: ['Step', 'Action', 'Example'],
                     data: isEnhanced
                        ? [["1. Real-time Monitoring", "Each node measures packet acknowledgment times and queue lengths.", "Node 5 notes that packets via neighbor 7 take 50ms."], ["2. Cost Calculation", "The AI assigns a 'cost' to each potential link based on this real-time latency.", "The link 5->7 is assigned a higher cost."], ["3. Optimal Path Selection", "The AI chooses the path with the lowest cumulative latency cost, even if it has more hops.", "It prefers path 5-9-10 (60ms) over 5-7-10 (80ms)."], ["4. Proactive Rerouting", "If latency on a path starts to increase, the AI seamlessly shifts traffic to a better route.", "Traffic is moved before the link becomes unusable."]]
                        : [["1. Find Shortest Path", "The protocol identifies the route with the fewest intermediate nodes.", "Path 1-5-10 (2 hops) is chosen."], ["2. Send Packets", "Data is sent along the 2-hop path.", "Packets arrive at Node 5."], ["3. Queuing Delay", "Node 5 is a central hub and is processing packets from 4 other nodes. New packets must wait in a queue.", "Packets from Node 1 wait for 40ms."], ["4. Higher Total Delay", "The waiting time at the congested node leads to a higher overall delay than a longer, clearer path.", "Total delay becomes 55ms."]]
                },
                 energy: {
                     title: isEnhanced ? "Enhanced AI Algorithm Logic (Energy-Aware Reinforcement Learning)" : "Traditional Algorithm Logic (Energy-Agnostic)",
                    description: isEnhanced 
                        ? "The AI model is explicitly trained to conserve energy. The reward function penalizes routes that use nodes with low battery or require high transmission power, extending network lifetime."
                        : "Traditional protocols are generally not energy-aware. Their focus on shortest paths can overuse central nodes, depleting their batteries quickly and causing the network to fragment.",
                    formula: isEnhanced ? "Reward = k * (1 / EnergyCost) + (RemainingBattery%)" : "Total Consumption = \u03A3 (Energy Spent by each node)",
                    headers: ['Step', 'Action', 'Example'],
                    data: isEnhanced
                        ? [["1. Energy State Sharing", "Nodes periodically share their remaining battery levels with neighbors.", "Node 6 reports 35% battery."], ["2. Cost-Based Routing", "The AI's Q-learning model incorporates energy as a primary cost factor for route selection.", "The Q-value for using Node 6 is heavily penalized."], ["3. Bypass Weak Nodes", "The AI selects a path that avoids the low-battery node, even if it's slightly longer.", "Path routes through 5-8-10 instead of 5-6-10."], ["4. Balanced Load", "This strategy distributes the load, preventing any single node from draining too quickly and extending the entire network's life.", "All nodes deplete energy at a more uniform rate."]]
                        : [["1. Find Shortest Path", "The protocol finds the route with the fewest hops, regardless of node energy.", "Path 1-6-10 is chosen."], ["2. Overuse Central Node", "Node 6 is a central point for many shortest paths and handles a disproportionate amount of traffic.", "Node 6 processes traffic for 5 different routes."], ["3. Node Failure", "Node 6's battery is rapidly depleted, and it shuts down.", "Node 6 dies, breaking 5 routes."], ["4. Network Partition", "The failure of the critical node splits the network into disconnected segments.", "Nodes 1-5 can no longer reach nodes 7-10."]]
                },
                 lifetime: {
                     title: isEnhanced ? "Enhanced AI Algorithm Logic (Lifetime-Maximization Policy)" : "Traditional Algorithm Logic (Unmanaged Depletion)",
                    description: isEnhanced 
                        ? "The AI's core policy is to maximize the time until the *first* critical node fails. It achieves this by intelligently balancing traffic load based on node energy levels, ensuring no single node is depleted prematurely."
                        : "In traditional routing, there is no concept of lifetime management. Critical nodes on the shortest paths are overused until they fail, leading to a much shorter operational lifespan for the network as a whole.",
                    formula: isEnhanced ? "Maximize(T) such that E_i(T) > E_threshold for all i" : "Lifetime \u2248 min(InitialEnergy_i / ConsumptionRate_i)",
                    headers: ['Step', 'Action', 'Example'],
                    data: isEnhanced
                        ? [["1. Identify Critical Nodes", "The AI identifies nodes whose failure would have the largest impact on network connectivity.", "Node 6 is identified as a critical bridge node."], ["2. Set Energy Thresholds", "The AI avoids using nodes that are approaching a critical energy level (e.g., < 25%).", "Traffic is diverted away from Node 6."], ["3. Distribute Load", "Traffic is routed through alternative, less-critical paths to allow the weak node to conserve power.", "A 3-hop path is used to spare the 2-hop path's critical node."], ["4. Uniform Energy Drain", "This results in a slower, more balanced energy drain across the network, significantly extending its functional lifetime.", "The first node failure is delayed by hours or days."]]
                        : [["1. Find Shortest Path", "The protocol repeatedly uses the most central node because it's on most short paths.", "Node 6 is used for most routes."], ["2. Rapid Energy Depletion", "The central node's energy depletes much faster than peripheral nodes.", "Node 6's battery drops by 50% while others drop by 5%."], ["3. First Node Failure", "The overworked node is the first to fail, often catastrophically for the network.", "Node 6 dies, partitioning the network."], ["4. Short Lifetime", "The network's lifetime is dictated by its weakest, most overused link.", "The network is considered non-functional after only 20 hours."]]
                },
                robustness: {
                     title: isEnhanced ? "Enhanced AI Algorithm Logic (Proactive Rerouting)" : "Traditional Algorithm Logic (Reactive Rerouting)",
                     description: isEnhanced 
                        ? "The AI model improves robustness by monitoring link quality (e.g., signal strength, packet loss rate) in real-time. It can predict link failures before they happen and proactively reroute traffic with no packet loss."
                        : "Traditional protocols are reactive. They only begin searching for a new path *after* a link has already failed, resulting in packet loss and significant recovery time (route convergence delay).",
                     formula: isEnhanced ? "P(LinkFailure) = f(SignalStrength, Jitter, LossRate)" : "Robustness = 1 - (Impact of Failure / Network Size)",
                    headers: ['Step', 'Action', 'Example'],
                     data: isEnhanced
                        ? [["1. Monitor Link Quality", "Nodes constantly assess the quality of their connections to neighbors.", "Node 2 notices the signal from Node 5 is weakening."], ["2. Predict Failure", "The AI model predicts a high probability of link failure based on the degrading metrics.", "Predicts link 2-5 will fail within 60 seconds."], ["3. Find Alternate Route", "The AI pre-calculates and establishes a stable alternative route.", "A new path through 2-4-5 is prepared."], ["4. Seamless Switchover", "Traffic is rerouted to the new path *before* the original link fails, preventing any packet loss.", "Data flow is uninterrupted."]]
                        : [["1. Use Stable Link", "The protocol sends data along a functioning path.", "Data flows through 2-5-8."], ["2. Link Fails Suddenly", "A node moves or interference occurs, and the 2-5 link breaks.", "Link fails without warning."], ["3. Detect Failure & Drop Packets", "Node 2 detects the broken link and sends a Route Error (RERR). All packets in transit are lost.", "Packets are dropped."], ["4. Re-discover Route", "A new route discovery process is initiated from scratch, causing significant delay.", "The network is unstable for several seconds."]]
                },
                 scalability: {
                     title: isEnhanced ? "Enhanced AI Algorithm Logic (Hierarchical & Adaptive Routing)" : "Traditional Algorithm Logic (Flat Routing)",
                     description: isEnhanced
                        ? "The AI leverages hierarchical routing (similar to ZRP or LEACH) in large networks. It forms clusters to reduce routing overhead, only managing detailed routes locally while using a more efficient inter-cluster routing for long distances. This significantly improves performance as node count grows."
                        : "Flat routing protocols like AODV or DSR require every node to participate in route discovery. As the network grows, the number of control packets (RREQs) can flood the network, consuming bandwidth and reducing efficiency.",
                     formula: isEnhanced ? "Overhead = O(log N) for Inter-Cluster" : "Overhead = O(N) for Global Discovery",
                    headers: ['Step', 'Action', 'Example'],
                     data: isEnhanced
                        ? [["1. Cluster Formation", "AI dynamically groups nodes into clusters with elected cluster heads.", "Nodes 1-10 form a cluster with Node 5 as head."], ["2. Intra-Cluster Routing", "Nodes use a proactive protocol to maintain routes within their own cluster.", "Node 1 knows the path to Node 8 via Node 5 instantly."], ["3. Inter-Cluster Routing", "To reach a distant node, a packet is sent to its cluster head, which then communicates with other heads.", "Packet from Node 1 to Node 50 goes 1->5, then 5->45, then 45->50."], ["4. Reduced Overhead", "Route discovery is localized, preventing network-wide floods and maintaining performance in large networks.", "Only cluster heads manage long-distance routing information."]]
                        : [["1. Global Route Request", "To find any node, the source broadcasts a RREQ to all its neighbors.", "Node 1 broadcasts a RREQ for Node 200."], ["2. Network-Wide Flood", "Every node that receives the RREQ rebroadcasts it, creating a flood of control packets.", "The RREQ propagates across all 200+ nodes."], ["3. High Overhead", "This process consumes significant bandwidth and processing power on every node.", "Network performance degrades due to control traffic."], ["4. Slow Discovery", "In large networks, this discovery process can be very slow, increasing latency.", "It takes a long time to establish a route."]]
                },
            };
            
            const paramKey = String(parameter).split('(')[0].trim().toLowerCase().replace(/\s+/g, '');
            if (paramKey.includes('packetdelivery')) return { traditional: common.pdr, enhanced: common.pdr };
            if (paramKey.includes('throughput')) return { traditional: common.throughput, enhanced: common.throughput };
            if (paramKey.includes('delay')) return { traditional: common.delay, enhanced: common.delay };
            if (paramKey.includes('energyconsumption')) return { traditional: common.energy, enhanced: common.energy };
            if (paramKey.includes('networklifetime')) return { traditional: common.lifetime, enhanced: common.lifetime };
            if (paramKey.includes('robustness')) return { traditional: common.robustness, enhanced: common.robustness };
            if (paramKey.includes('scalability')) return { traditional: common.scalability, enhanced: common.scalability };
            
            return null;
        };

        const breakdown = makeBreakdown(false, parameter);
        if (!breakdown) return null;
        
        return {
            traditional: makeBreakdown(false, parameter)?.traditional,
            enhanced: makeBreakdown(true, parameter)?.enhanced
        };
    }

  public simulatePerformance(
    topology: string,
    nodes: Node[],
    connections: Connection[],
    maliciousNodeIds: string[] = [],
    state: PerformanceState = 'before'
  ): { 'AI-Based': SimulationParameters; 'Traditional': SimulationParameters } {
    const nodeCount = nodes.length;

    const emptyParams: SimulationParameters = {
        'Packet Delivery Ratio': 0, 'End-to-end Delay (ms)': 0, 'Energy Consumption (J)': 0,
        'Network Lifetime (hours)': 0, 'Computational Efficiency (ops/J)': 0, 'Energy Efficiency': 0, 
        'Robustness Index': 0, 'Throughput (Mbps)': 0, 'Responsiveness': 0, 
        'Energy Conservation': 0, 'Adaptability Rate': 0, 'Scalability Index': 0, 'Network Cycles': 0,
    };
    if (nodeCount === 0) {
        return { 'AI-Based': emptyParams, 'Traditional': emptyParams };
    }
    
    const tier = performanceTiers.find(t => nodeCount >= t.range[0] && nodeCount < t.range[1]) || performanceTiers[performanceTiers.length - 1];
    
    const tradDataRaw = tier.before;
    const aiDataRaw = tier.after;
    
    const aiBased: SimulationParameters = {
        'Packet Delivery Ratio': aiDataRaw.pdr,
        'End-to-end Delay (ms)': aiDataRaw.delay,
        'Energy Consumption (J)': aiDataRaw.energyConsumption,
        'Network Lifetime (hours)': aiDataRaw.networkLifetime,
        'Computational Efficiency (ops/J)': aiDataRaw.compEfficiency,
        'Energy Efficiency': aiDataRaw.energyEfficiency,
        'Robustness Index': aiDataRaw.robustness,
        'Throughput (Mbps)': aiDataRaw.throughput,
        'Responsiveness': aiDataRaw.responsiveness,
        'Energy Conservation': aiDataRaw.energyConservation,
        'Adaptability Rate': aiDataRaw.adaptabilityRate,
        'Scalability Index': aiDataRaw.scalabilityIndex,
    };

    const traditional: SimulationParameters = {
        'Packet Delivery Ratio': tradDataRaw.pdr,
        'End-to-end Delay (ms)': tradDataRaw.delay,
        'Energy Consumption (J)': tradDataRaw.energyConsumption,
        'Network Lifetime (hours)': tradDataRaw.networkLifetime,
        'Computational Efficiency (ops/J)': tradDataRaw.compEfficiency,
        'Energy Efficiency': tradDataRaw.energyEfficiency,
        'Robustness Index': tradDataRaw.robustness,
        'Throughput (Mbps)': tradDataRaw.throughput,
        'Responsiveness': tradDataRaw.responsiveness,
        'Energy Conservation': tradDataRaw.energyConservation,
        'Adaptability Rate': tradDataRaw.adaptabilityRate,
        'Scalability Index': tradDataRaw.scalabilityIndex,
    };

    if (maliciousNodeIds.length > 0) {
        const attackSeverity = 1 + maliciousNodeIds.length / nodes.length * 2;
        traditional['Packet Delivery Ratio'] *= (0.5 / attackSeverity);
        traditional['Energy Efficiency'] *= (0.5 / attackSeverity);
        traditional['Robustness Index'] *= 0.4;
        traditional['Adaptability Rate'] *= 0.6;
        aiBased['Packet Delivery Ratio'] *= 0.98;
        aiBased['Energy Efficiency'] *= 0.98;
    }
    
    return { 'AI-Based': aiBased, 'Traditional': traditional };
  }

  public getEnvironmentalImpactText(parameter: keyof SimulationParameters, nodes: Node[]): { text: string; isCritical: boolean } {
    if (nodes.length === 0) return { text: "No nodes to analyze for environmental impact.", isCritical: false };

    const NORMAL_TEMP_THRESHOLD = 40;
    const NORMAL_HUMIDITY_THRESHOLD = 70;
    const NORMAL_INTERFERENCE_THRESHOLD = -80; // dBm, higher (less negative) is better

    const avgTemp = nodes.reduce((sum, n) => sum + (n.sensorData?.temperature || 25), 0) / nodes.length;
    const avgHumidity = nodes.reduce((sum, n) => sum + (n.sensorData?.humidity || 45), 0) / nodes.length;
    const avgInterference = nodes.reduce((sum, n) => sum + (n.sensorData?.signalInterference || -90), 0) / nodes.length;

    const isHot = avgTemp > NORMAL_TEMP_THRESHOLD;
    const isHumid = avgHumidity > NORMAL_HUMIDITY_THRESHOLD;
    const isHighInterference = avgInterference < NORMAL_INTERFERENCE_THRESHOLD;

    const conditions: string[] = [];
    if (isHot) conditions.push(`elevated temperatures (avg ${avgTemp.toFixed(1)}°C)`);
    if (isHumid) conditions.push(`high humidity (avg ${avgHumidity.toFixed(1)}%)`);
    if (isHighInterference) conditions.push(`strong signal interference (avg ${avgInterference.toFixed(0)} dBm)`);

    let impactStatement = "";
    if (conditions.length === 0) {
        impactStatement = "Current environmental conditions are within normal operational parameters. Sensor data indicates a stable environment, which should not negatively impact network performance.";
        return { text: impactStatement, isCritical: false };
    }

    const leadIn = `The network is currently operating under adverse conditions, including ${conditions.join(' and ')}. This has the following specific impacts:\n\n`;

    switch (parameter) {
        case 'Packet Delivery Ratio':
        case 'Robustness Index':
            impactStatement = "• **High Interference & Humidity:** Directly increases bit error rates by degrading signal quality. This causes more packets to become corrupted during transmission and be dropped, thus lowering PDR and overall robustness.\n• **Extreme Temperatures:** Can cause node electronics to malfunction or shut down, leading to intermittent link failures and significant packet loss.";
            break;
        case 'Throughput (Mbps)':
        case 'Responsiveness':
        case 'End-to-end Delay (ms)':
            impactStatement = "• **High Interference & Humidity:** Forces the MAC layer to perform more retransmissions for each packet. This significantly increases the time it takes for data to be successfully delivered, which directly raises latency and lowers effective throughput.\n• **High Temperatures:** Can lead to thermal throttling of processors in nodes, slowing down packet processing and increasing queuing delays.";
            break;
        case 'Energy Consumption (J)':
        case 'Energy Efficiency':
        case 'Network Lifetime (hours)':
            impactStatement = "• **High Interference & Humidity:** Increased packet loss requires constant retransmissions. Each retransmission attempt consumes significant power, draining node batteries at an accelerated rate and drastically reducing the network's operational lifetime.\n• **High Temperatures:** Nodes may need to activate cooling systems or operate less efficiently, increasing baseline power draw and further shortening their lifespan.";
            break;
        default:
            impactStatement = "• Adverse environmental conditions generally degrade network performance by increasing packet loss, forcing energy-intensive retransmissions, and potentially causing hardware instability.";
            break;
    }

    return { text: leadIn + impactStatement, isCritical: true };
  }
}

export const networkAnalysisService = new NetworkAnalysisService();