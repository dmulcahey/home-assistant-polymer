import type { HaSelect } from "../../../../../components/ha-select";
import type { ZHADevice } from "../../../../../data/zha";

export interface ItemSelectedEvent {
  target?: HaSelect;
}

export interface ZHADeviceRemovedEvent {
  detail?: {
    device?: ZHADevice;
  };
}

export interface ChangeEvent {
  detail?: {
    value?: unknown;
  };
  target?: EventTarget;
}

export interface SetAttributeServiceData {
  ieee: string;
  endpoint_id: number;
  cluster_id: number;
  cluster_type: string;
  attribute: string | number;
  value: unknown;
  manufacturer?: number;
}

export interface IssueCommandServiceData {
  ieee: string;
  endpoint_id: number;
  cluster_id: number;
  cluster_type: string;
  command: number;
  command_type: string;
  params: Record<string, unknown>;
}

export interface ZHADeviceSelectedParams {
  node: ZHADevice;
}

export interface NodeServiceData {
  ieee_address: string;
}
