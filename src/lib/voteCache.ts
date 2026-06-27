import type { QueryClient } from '@tanstack/react-query';

export type VoteType = 'helpful' | 'not-helpful';

// Every query whose cached data can contain a community post (a "bill").
// Voting anywhere must update all of these so the UI stays in sync across
// the Home list, Station details, and My Uploads without a refetch.
const VOTE_QUERY_PREFIXES: readonly (readonly unknown[])[] = [
  ['home-community-nearby'],
  ['home-station-prices'],
  ['station-prices'],
  ['my-bills'],
];

function isPost(obj: any): boolean {
  return (
    obj &&
    typeof obj === 'object' &&
    ('helpfulUsers' in obj || 'notHelpfulUsers' in obj || 'helpfulCount' in obj)
  );
}

function matchesId(obj: any, postId: string): boolean {
  return obj && (obj.id === postId || obj._id === postId);
}

// Toggle the current user's vote on a single post and keep both the user
// arrays and the *Count fields in sync (different screens read different ones).
export function togglePostVote(post: any, type: VoteType, userId: string) {
  const eq = (u: any) => String(u) === String(userId);
  let helpful = (post.helpfulUsers || []).filter((u: any) => !eq(u));
  let notHelpful = (post.notHelpfulUsers || []).filter((u: any) => !eq(u));

  const hadHelpful = (post.helpfulUsers || []).some(eq);
  const hadNotHelpful = (post.notHelpfulUsers || []).some(eq);

  if (type === 'helpful') {
    if (!hadHelpful) helpful = [...helpful, userId]; // toggle on (off = leave removed)
  } else {
    if (!hadNotHelpful) notHelpful = [...notHelpful, userId];
  }

  return {
    ...post,
    helpfulUsers: helpful,
    notHelpfulUsers: notHelpful,
    helpfulCount: helpful.length,
    notHelpfulCount: notHelpful.length,
  };
}

// Recursively walk a cached value, replacing the matching post wherever it
// appears (flat arrays, station.communityPrices[], single objects, ...).
// Returns the same reference when nothing changed so unrelated queries are
// left untouched (no needless re-renders).
function updateValue(value: any, postId: string, type: VoteType, userId: string): any {
  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((item) => {
      const updated = updateValue(item, postId, type, userId);
      if (updated !== item) changed = true;
      return updated;
    });
    return changed ? next : value;
  }
  if (value && typeof value === 'object') {
    if (isPost(value) && matchesId(value, postId)) {
      return togglePostVote(value, type, userId);
    }
    let changed = false;
    const next: any = { ...value };
    for (const key of Object.keys(value)) {
      const v = value[key];
      if (v && typeof v === 'object') {
        const updated = updateValue(v, postId, type, userId);
        if (updated !== v) {
          next[key] = updated;
          changed = true;
        }
      }
    }
    return changed ? next : value;
  }
  return value;
}

export type VoteSnapshot = Array<[readonly unknown[], unknown]>;

// Optimistically apply the vote to every relevant cache. Returns snapshots
// for rollback on error.
export async function applyVoteOptimistic(
  qc: QueryClient,
  postId: string,
  type: VoteType,
  userId: string
): Promise<VoteSnapshot> {
  const snapshots: VoteSnapshot = [];
  for (const prefix of VOTE_QUERY_PREFIXES) {
    await qc.cancelQueries({ queryKey: prefix });
    for (const [key, data] of qc.getQueriesData({ queryKey: prefix })) {
      const updated = updateValue(data, postId, type, userId);
      if (updated !== data) {
        snapshots.push([key, data]);
        qc.setQueryData(key, updated);
      }
    }
  }
  return snapshots;
}

export function rollbackVote(qc: QueryClient, snapshots?: VoteSnapshot) {
  if (!snapshots) return;
  for (const [key, data] of snapshots) qc.setQueryData(key, data);
}

// Reconcile with the server after the request settles.
export function invalidateVoteQueries(qc: QueryClient) {
  for (const prefix of VOTE_QUERY_PREFIXES) {
    qc.invalidateQueries({ queryKey: prefix });
  }
}
