export interface InstanceProxy {
  id: string;
  enabled: boolean;
  host: string;
  port: string;
  protocol: string;
  username: string;
  password: string;
  createdAt: string;
  updatedAt: string;
  instanceId: string;
}

export interface InstanceSettings {
  id: string;
  rejectCall: boolean;
  msgCall: string;
  groupsIgnore: boolean;
  alwaysOnline: boolean;
  readMessages: boolean;
  readStatus: boolean;
  syncFullHistory: boolean;
  createdAt: string;
  updatedAt: string;
  instanceId: string;
}

export interface InstanceStats {
  Message: number;
  Contact: number;
  Chat: number;
}

export interface Instance {
  id: string;
  name: string;
  connectionStatus: 'open' | 'connecting' | 'closed';
  ownerJid: string;
  profileName: string;
  profilePictureUrl: string;
  integration: string;
  number: string;
  businessId: string | null;
  token: string;
  clientName: string;
  disconnectionReasonCode: string | null;
  disconnectionObject: any | null;
  disconnectionAt: string | null;
  createdAt: string;
  updatedAt: string;
  Proxy: InstanceProxy | null;
  Setting: InstanceSettings | null;
  _count: InstanceStats;
  status: 'connected' | 'disconnected' | 'connecting';
  qrcode?: string;
}