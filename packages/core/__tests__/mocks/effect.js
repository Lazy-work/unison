/** @import {SchedulerJob} from "../../src" */
import { ReactiveEffect, getCurrentInstance, queueJob } from '../../src';
import { queuePostFlushCb } from '#vue-internals/runtime-core/scheduler.js';

/**
 * Create a reactive effect and schedule it to run.
 *
 * @param {Function} fn - The effect function to run reactively.
 */
export function watchEffect(fn) {
  const effect = new ReactiveEffect(fn);

  /**
   * @type {SchedulerJob}
   */
  const job = () => effect.run();

  /**
   * Scheduler function for the effect.
   *
   * @param {boolean} isFirstRun - Whether this is the first run of the effect.
   */
  effect.scheduler = (isFirstRun) => {
    const instance = job.i;
    if (isFirstRun) {
      job();
    } else {
      const jobIndex = queueJob(job);
      if (instance && instance.queueEffect) {
        instance.queueEffect('pre', jobIndex);
      }
    }
  };

  const instance = getCurrentInstance();
  if (!instance) throw new Error('No instance found');

  job.i = instance;
  job.position = instance.getEffectPosition();

  effect.scheduler(true);
}

/**
 * Create a reactive effect and schedule it to run after a flush.
 *
 * @param {Function} fn - The effect function to run reactively.
 */
export function watchPostEffect(fn) {
  const effect = new ReactiveEffect(fn);

  /**
   * @type {SchedulerJob}
   */
  const job = () => effect.run();

  /**
   * Scheduler function for post-flush effects.
   */
  effect.scheduler = () => {
    const instance = job.i;
    const jobIndex = queuePostFlushCb(job);
    if (instance && instance.queueEffect) {
      instance.queueEffect('post', jobIndex.offset);
    }
  };

  const instance = getCurrentInstance();
  if (!instance) throw new Error('No instance found');

  job.i = instance;
  job.position = instance.getEffectPosition();

  effect.scheduler();
}
