import { Node, Connection, NetworkComponentType, NetworkTopology } from '../types';
import { networkAnalysisService } from './networkAnalysisService';

class NetworkGenerationService {
    public generateNetworkLayout(
        count: number,
        topology: NetworkTopology,
        includeRouters: boolean,
        includeSwitches: boolean,
        numClusterHeads: number,
        dimensions: { width: number, height: number }
    ): { nodes: Node[], connections: Connection[], clusterHeadIds: string[] } {
        let newNodes: Node[] = [];
        let newConnections: Connection[] = [];
        let newClusterHeadIds: string[] = [];

        const padding = 80;
        const canvasWidth = dimensions.width - padding * 2;
        const canvasHeight = dimensions.height - padding * 2;
        const offsetX = padding;
        const offsetY = padding;

        const createNode = (i: number, x: number, y: number, type: NetworkComponentType = NetworkComponentType.NODE): Node => {
            const base = {
                id: `${type.toLowerCase()}-${Date.now()}-${i}`, type, x: x + offsetX, y: y + offsetY,
                ipAddress: `192.168.1.${i + 1}`, isMalicious: false,
                sensorData: {
                    temperature: 25.0, // Normal room temp
                    humidity: 45.0, // Normal humidity
                    signalInterference: -90, // Low interference
                },
            };
            switch (type) {
                case NetworkComponentType.ROUTER: return { ...base, energyEfficiency: 100, energySpent: 25, packetForwardingCapacity: 5000 };
                case NetworkComponentType.SWITCH: return { ...base, energyEfficiency: 100, energySpent: 10, portCount: 16, isEnabled: true };
                case NetworkComponentType.BASE_STATION: return { ...base, energyEfficiency: 100, energySpent: 50, isReceiver: true };
                default: return { ...base, energyEfficiency: Math.round(80 + Math.random() * 20), energySpent: Math.round(Math.random() * 10) + 5 };
            }
        };

        if (topology === 'cluster' || topology === 'cluster-mesh') {
            const actualNumClusterHeads = Math.max(1, numClusterHeads);
            if (count <= actualNumClusterHeads) {
                // Not showing alert from a service, just returning empty.
                return { nodes: [], connections: [], clusterHeadIds: [] };
            }

            const numEndNodes = count - actualNumClusterHeads;
            const clusterHubs: Node[] = [];

            const baseStation = createNode(count, canvasWidth / 2, padding / 2, NetworkComponentType.BASE_STATION);
            newNodes.push(baseStation);

            const clusterHeadType = includeRouters ? NetworkComponentType.ROUTER : NetworkComponentType.NODE;

            for (let c = 0; c < actualNumClusterHeads; c++) {
                const angle = (c / actualNumClusterHeads) * 2 * Math.PI;
                const radiusX = canvasWidth / 3;
                const radiusY = canvasHeight / 3;
                const hubX = canvasWidth / 2 + radiusX * Math.cos(angle);
                const hubY = canvasHeight / 2 + radiusY * Math.sin(angle);
                const clusterHub = createNode(numEndNodes + c, hubX, hubY, clusterHeadType);
                newNodes.push(clusterHub);
                clusterHubs.push(clusterHub);
            }
            newClusterHeadIds = clusterHubs.map(hub => hub.id);

            const allClusterNodes: Node[][] = Array.from({ length: clusterHubs.length }, () => []);
            let nodesPlaced = 0;

            for (let c = 0; c < clusterHubs.length; c++) {
                const clusterHub = clusterHubs[c];
                allClusterNodes[c].push(clusterHub);
                const clusterRadius = Math.min(canvasWidth, canvasHeight) / (clusterHubs.length * 1.8);
                const nodesInThisCluster = c === clusterHubs.length - 1 ? numEndNodes - nodesPlaced : Math.floor(numEndNodes / clusterHubs.length);

                for (let i = 0; i < nodesInThisCluster; i++) {
                    const angle = Math.random() * 2 * Math.PI;
                    const radius = Math.random() * clusterRadius;
                    const node = createNode(nodesPlaced, clusterHub.x - offsetX + Math.cos(angle) * radius, clusterHub.y - offsetY + Math.sin(angle) * radius);
                    newNodes.push(node);
                    allClusterNodes[c].push(node);
                    if (topology === 'cluster') {
                        newConnections.push({ id: `${node.id}-${clusterHub.id}-${Date.now()}`, from: node.id, to: clusterHub.id });
                    }
                    nodesPlaced++;
                }
            }

            if (topology === 'cluster-mesh') {
                const K_NEAREST_IN_CLUSTER = 3;
                allClusterNodes.forEach(cluster => {
                    if (cluster.length < 2) return;
                    cluster.forEach(sourceNode => {
                        const distances = cluster
                            .filter(n => n.id !== sourceNode.id)
                            .map(targetNode => ({ id: targetNode.id, dist: Math.hypot(sourceNode.x - targetNode.x, sourceNode.y - targetNode.y) }))
                            .sort((a, b) => a.dist - b.dist);

                        for (let k = 0; k < Math.min(K_NEAREST_IN_CLUSTER, distances.length); k++) {
                            const targetNodeId = distances[k].id;
                            const exists = newConnections.some(c => (c.from === sourceNode.id && c.to === targetNodeId) || (c.from === targetNodeId && c.to === sourceNode.id));
                            if (!exists) {
                                newConnections.push({ id: `${sourceNode.id}-${targetNodeId}-${Date.now()}`, from: sourceNode.id, to: targetNodeId });
                            }
                        }
                    });
                });
            }

            for (let i = 0; i < clusterHubs.length; i++) {
                newConnections.push({ id: `${clusterHubs[i].id}-${baseStation.id}-${Date.now()}`, from: clusterHubs[i].id, to: baseStation.id });
                for (let j = i + 1; j < clusterHubs.length; j++) {
                    newConnections.push({ id: `${clusterHubs[i].id}-${clusterHubs[j].id}-${Date.now()}`, from: clusterHubs[i].id, to: clusterHubs[j].id });
                }
            }

        } else if (topology === 'mesh') {
            const numEndNodes = count > 1 ? count - 1 : 1;
            // Create end nodes first
            for (let i = 0; i < numEndNodes; i++) {
                newNodes.push(createNode(i, Math.random() * canvasWidth, Math.random() * canvasHeight));
            }
            // Add base station if there's space
            if (count > 1) {
                const baseStation = createNode(numEndNodes, canvasWidth / 2, padding / 2, NetworkComponentType.BASE_STATION);
                newNodes.push(baseStation);
            }

            // K-Nearest Neighbor for connectivity, treating all nodes as peers
            const K_NEAREST = 3;
            newNodes.forEach(sourceNode => {
                const distances = newNodes
                    .filter(n => n.id !== sourceNode.id)
                    .map(targetNode => ({ id: targetNode.id, dist: Math.hypot(sourceNode.x - targetNode.x, sourceNode.y - targetNode.y) }))
                    .sort((a, b) => a.dist - b.dist);

                for (let k = 0; k < Math.min(K_NEAREST, distances.length); k++) {
                    const targetNodeId = distances[k].id;
                    const exists = newConnections.some(c => (c.from === sourceNode.id && c.to === targetNodeId) || (c.from === targetNodeId && c.to === sourceNode.id));
                    if (!exists) {
                        newConnections.push({ id: `${sourceNode.id}-${targetNodeId}-${Date.now()}`, from: sourceNode.id, to: targetNodeId });
                    }
                }
            });

        } else if (topology === 'random') {
            const baseStation = createNode(count, canvasWidth / 2, padding, NetworkComponentType.BASE_STATION);
            newNodes.push(baseStation);

            const numRouters = includeRouters ? Math.max(1, Math.floor(count / 25)) : 0;
            const numSwitches = includeSwitches ? Math.max(1, Math.floor(count / 30)) : 0;
            const numEndNodes = count - numRouters - numSwitches;

            for (let i = 0; i < numEndNodes; i++) newNodes.push(createNode(i, Math.random() * canvasWidth, Math.random() * (canvasHeight - padding) + padding));
            for (let i = 0; i < numRouters; i++) newNodes.push(createNode(numEndNodes + i, Math.random() * canvasWidth, Math.random() * (canvasHeight - padding) + padding, NetworkComponentType.ROUTER));
            for (let i = 0; i < numSwitches; i++) newNodes.push(createNode(numEndNodes + numRouters + i, Math.random() * canvasWidth, Math.random() * (canvasHeight - padding) + padding, NetworkComponentType.SWITCH));

            const infraNodes = newNodes.filter(n => n.type !== NetworkComponentType.NODE);
            const endNodes = newNodes.filter(n => n.type === NetworkComponentType.NODE);

            for (let i = 0; i < infraNodes.length; i++) {
                for (let j = i + 1; j < infraNodes.length; j++) {
                    newConnections.push({ id: `${infraNodes[i].id}-${infraNodes[j].id}-${Date.now()}`, from: infraNodes[i].id, to: infraNodes[j].id });
                }
            }

            endNodes.forEach(endNode => {
                if (infraNodes.length > 0) {
                    let closestInfraNode = infraNodes[0];
                    let minDistance = Infinity;
                    infraNodes.forEach(infraNode => {
                        const distance = Math.hypot(endNode.x - infraNode.x, endNode.y - infraNode.y);
                        if (distance < minDistance) {
                            minDistance = distance;
                            closestInfraNode = infraNode;
                        }
                    });
                    newConnections.push({ id: `${endNode.id}-${closestInfraNode.id}-${Date.now()}`, from: endNode.id, to: closestInfraNode.id });
                }
            });

        } else if (topology === 'grid') {
            const cols = Math.ceil(Math.sqrt(count * (canvasWidth / canvasHeight)));
            const rows = Math.ceil(count / cols);
            const xSpacing = canvasWidth / (cols - 1 || 1);
            const ySpacing = canvasHeight / (rows - 1 || 1);

            for (let i = 0; i < count; i++) {
                const row = Math.floor(i / cols);
                const col = i % cols;
                newNodes.push(createNode(i, col * xSpacing, row * ySpacing));
            }

            for (let i = 0; i < count; i++) {
                const row = Math.floor(i / cols);
                const col = i % cols;
                if (col < cols - 1) { // Connect to the right
                    const rightNeighborIndex = i + 1;
                    if (rightNeighborIndex < count && Math.floor(rightNeighborIndex / cols) === row) {
                        newConnections.push({ id: `${newNodes[i].id}-${newNodes[rightNeighborIndex].id}`, from: newNodes[i].id, to: newNodes[rightNeighborIndex].id });
                    }
                }
                if (row < rows - 1) { // Connect to the bottom
                    const bottomNeighborIndex = i + cols;
                    if (bottomNeighborIndex < count) {
                        newConnections.push({ id: `${newNodes[i].id}-${newNodes[bottomNeighborIndex].id}`, from: newNodes[i].id, to: newNodes[bottomNeighborIndex].id });
                    }
                }
            }
        } else if (topology === 'ring') {
            const centerX = canvasWidth / 2;
            const centerY = canvasHeight / 2;
            const radius = Math.min(centerX, centerY) * 0.8;
            for (let i = 0; i < count; i++) {
                const angle = (i / count) * 2 * Math.PI;
                newNodes.push(createNode(i, centerX + radius * Math.cos(angle), centerY + radius * Math.sin(angle)));
            }
            for (let i = 0; i < count; i++) {
                newConnections.push({ id: `conn-${i}`, from: newNodes[i].id, to: newNodes[(i + 1) % count].id });
            }
        } else if (topology === 'star') {
            const hubType = includeSwitches ? NetworkComponentType.SWITCH : NetworkComponentType.BASE_STATION;
            const hub = createNode(0, canvasWidth / 2, canvasHeight / 2, hubType);
            newNodes.push(hub);
            for (let i = 1; i < count; i++) {
                const angle = (i / (count - 1)) * 2 * Math.PI;
                const radius = Math.min(canvasWidth, canvasHeight) / 2.5 * (0.5 + Math.random() * 0.5);
                const node = createNode(i, hub.x - offsetX + radius * Math.cos(angle), hub.y - offsetY + radius * Math.sin(angle));
                newNodes.push(node);
                newConnections.push({ id: `conn-${i}`, from: hub.id, to: node.id });
            }
        } else if (topology === 'bus') {
            const yPos = canvasHeight / 2;
            const xSpacing = canvasWidth / (count - 1 || 1);
            for (let i = 0; i < count; i++) {
                newNodes.push(createNode(i, i * xSpacing, yPos));
            }
            for (let i = 0; i < count - 1; i++) {
                newConnections.push({ id: `conn-${i}`, from: newNodes[i].id, to: newNodes[i + 1].id });
            }
        }
        
        // Ensure connectivity for all topologies
        if (newNodes.length > 1 && !['star', 'bus'].includes(topology)) {
            const components = networkAnalysisService.findNetworkComponents(newNodes, newConnections);
            if (components.length > 1) {
                for (let i = 1; i < components.length; i++) {
                    // Find the closest pair of nodes between the main component and the isolated one
                    let minDistance = Infinity;
                    let bestConnection: { from: string; to: string } | null = null;
                    const mainComponent = components[0];
                    const isolatedComponent = components[i];
                    
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
                    }
                }
            }
        }

        return { nodes: newNodes, connections: newConnections, clusterHeadIds: newClusterHeadIds };
    }
}
// FIX: Export an instance of the service to be used in other components.
export const networkGenerationService = new NetworkGenerationService();