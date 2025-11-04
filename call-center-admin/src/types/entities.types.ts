/**
 * Entity Types - Mirror backend entities
 */

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  TENANT_ADMIN = 'TENANT_ADMIN',
  SUPERVISOR = 'SUPERVISOR',
  AGENT = 'AGENT',
  ADMIN = 'ADMIN',
}

export interface User {
  id: number;
  email: string;
  username?: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  tenantId: number | null;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Tenant {
  id: number;
  name: string;
  companyName?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  city?: string;
  country?: string;
  timezone?: string;
  maxEndpoints?: number;
  maxQueues?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Endpoint {
  id: number;
  tenantId: number;
  username: string;
  transport: string;
  context: string;
  allow: string;
  callerid?: string;
  mailboxes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EndpointEnriched extends Endpoint {
  deviceState?: string;
  registrationStatus?: string;
  ipAddress?: string;
  userAgent?: string;
  latency?: number;
  activeChannels?: number;
}

export interface Queue {
  id: number;
  tenantId: number;
  name: string;
  strategy: string;
  timeout: number;
  maxlen?: number;
  weight?: number;
  announce?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface QueueEnriched extends Queue {
  calls?: number;
  completed?: number;
  abandoned?: number;
  holdtime?: number;
  talktime?: number;
  members?: QueueMember[];
}

export interface QueueMember {
  id: number;
  queueName: string;
  memberName: string;
  interface: string;
  penalty: number;
  paused: boolean;
  tenantId: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface QueueMemberEnriched extends QueueMember {
  status?: string;
  callsTaken?: number;
  lastCall?: number;
  endpointStatus?: string;
}

export interface Channel {
  id: string;
  name: string;
  state: string;
  caller: {
    number: string;
    name?: string;
  };
  connected?: {
    number: string;
    name?: string;
  };
  createdAt: string;
}

export interface CDR {
  id: number;
  tenantId: number;
  calldate: Date;
  clid: string;
  src: string;
  dst: string;
  dcontext: string;
  channel: string;
  dstchannel: string;
  lastapp: string;
  lastdata: string;
  duration: number;
  billsec: number;
  disposition: string;
  amaflags: number;
  accountcode: string;
  uniqueid: string;
  userfield: string;
}

export interface Recording {
  id: number;
  tenantId: number;
  filename: string;
  calldate: Date;
  src: string;
  dst: string;
  duration: number;
  filesize: number;
  filepath: string;
  createdAt: Date;
}
