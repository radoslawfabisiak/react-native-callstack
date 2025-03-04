import AsyncStorage from "@react-native-async-storage/async-storage";

class ReactNativeCallstack {
  constructor({ maxAttempts = 3600, interval = 500, functionMap = {} } = {}) {
    this.storage = AsyncStorage;
    this.maxAttempts = maxAttempts;
    this.interval = interval;
    this.functionMap = functionMap; // Mapped API functions with custom payload handling
    this.callstack = [];
    this.queue = Promise.resolve();
    this.running = false;
  }

  async initialize() {
    try {
      const json = await this.storage.getItem("CALLSTACK_TESS");
      this.callstack = json ? JSON.parse(json) : [];
      this.deduplicate();
      this.runWorker(); // Start worker on init
    } catch (err) {
      console.error("[RN Callstack] Init failed:", err);
      this.callstack = [];
    }
  }

  deduplicate() {
    const unique = {};
    this.callstack.forEach((call) => {
      const key = `${call.type}_${JSON.stringify(call.payload)}`;
      if (!unique[key] || unique[key].attempts < call.attempts)
        unique[key] = call;
    });
    this.callstack = Object.values(unique);
  }

  async save() {
    try {
      this.deduplicate();
      await this.storage.setItem(
        "CALLSTACK_TEST",
        JSON.stringify(this.callstack)
      );
    } catch (err) {
      console.error("[RN Callstack] Save failed:", err);
    }
  }

  queueUpdate(fn) {
    this.queue = this.queue
      .then(fn)
      .catch((err) => console.error("Queue error:", err));
    return this.queue;
  }

  async add({
    type,
    payload,
    error,
    attempts = 0,
    onError = ({ type, attempts, error }) =>
      console.warn(`[RN Callstack] ${type} failed after ${attempts}:`, error),
  }) {
    return this.queueUpdate(async () => {
      if (!this.functionMap[type]) {
        console.warn(`[RN Callstack] No function mapped for ${type}`);
        return;
      }
      const call = { type, payload, attempts, onError };
      if (
        this.callstack.some(
          (c) =>
            c.type === type &&
            JSON.stringify(c.payload) === JSON.stringify(payload) &&
            c.attempts <= attempts
        )
      )
        return;
      this.callstack.push(call);
      await this.save();
    });
  }

  async processCall(call) {
    console.log(call);
    const { type, payload, attempts, onError } = call;
    try {
      const executor = this.functionMap[type];
      if (!executor) throw new Error(`No executor for ${type}`);
      // Pass the entire payload object—executor handles specific args
      const result = await executor(payload);
      if (!result.success) throw new Error("Call failed");
    } catch (error) {
      call.attempts = attempts + 1;
      if (call.attempts < this.maxAttempts) {
        this.callstack.push(call);
      } else {
        onError({ type, payload, attempts: call.attempts, error });
      }
    }
    await this.save();
  }

  runWorker() {
    if (this.running) return;
    this.running = true;
    const worker = async () => {
      while (this.running) {
        await this.queueUpdate(async () => {
          if (!this.callstack.length) return;
          const call = this.callstack.shift();
          await this.processCall(call);
        });
        await new Promise((resolve) => setTimeout(resolve, this.interval));
      }
    };
    worker().catch((err) =>
      console.error("[RN Callstack Worker] Failed:", err)
    );
  }

  stopWorker() {
    this.running = false;
  }
}

export default ReactNativeCallstack;
