// Tiny event bus used to tell Layout's sidebar badges (pending loan
// requests, pending ledger corrections) to recheck themselves right
// after something changes them -- approving/rejecting/withdrawing a
// loan request, or submitting/voting on a ledger correction -- rather
// than waiting for a group switch or full page reload.
export function notifyCountsChanged() {
  window.dispatchEvent(new Event("sacco:counts-changed"));
}
