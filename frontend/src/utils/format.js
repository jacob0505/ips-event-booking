export const formatDaysUntil = (d) =>
  d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : `In ${d} days`;