
export enum Workspace {
  CODE = 'CODE',
  VISUAL = 'VISUAL',
}

export enum NetworkComponentType {
  NODE = 'NODE',
  ROUTER = 'ROUTER',
  SWITCH = 'SWITCH',
  BASE_STATION = 'BASE_STATION',
}

export type NetworkTopology = 'random' | 'grid' | 'cluster' | 'mesh' | 'cluster-mesh' | 'ring' | 'bus' | 'star';

export interface Node {
  id: string;
  type: NetworkComponentType;
  x: number;
  y: number;
  vx?: number; // Velocity for mobility simulation
  vy?: number; // Velocity for mobility simulation
  ipAddress: string;
  energyEfficiency: number; // Represents health/battery for mobile nodes
  energySpent: number; // Consumption rate
  isMalicious?: boolean;
  // Optional, type-specific properties
  packetForwardingCapacity?: number; // For ROUTER (packets/sec)
  portCount?: number; // For SWITCH
  isEnabled?: boolean; // For SWITCH
  isReceiver?: boolean; // For BASE_STATION
}

export interface Connection {
  id: string;
  from: string;
  to: string;
}

export interface AnimatedPacket {
  id:string;
  path: string[];
  progress: number; // 0 to 1 over the whole path
  color: string;
  startTime: number;
  duration: number;
  message?: string;
  isAttackPacket?: boolean;
}

export interface DeliveredPacketInfo {
  id: string;
  from: string;
  to: string;
  message: string;
  path: string[];
  status: 'delivered' | 'dropped';
  transmissionTime: number; // in milliseconds
}

export interface SimulationParameters {
  [key: string]: number;
  'Packet Delivery Ratio': number;
  'End-to-end Delay (ms)': number;
  'Energy Consumption (J)': number;
  'Network Lifetime (hours)': number;
  'Sustained Operations (cycles)': number;
  'Scalability Index': number;
  'Computational Efficiency (%)': number;
  'Energy Efficiency': number;
  'Robustness Index': number;
  'Throughput (Mbps)': number;
}