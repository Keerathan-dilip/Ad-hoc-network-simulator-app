import { GoogleGenAI } from "@google/genai";

interface NetworkInsightsData {
  nodeCount: number;
  connectionCount: number;
  topology: string;
  avgDegree: number;
  isolatedNodes: number;
  routerCount: number;
  switchCount: number;
  baseStationCount: number;
  avgEnergyEfficiency: number;
  weakNodes: number;
}

class GeminiService {
  private ai: GoogleGenAI | null = null;

  constructor() {
    if (process.env.API_KEY) {
      this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
  }

  // FIX: Add getTopologyDescription method to satisfy call from Chatbot.tsx
  public async getTopologyDescription(topology: string): Promise<string> {
    if (!this.ai) {
      console.warn("API_KEY not found. Using mock data for topology description.");
      return this.getMockTopologyDescription(topology);
    }

    const prompt = `
      Provide a concise, one-paragraph explanation of a "${topology}" network topology for a user in a simulation tool.
      Explain its main characteristics, key advantages, and common disadvantages or use cases.
      Structure the explanation to be easily understandable for someone learning about networks.
      Highlight key terms by wrapping them in double asterisks, for example, **decentralized** or **single point of failure**.
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      return response.text;
    } catch (error) {
      console.error(`Error fetching topology description from Gemini API for ${topology}:`, error);
      return `**Error:** Could not get information about the ${topology} topology.`;
    }
  }
  
  public async getStructuredAnalysis(data: NetworkInsightsData): Promise<string> {
    if (!this.ai) {
      console.warn("API_KEY not found. Using mock data for Gemini insights.");
      return this.getMockStructuredAnalysis(data);
    }

    const prompt = `
      You are an expert network analyst providing a structured educational report for an ad hoc network simulation tool.
      Your response MUST follow the specified order and use the exact section headers provided.
      The first few sections should be general educational content about the identified topology, and the final sections should be AI insights tailored to the user's specific design.

      Network Data for Specific Insights:
      - Total Node Count: ${data.nodeCount}
      - Infrastructure: ${data.routerCount} Routers, ${data.switchCount} Switches, ${data.baseStationCount} Base Stations
      - Connection Count: ${data.connectionCount}
      - Identified Topology: ${data.topology}
      - Average Node Degree (Connections per node): ${(data.avgDegree).toFixed(2)}
      - Isolated Nodes (0 connections): ${data.isolatedNodes}
      - Average Mobile Node Energy Efficiency: ${data.avgEnergyEfficiency.toFixed(1)}%
      - Weak Nodes (efficiency < 85%): ${data.weakNodes}

      Please generate the report with the following sections in this exact order. Use double asterisks for headers (e.g., **Definition:**) and asterisks for list items (*).

      **Definition:**
      Provide a concise, one-paragraph definition of a "${data.topology}".

      **Recommended Protocol:**
      Name one or two primary ad hoc routing protocols most suitable for a general "${data.topology}" network (e.g., AODV, DSR, ZRP, OLSR). Then, in the same paragraph, briefly explain their mechanisms and why they are a good fit. **You must wrap all protocol names in double asterisks** (e.g., **AODV** or **ZRP**).

      **General Advantages:**
      List 2-3 key general advantages of the "${data.topology}". Start each point on a new line with an asterisk (*).

      **General Disadvantages:**
      List 2-3 key general disadvantages of the "${data.topology}". Start each point on a new line with an asterisk (*).

      **AI Insights on Your Design:**
      Based on the specific Network Data provided above, provide a one-paragraph analysis of the user's current network. Comment on its specific structure, density, component usage, and health.

      **Recommendations:**
      Based on the specific Network Data, provide a list of 2-3 actionable recommendations for improving this particular design. Start each point on a new line with an asterisk (*).
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      return response.text;
    } catch (error) {
      console.error("Error fetching analysis from Gemini API:", error);
      return "**Error:** Could not generate network analysis. The API may be unavailable or the key may be invalid.";
    }
  }

