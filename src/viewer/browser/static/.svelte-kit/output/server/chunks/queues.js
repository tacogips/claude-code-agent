import { w as writable } from "./index.js";
import "./websocket.js";
const queues = writable([]);
const currentQueue = writable(null);
const isLoadingQueues = writable(false);
const isLoadingQueue = writable(false);
const queuesError = writable(null);
export {
  queues as a,
  isLoadingQueue as b,
  currentQueue as c,
  isLoadingQueues as i,
  queuesError as q
};
