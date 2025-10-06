
import { Node, Connection, NetworkComponentType } from '../types';

class PathfindingService {
  public findFarthestNodes(nodes: Node[], excludeNodeIds: string[] = []): [string, string] | null {
    const validNodes = nodes.filter(n => !excludeNodeIds.includes(n.id));
    if (validNodes.length < 2) return null;

    let maxDist = -1;
    let farthestPair: [string, string] | null = null;

    for (let i = 0; i < validNodes.length; i++) {
      for (let j = i + 1; j < validNodes.length; j++) {
        const n1 = validNodes[i];
        const n2 = validNodes[j];
        const dist = Math.sqrt(Math.pow(n1.x - n2.x, 2) + Math.pow(n1.y - n2.y, 2));
        if (dist > maxDist) {
          maxDist = dist;
          farthestPair = [n1.id, n2.id];
        }
      }
    }
    return farthestPair;
  }

  private bfs(startNodeId: string, endNodeId: string, availableNodes: Node[], connections: Connection[]): string[] | null {
    if (startNodeId === endNodeId) return [startNodeId];

    const nodeIds = new Set(availableNodes.map(n => n.id));
    const adjacency: { [key: string]: string[] } = {};
    availableNodes.forEach(n => adjacency[n.id] = []);
    connections.forEach(c => {
        if (nodeIds.has(c.from) && nodeIds.has(c.to)) {
            adjacency[c.from].push(c.to);
            adjacency[c.to].push(c.from);
        }
    });

    const queue: string[][] = [[startNodeId]];
    const visited = new Set<string>([startNodeId]);

    while (queue.length > 0) {
      const path = queue.shift()!;
      const nodeId = path[path.length - 1];

      if (nodeId === endNodeId) return path;

      for (const neighbor of adjacency[nodeId] || []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push([...path, neighbor]);
        }
      }
    }
    return null;
  }

  private findClusterHeadForNode(nodeId: string, nodes: Node[], connections: Connection[], clusterHeadIds: string[]): string | null {
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return null;

      if (clusterHeadIds.includes(nodeId) || node.type === NetworkComponentType.BASE_STATION) {
          return nodeId;
      }
      
      const neighbors = connections
          .filter(c => c.from === nodeId || c.to === nodeId)
          .map(c => c.from === nodeId ? c.to : c.from);

      for (const neighborId of neighbors) {
          if (clusterHeadIds.includes(neighborId)) {
              return neighborId;
          }
      }
      
      // Fallback: if not directly connected, find closest one via BFS on all non-head nodes
      const nonHeadNodes = nodes.filter(n => !clusterHeadIds.includes(n.id) || n.id === nodeId);
      let closestHead: string | null = null;
      let shortestPathLength = Infinity;

      for(const headId of clusterHeadIds) {
          const path = this.bfs(nodeId, headId, nonHeadNodes, connections);
          if (path && path.length < shortestPathLength) {
              shortestPathLength = path.length;
              closestHead = headId;
          }
      }
      return closestHead;
  }


  public findShortestPath(
    startNodeId: string,
    endNodeId: string,
    nodes: Node[],
    connections: Connection[],
    options: {
      excludeNodeIds?: string[];
      clusterHeadIds?: string[];
      topology?: string;
    } = {}
  ): string[] | null {
    const { excludeNodeIds = [], clusterHeadIds = [], topology = '' } = options;
    if (!startNodeId || !endNodeId || nodes.length === 0 || excludeNodeIds.includes(startNodeId) || excludeNodeIds.includes(endNodeId)) return null;

    const disabledSwitches = new Set(nodes.filter(n => n.type === NetworkComponentType.SWITCH && n.isEnabled === false).map(n => n.id));
    const validNodes = nodes.filter(n => !excludeNodeIds.includes(n.id));
    const validConnections = connections.filter(c => !disabledSwitches.has(c.from) && !disabledSwitches.has(c.to) && !excludeNodeIds.includes(c.from) && !excludeNodeIds.includes(c.to));
    
    // --- Hierarchical Cluster Routing ---
    if (topology.toLowerCase().includes('cluster') && clusterHeadIds.length > 0) {
        const startHead = this.findClusterHeadForNode(startNodeId, validNodes, validConnections, clusterHeadIds);
        const endHead = this.findClusterHeadForNode(endNodeId, validNodes, validConnections, clusterHeadIds);

        if (!startHead || !endHead) return null; // Cannot determine routing path

        // Case 1: Path within the same cluster (or from a node to its head)
        if (startHead === endHead) {
            const clusterNodes = validNodes.filter(n => this.findClusterHeadForNode(n.id, validNodes, validConnections, clusterHeadIds) === startHead);
            const pathStartToHead = this.bfs(startNodeId, startHead, clusterNodes, validConnections);
            const pathHeadToEnd = this.bfs(startHead, endNodeId, clusterNodes, validConnections);
            
            if (pathStartToHead && pathHeadToEnd) {
                return [...pathStartToHead, ...pathHeadToEnd.slice(1)];
            }
            // Fallback to direct path if head-path fails
            return this.bfs(startNodeId, endNodeId, clusterNodes, validConnections);
        }

        // Case 2: Path between different clusters
        const path1 = this.bfs(startNodeId, startHead, validNodes, validConnections);
        
        const headAndBaseStationNodes = validNodes.filter(n => clusterHeadIds.includes(n.id) || n.type === NetworkComponentType.BASE_STATION);
        const path2 = this.bfs(startHead, endHead, headAndBaseStationNodes, validConnections);
        
        const path3 = this.bfs(endHead, endNodeId, validNodes, validConnections);

        if (path1 && path2 && path3) {
            // Combine paths and remove duplicate nodes at junctions
            return [...path1, ...path2.slice(1), ...path3.slice(1)];
        }
    }

    // --- Standard BFS Routing (Fallback / Non-cluster) ---
    return this.bfs(startNodeId, endNodeId, validNodes, validConnections);
  }
}

export const pathfindingService = new PathfindingService();
