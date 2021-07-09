# replace this

return {
  scheduleId: event.scheduleId,  // important
  success: true,
  result: {
    ...event,
    ...process.env,
  },
};

1. Docs
2. Diagram
3. Export resource, configuration