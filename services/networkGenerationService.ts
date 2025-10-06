
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

        } else if (topology === 'random' || topology === 'mesh') {
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

            endNodes.forEach(node => {
                const potentialTargets = [...infraNodes, ...endNodes.filter(n => n.id !== node.id)];
                if (potentialTargets.length === 0) return;
                potentialTargets.sort((a, b) => (Math.hypot(a.x - node.x, a.y - node.y) - Math.hypot(b.x - node.x, b.y - node.y)));
                const target = potentialTargets[0];
                newConnections.push({ id: `${node.id}-${target.id}-${Date.now()}`, from: node.id, to: target.id });
            });

            if (topology === 'mesh') {
                const K_NEAREST = 3;
                const meshableNodes = newNodes.filter(n => n.type !== NetworkComponentType.BASE_STATION);
                meshableNodes.forEach(sourceNode => {
                    const distances = meshableNodes
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
            }
        } else if (topology === 'grid') {
            const baseStation = createNode(count, canvasWidth / 2, padding, NetworkComponentType.BASE_STATION);
            newNodes.push(baseStation);

            const numRouters = includeRouters ? Math.max(1, Math.floor(count / 25)) : 0;
            const cols = Math.ceil(Math.sqrt(count * (canvasWidth / canvasHeight)));
            const rows = Math.ceil(count / cols);
            const xSpacing = canvasWidth / (cols + 1);
            const ySpacing = (canvasHeight - padding * 2) / (rows + 1);
            let routerPlaced = 0;
            const gridNodes: Node[] = [];

            for (let i = 0; i < count; i++) {
                const row = Math.floor(i / cols);
                const col = i % cols;
                const x = (col + 1) * xSpacing;
                const y = (row + 1) * ySpacing + padding;

                if (includeRouters && routerPlaced < numRouters && row > 0 && col > 0 && row < rows - 1 && col < cols - 1 && (row % 3 === 1 && col % 3 === 1)) {
                    gridNodes.push(createNode(i, x, y, NetworkComponentType.ROUTER));
                    routerPlaced++;
                } else {
                    gridNodes.push(createNode(i, x, y));
                }
            }
            newNodes.push(...gridNodes);

            // Add grid connections
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const currentIndex = r * cols + c;
                    if (currentIndex >= gridNodes.length) continue;
                    const currentNode = gridNodes[currentIndex];

                    // Connect to right neighbor
                    if (c < cols - 1) {
                        const rightIndex = r * cols + (c + 1);
                        if (rightIndex < gridNodes.length) {
                            const rightNode = gridNodes[rightIndex];
                            newConnections.push({ id: `conn-grid-${currentNode.id}-${rightNode.id}`, from: currentNode.id, to: rightNode.id });
                        }
                    }

                    // Connect to bottom neighbor
                    if (r < rows - 1) {
                        const bottomIndex = (r + 1) * cols + c;
                        if (bottomIndex < gridNodes.length) {
                            const bottomNode = gridNodes[bottomIndex];
                            newConnections.push({ id: `conn-grid-${currentNode.id}-${bottomNode.id}`, from: currentNode.id, to: bottomNode.id });
                        }
                    }
                }
            }

            if (gridNodes.length > 0) {
                gridNodes.sort((a, b) => Math.hypot(a.x - baseStation.x, a.y - baseStation.y) - Math.hypot(b.x - baseStation.x, b.y - baseStation.y));
                const closestNode = gridNodes[0];
                newConnections.push({ id: `${baseStation.id}-${closestNode.id}-${Date.now()}`, from: baseStation.id, to: closestNode.id });
            }
        } else if (topology === 'ring' || topology === 'bus') {
            const centerX = canvasWidth / 2;
            const centerY = canvasHeight / 2;
            const baseStation = createNode(count, centerX, padding, NetworkComponentType.BASE_STATION);

            const topologyNodes: Node[] = [];

            if (topology === 'ring') {
                const radiusX = canvasWidth / 2 - padding;
                const radiusY = canvasHeight / 2 - padding;
                for (let i = 0; i < count; i++) {
                    const angle = (i / count) * 2 * Math.PI;
                    topologyNodes.push(createNode(i, centerX + radiusX * Math.cos(angle), centerY + radiusY * Math.sin(angle)));
                }
                for (let i = 0; i < count; i++) {
                    newConnections.push({ id: `conn-${i}-${Date.now()}`, from: topologyNodes[i].id, to: topologyNodes[(i + 1) % count].id });
                }
            } else { // Bus
                const xSpacing = canvasWidth / (count + 1);
                for (let i = 0; i < count; i++) {
                    topologyNodes.push(createNode(i, (i + 1) * xSpacing, centerY));
                }
                for (let i = 0; i < count - 1; i++) {
                    newConnections.push({ id: `conn-${i}-${Date.now()}`, from: topologyNodes[i].id, to: topologyNodes[i + 1].id });
                }
            }

            if (topologyNodes.length > 0) {
                topologyNodes.sort((a, b) => Math.hypot(a.x - baseStation.x, a.y - baseStation.y) - Math.hypot(b.x - baseStation.x, b.y - baseStation.y));
                newConnections.push({ id: `${baseStation.id}-${topologyNodes[0].id}-${Date.now()}`, from: baseStation.id, to: topologyNodes[0].id });
            }

            newNodes.push(baseStation, ...topologyNodes);

        } else if (topology === 'star') {
            const centerX = canvasWidth / 2;
            const centerY = canvasHeight / 2;
            const hubNode = createNode(0, centerX, centerY, NetworkComponentType.BASE_STATION);
            newNodes.push(hubNode);

            if (count > 1) {
                const peripheralCount = count - 1;
                const radiusX = canvasWidth / 2 - padding;
                const radiusY = canvasHeight / 2 - padding;
                for (let i = 0; i < peripheralCount; i++) {
                    const angle = (i / peripheralCount) * 2 * Math.PI;
                    const pNode = createNode(i + 1, centerX + radiusX * Math.cos(angle), centerY + radiusY * Math.sin(angle));
                    newNodes.push(pNode);
                    newConnections.push({ id: `${hubNode.id}-${pNode.id}-${Date.now()}`, from: pNode.id, to: hubNode.id });
                }
            }
        }

        // Ensure all nodes are part of a single connected component
        if (newNodes.length > 1) {
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

        return { nodes: newNodes, connections: newConnections, clusterHeadIds: newClusterHeadIds };
    }
}

export const networkGenerationService = new NetworkGenerationService();
