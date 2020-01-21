import { enableProfilerTimer } from "react-study/shared/ReactFeatureFlags";
import * as Scheduler from '../../scheduler';

const { unstable_now: now } = Scheduler;


let commitTime = 0;
let profilerStartTime = -1;

export function getCommitTime() {
  return commitTime;
}

export function recordCommitTime() {
  if (!enableProfilerTimer) {
    return;
  }
  commitTime = now();
}