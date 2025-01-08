import { HookManager, usePlugin } from "@unisonjs/core";
import HookRef from "../react-hook/hookRef";
import { unref } from "../reactivity/ref";

usePlugin(HookManager, { signalClass: HookRef, unsignal: unref });

export { toUnisonHook } from "@unisonjs/core";
