import { HookManager, usePlugin } from "@unisonjs/core";
import HookRef from "../react-hook/hookRef.js";
import { unref } from "../reactivity/ref.js";

usePlugin(HookManager, { signalClass: HookRef, unsignal: unref });

export { toUnisonHook } from "@unisonjs/core";
