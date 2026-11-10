import { RuntimeLog, runtimeLogOptionsFromEnv } from './runtime-log';

export const rlog = new RuntimeLog(runtimeLogOptionsFromEnv('frontend'));
