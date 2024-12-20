import { HookManager, usePlugin } from "@briddge/core";
import HookRef from "../react-hook/hookRef.js";
import { unref } from "../reactivity/ref.js";

usePlugin(HookManager, { signalClass: HookRef, unsignal: unref });

export { toBridgeHook } from "@briddge/core";
