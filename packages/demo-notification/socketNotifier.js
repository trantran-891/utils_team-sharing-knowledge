export function createSocketNotifier(io) {
  function emit(event, payload) {
    io.emit(event, payload);
    io.emit("system:log", {
      event,
      message: `Emitted ${event}`,
      createdAt: new Date().toISOString()
    });
  }

  return {
    topicsGenerated(payload) {
      emit("topics:generated", payload);
    },
    topicsNotify(payload) {
      emit("topics:notify", payload);
    },
    voteUpdated(payload) {
      emit("vote:updated", payload);
    },
    votingClosed(payload) {
      emit("voting:closed", payload);
    },
    docsCreated(payload) {
      emit("session:docs-created", payload);
    },
    sessionScheduled(payload) {
      emit("session:scheduled", payload);
    },
    feedbackUpdated(payload) {
      emit("feedback:updated", payload);
    }
  };
}
