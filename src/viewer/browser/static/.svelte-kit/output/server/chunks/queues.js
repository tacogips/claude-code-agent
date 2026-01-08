import { w as writable } from "./index.js";
import "./websocket.js";
const queues = writable([]);
const currentQueue = writable(null);
const isLoadingQueues = writable(false);
const isLoadingQueue = writable(false);
const queuesError = writable(null);
function unloadQueue() {
  currentQueue.set(null);
}
export {
  queues as a,
  isLoadingQueue as b,
  currentQueue as c,
  isLoadingQueues as i,
  queuesError as q,
  unloadQueue as u
};