  private getMockTopologyDescription(topology: string): string {
    const descriptions: { [key: string]: string } = {
        'cluster': `A **cluster** topology organizes nodes into groups. Each group has a **cluster head** that manages communication within its cluster and with other clusters. This hierarchical approach is excellent for **scalability** in large networks but can introduce latency if data has to travel between many clusters.`,
        'mesh': `A **mesh** network is a **decentralized** system where nodes connect to many other nodes, creating multiple redundant paths. This makes it highly **resilient** to node failures. The main drawback is the potential for high routing overhead as the network grows.`,
        'cluster-mesh': `This **hybrid** topology combines the best of both worlds. Nodes are grouped into **clusters** for scalability, but within each cluster, they form a **mesh** network for high resilience. It provides a good balance between robustness and efficiency.`,
        'star': `In a **star** topology, all nodes are connected to a single, central hub (like a switch or base station). It's simple to manage and add new nodes. However, if the central hub fails, the entire network goes down, making it a **single point of failure**.`,
        'ring': `A **ring** topology connects each node to exactly two other nodes, forming a single continuous pathway for signals. It's orderly and performs well under heavy load, but the failure of a single node or cable can break the entire loop.`,
        'bus': `A **bus** topology uses a single backbone cable to which all nodes are connected. It's simple and inexpensive to set up. However, problems with the main cable can disable the entire network, and performance degrades as more nodes are added due to data collisions.`,
        'grid': `A **grid** topology arranges nodes in a two-dimensional grid. It's a highly structured and redundant form of a mesh network, often used in high-performance computing. It offers good fault tolerance but can be inefficient for widespread ad hoc networks.`,
        'random': `A **random** topology places nodes arbitrarily, simulating unpredictable real-world environments like a disaster area or a battlefield. It's useful for testing the **adaptability** of routing protocols under chaotic conditions.`,
    };
    return descriptions[topology as keyof typeof descriptions] || `A description for the ${topology} topology, highlighting its key features.`;
  }

  private getMockStructuredAnalysis(data: NetworkInsightsData): string {
    return `
**Definition:**
A ${data.topology} is a network layout where nodes are organized in a specific physical or logical manner. This structure dictates how devices are connected and how they communicate with one another, influencing the network's overall performance, reliability, and scalability.

**Recommended Protocol:**
For a ${data.topology}, the most suitable protocol is typically **AODV** (Ad hoc On-demand Distance Vector). It's a reactive protocol that establishes routes only when they are needed, which reduces overhead in dynamic networks. It discovers routes using a route request/reply query cycle, making it efficient for mobile nodes.

**General Advantages:**
* Good for dynamic environments where nodes are mobile.
* Generally offers high reliability due to multiple potential paths.
* Can be highly scalable depending on the specific implementation.

**General Disadvantages:**
* Can have high setup latency as routes are discovered on-demand.
* May suffer from control overhead in very large or dense networks.
* Not always the most efficient in terms of energy consumption.

**AI Insights on Your Design:**
Your specific design is a moderately sized ${data.topology} with ${data.nodeCount} nodes. The use of ${data.routerCount} routers creates a strong backbone. The average node degree of ${data.avgDegree.toFixed(2)} indicates good connectivity, but the ${data.isolatedNodes} isolated nodes need to be connected. The overall energy efficiency of ${data.avgEnergyEfficiency.toFixed(1)}% is healthy, though the ${data.weakNodes} weak nodes are a concern.

**Recommendations:**
* Use the 'Connect Nodes' mode to link the ${data.isolatedNodes} isolated node(s) to ensure full network participation.
* Navigate to the "Report Dashboard" and use the "Remove Weaker Nodes & Reconstruct" feature to improve long-term stability.
* Consider adding more connections between routers to create more direct, high-speed paths if delay is a critical metric.
    `;
  }
}

export const geminiService = new GeminiService();