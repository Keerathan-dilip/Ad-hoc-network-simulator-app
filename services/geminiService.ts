
import { GoogleGenAI } from "@google/genai";
import { Node, Connection } from '../types';

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

  public async getChatResponse(
    prompt: string,
    history: { role: 'user' | 'model'; parts: { text: string }[] }[],
    context: {
      nodes: Node[];
      connections: Connection[];
      topology: string;
      cppCode: string;
      tclCode: string;
      awkCode: string;
      simulationData: any[] | null;
      awkOutput: string | null;
    }
  ): Promise<string> {
    if (!this.ai) {
      console.warn("API_KEY not found. Using mock data for chat response.");
      return this.getMockChatResponse(prompt);
    }

    const systemInstruction = `You are an expert network analyst assistant integrated into an Ad Hoc Network Simulator application.
Your goal is to help the user understand their network simulation, the generated code, and general networking concepts.
You have access to the current state of the simulation. Be concise and helpful. Format your answers using Markdown.
Use **bold** for key terms, \`code\` for code snippets, and lists for clarity.

Here is the current context of the application:
- **Network State**: ${context.nodes.length} nodes and ${context.connections.length} connections.
- **Identified Topology**: ${context.topology}.
- **Generated Code**: The user has access to C++, TCL, and AWK code for simulation. If asked about the code, refer to the following content:
  - C++ (NS-3): \n\`\`\`cpp\n${context.cppCode}\n\`\`\`
  - TCL (NS-2): \n\`\`\`tcl\n${context.tclCode}\n\`\`\`
  - AWK: \n\`\`\`awk\n${context.awkCode}\n\`\`\`
- **Simulation Results**:
    - Performance Charts Data: ${context.simulationData ? JSON.stringify(context.simulationData, null, 2) : 'Not yet run.'}
    - Final AWK Output: ${context.awkOutput || 'Not yet run.'}

Answer the user's questions based on this context. If the question is general, answer it from your knowledge base.
If the user asks to generate a network, you MUST state that network generation is handled by the "Network Generator" in the "Visual Builder" workspace and that you are here to help with analysis and questions.
Do not attempt to generate a network yourself. Your responses should be helpful and directly related to the user's query and the provided simulation context.`;
    
    const contents = [...history, { role: 'user', parts: [{ text: prompt }] }];

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config: {
          systemInstruction,
        },
      });
      return response.text;
    } catch (error) {
      console.error("Error fetching chat response from Gemini API:", error);
      return "**Error:** Could not get a response from the AI. The API may be unavailable or the key may be invalid.";
    }
  }

  private getMockChatResponse(prompt: string): string {
    if (prompt.toLowerCase().includes('code')) {
        return "The C++ code is for setting up an NS-3 simulation. It creates nodes, sets up a mobility model, and installs an AODV routing protocol. It's a foundational script for a more complex simulation."
    }
    if (prompt.toLowerCase().includes('topology')) {
        return "The topology of your network seems to be a **Hybrid** one. You can get a detailed analysis by running the 'Analyze Network' function in the Visual Builder."
    }
    return "I'm ready to help! I can answer questions about the C++, TCL, or AWK code, explain your simulation results, or discuss general networking topics. What would you like to know?";
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
