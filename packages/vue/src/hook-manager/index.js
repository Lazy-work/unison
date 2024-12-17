import { HookManager, usePlugin } from "@bridge/core";
import HookRef from "../react-hook/hookRef";
import { unref } from "#vue-internals/reactivity/ref";

usePlugin(HookManager, { signalClass: HookRef, unsignal: unref });

export { toBridgeHook } from "@bridge/core";
