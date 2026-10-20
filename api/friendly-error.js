export function friendlyError(err, fallback = 'We could not complete that request right now. Please try again in a moment.') {
  if (!err) return fallback;

  const message = typeof err?.message === 'string' ? err.message : '';
  if (!message) return fallback;

  const normalized = message.toLowerCase();

  if (normalized.includes('duplicate') || normalized.includes('already exists') || normalized.includes('unique constraint')) {
    return 'This information is already in use. Please review the details and try again.';
  }
  if (normalized.includes('permission') || normalized.includes('forbidden') || normalized.includes('policy')) {
    return 'You do not have permission to do that.';
  }
  if (normalized.includes('not found') || normalized.includes('no rows') || normalized.includes('does not exist')) {
    return 'We could not find that record. Please refresh and try again.';
  }
  if (normalized.includes('timeout') || normalized.includes('network') || normalized.includes('fetch') || normalized.includes('connection')) {
    return 'We are having trouble reaching the service right now. Please try again in a moment.';
  }
  if (normalized.includes('invalid input') || normalized.includes('check constraint') || normalized.includes('value too long') || normalized.includes('null value')) {
    return 'Some of the information provided is not valid. Please review it and try again.';
  }

  return fallback;
}
