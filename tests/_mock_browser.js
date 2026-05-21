// In-memory mock of the parts of the WebExtensions API we use.
// Lets us require pure modules and any browser-aware glue from Node tests.

'use strict';

function createBrowserMock(initialStorage = {}) {
  const storage = { ...initialStorage };
  const listeners = { storageChanged: [], runtimeMessage: [], commands: [], alarms: [] };
  const alarms = new Map();

  const cloned = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

  const browser = {
    _state: { storage, alarms, listeners },

    storage: {
      local: {
        async get(keys) {
          if (keys == null) return cloned(storage);
          if (typeof keys === 'string') {
            return { [keys]: cloned(storage[keys]) };
          }
          if (Array.isArray(keys)) {
            const out = {};
            for (const k of keys) out[k] = cloned(storage[k]);
            return out;
          }
          // object: defaults
          const out = {};
          for (const k of Object.keys(keys)) {
            out[k] = storage[k] === undefined ? cloned(keys[k]) : cloned(storage[k]);
          }
          return out;
        },
        async set(items) {
          const changes = {};
          for (const k of Object.keys(items)) {
            changes[k] = { oldValue: cloned(storage[k]), newValue: cloned(items[k]) };
            storage[k] = cloned(items[k]);
          }
          for (const cb of listeners.storageChanged) cb(changes, 'local');
        },
        async remove(keys) {
          const arr = Array.isArray(keys) ? keys : [keys];
          const changes = {};
          for (const k of arr) {
            changes[k] = { oldValue: cloned(storage[k]), newValue: undefined };
            delete storage[k];
          }
          for (const cb of listeners.storageChanged) cb(changes, 'local');
        },
        async clear() {
          for (const k of Object.keys(storage)) delete storage[k];
        },
      },
      onChanged: { addListener: (cb) => listeners.storageChanged.push(cb) },
    },

    runtime: {
      _handlers: [],
      sendMessage: async (msg) => {
        for (const h of browser.runtime._handlers) {
          const result = h(msg, { id: 'test' }, () => {});
          if (result && typeof result.then === 'function') return result;
        }
        return undefined;
      },
      onMessage: { addListener: (cb) => browser.runtime._handlers.push(cb) },
      getURL: (p) => 'moz-extension://test/' + p,
    },

    tabs: {
      _tabs: [],
      create: async (opts) => {
        const t = { id: browser.tabs._tabs.length + 1, ...opts };
        browser.tabs._tabs.push(t);
        return t;
      },
      sendMessage: async () => undefined,
      query: async () => [],
    },

    menus: {
      create: () => 'menu-id',
      onClicked: { addListener: () => {} },
    },

    commands: {
      onCommand: { addListener: (cb) => listeners.commands.push(cb) },
      _trigger: (name) => listeners.commands.forEach((cb) => cb(name)),
    },

    alarms: {
      create: (name, info) => alarms.set(name, info),
      clear: async (name) => alarms.delete(name),
      get: async (name) => alarms.get(name),
      onAlarm: { addListener: (cb) => listeners.alarms.push(cb) },
      _trigger: (name) =>
        listeners.alarms.forEach((cb) => cb({ name, ...(alarms.get(name) || {}) })),
    },

    notifications: {
      create: () => 'notif-id',
    },

    i18n: {
      getMessage: (k) => k,
    },
  };

  return browser;
}

function installGlobalBrowserMock(initialStorage = {}) {
  const browser = createBrowserMock(initialStorage);
  globalThis.browser = browser;
  globalThis.chrome = browser; // many extensions use chrome alias
  return browser;
}

module.exports = { createBrowserMock, installGlobalBrowserMock };
