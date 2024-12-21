// pre
// post
// sync
// layout

import { ShallowReactive } from "#vue-internals/reactivity/reactive.js";
import { Events } from "./context.js";

// insertion
type EventTypes = typeof Events;

export type EventType = EventTypes[keyof EventTypes];

export type Event = {
  type: EventType;
  job?: SchedulerJob;
  index?: number;
};

export type SetupComponent<T extends Record<string, any>> = (props: ShallowReactive<T>) => () => React.ReactNode;

export type DeepPartial<T> = T extends object ? {
  [P in keyof T]?: DeepPartial<T[P]>;
} : T;
export type CaseParams<T> = T extends object ? [...(DeepPartial<T> | boolean)[], any] : [...(T | boolean)[], any];

export interface Listener {
  trigger?: (value?: any, oldValue?: any) => void;
  clean?: () => void;
  cleanups?: (() => void)[];
}
