// src/sources/youtube/network.ts

const NETWORK_FAILURE =
  /connection reset|ECONNRESET|timed out|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|network is unreachable|network is down|no route to host|connection refused|nodename nor servname|Unable to download API page|Connection aborted|Temporary failure in name resolution|EOF occurred in violation of protocol|not a bot|HTTP Error 429|Too Many Requests/i;

/**
 * True when an error says YouTube could not be reached at all (or is refusing this machine
 * wholesale, as its bot check does), as opposed to one video being unavailable.
 */
export function isNetworkFailure(message: string): boolean {
  return NETWORK_FAILURE.test(message);
}

const GONE = /video unavailable|private video|has been removed|account .* terminated|members-only/i;

/** True when the video itself is gone or closed to this account: nothing to retry soon. */
export function isVideoGone(message: string): boolean {
  return GONE.test(message);
}
