function legacySendAccessibilityEvent() {
  // No-op shim for web: native accessibility event bridge is mobile-only.
}

module.exports = legacySendAccessibilityEvent;
module.exports.default = legacySendAccessibilityEvent;
