import { useEffect, useReducer, useRef, useState } from 'react';
import agentApi from 'api/agentApi';

// Edge "lingers" briefly after the BE marks it complete so that even
// sub-second tool calls are visible to the eye.
const EDGE_LINGER_MS = 800;
// Reconnect backoff schedule (ms) — clamped at the last value.
const RECONNECT_BACKOFF = [500, 1000, 2000, 5000];
const TICK_INTERVAL_MS = 200;

const ORCHESTRATOR_ID = 'orchestrator';

const edgeKey = (from, to) => `${from}>${to}`;

// ── Reducer ──────────────────────────────────────────────────────────────────
//
// Maintains:
//   invokeCount:   { agentId: int }  — how many open invokes per agent
//   taskCount:     int               — number of in-flight chats
//   activeWorkers: Set<workerId>
//   activeJobs:    Set<jobId>
//   edges:         { edgeKey: { active: bool, expiresAt: number|null } }

const initialState = () => ({
  invokeCount: {},
  taskCount: 0,
  activeWorkers: new Set(),
  activeJobs: new Set(),
  edges: {}
});

function activateEdges(edges, edgeList) {
  if (!edgeList || edgeList.length === 0) return edges;
  const next = { ...edges };
  for (const e of edgeList) {
    const k = Array.isArray(e) ? edgeKey(e[0], e[1]) : e;
    next[k] = { active: true, expiresAt: null };
  }
  return next;
}

function lingerEdges(edges, edgeList, now) {
  if (!edgeList || edgeList.length === 0) return edges;
  const next = { ...edges };
  for (const e of edgeList) {
    const k = Array.isArray(e) ? edgeKey(e[0], e[1]) : e;
    next[k] = { active: false, expiresAt: now + EDGE_LINGER_MS };
  }
  return next;
}

function bumpInvoke(invokeCount, agentId, delta) {
  if (!agentId) return invokeCount;
  const next = { ...invokeCount };
  const v = (next[agentId] || 0) + delta;
  if (v <= 0) delete next[agentId];
  else next[agentId] = v;
  return next;
}

// Worker-driven edges: some background workers don't have a tool.call event,
// so we synthesize edges for them here.
const WORKER_EDGES = {
  image_describer: [edgeKey('orchestrator', 'image_describer'), edgeKey('image_describer', 'cache')],
  topic_classifier: [edgeKey('orchestrator', 'topic_classifier'), edgeKey('topic_classifier', 'turso')],
  cache_cleanup: [edgeKey('scheduler', 'cache'), edgeKey('cache', 'turso')]
};

// scheduler.fire start → light scheduler→<job target> edge while the job runs
const JOB_EDGES = {
  consolidate_agent_job: [edgeKey('scheduler', 'consolidate'), edgeKey('consolidate', 'turso')],
  cache_cleanup_job: [edgeKey('scheduler', 'cache')]
};

function reducer(state, action) {
  const now = Date.now();
  if (action.kind === 'snapshot') {
    // Reconcile from BE snapshot — wipes everything else.
    const ws = new Set(action.snapshot.active_workers || []);
    const js = new Set(action.snapshot.active_jobs || []);
    const edges = {};
    ws.forEach((w) => activateEdges(edges, WORKER_EDGES[w] || []));
    js.forEach((j) => activateEdges(edges, JOB_EDGES[j] || []));
    return {
      invokeCount: { ...(action.snapshot.agent_invokes || {}) },
      taskCount: (action.snapshot.active_tasks || []).length,
      activeWorkers: ws,
      activeJobs: js,
      edges
    };
  }
  if (action.kind === 'tick') {
    // Drop edges whose linger window has passed.
    let mutated = false;
    const next = { ...state.edges };
    for (const [k, v] of Object.entries(next)) {
      if (v.active) continue;
      if (v.expiresAt && v.expiresAt <= now) {
        delete next[k];
        mutated = true;
      }
    }
    return mutated ? { ...state, edges: next } : state;
  }
  if (action.kind === 'event') {
    const evt = action.event;
    switch (evt.type) {
      case 'chat.start':
        return { ...state, taskCount: state.taskCount + 1 };
      case 'chat.end':
        return { ...state, taskCount: Math.max(0, state.taskCount - 1) };
      case 'agent.invoke.start':
        return { ...state, invokeCount: bumpInvoke(state.invokeCount, evt.agent_id, +1) };
      case 'agent.invoke.end':
        return { ...state, invokeCount: bumpInvoke(state.invokeCount, evt.agent_id, -1) };
      case 'tool.call.start':
        return { ...state, edges: activateEdges(state.edges, evt.edges || []) };
      case 'tool.call.end':
        return { ...state, edges: lingerEdges(state.edges, evt.edges || [], now) };
      case 'worker.start': {
        const ws = new Set(state.activeWorkers);
        ws.add(evt.worker_id);
        return {
          ...state,
          activeWorkers: ws,
          edges: activateEdges(state.edges, WORKER_EDGES[evt.worker_id] || [])
        };
      }
      case 'worker.end': {
        const ws = new Set(state.activeWorkers);
        ws.delete(evt.worker_id);
        return {
          ...state,
          activeWorkers: ws,
          edges: lingerEdges(state.edges, WORKER_EDGES[evt.worker_id] || [], now)
        };
      }
      case 'scheduler.fire': {
        const js = new Set(state.activeJobs);
        if (evt.phase === 'start') {
          js.add(evt.job_id);
          return {
            ...state,
            activeJobs: js,
            edges: activateEdges(state.edges, JOB_EDGES[evt.job_id] || [])
          };
        }
        js.delete(evt.job_id);
        return {
          ...state,
          activeJobs: js,
          edges: lingerEdges(state.edges, JOB_EDGES[evt.job_id] || [], now)
        };
      }
      default:
        return state;
    }
  }
  return state;
}

// Map state → per-agent status (consumed by AgentDiagram).
//   orchestrator: 'task' if any chat is in flight, else fall back to invokeCount, else 'idle'
//   any other agent: 'online' if invokeCount>0 OR is a running worker/job, else 'idle'
function deriveAgentStatusMap(state) {
  const map = {};
  for (const [agentId, count] of Object.entries(state.invokeCount)) {
    if (count > 0) map[agentId] = 'online';
  }
  state.activeWorkers.forEach((w) => {
    map[w] = 'online';
  });
  state.activeJobs.forEach((j) => {
    if (j === 'consolidate_agent_job') map.consolidate = 'online';
    if (j === 'cache_cleanup_job') map.cache_cleanup = 'online';
  });
  // Orchestrator gets the spotlight while a chat is running.
  if (state.taskCount > 0) map[ORCHESTRATOR_ID] = 'task';
  else if (!map[ORCHESTRATOR_ID] && (state.invokeCount[ORCHESTRATOR_ID] || 0) > 0) {
    map[ORCHESTRATOR_ID] = 'online';
  }
  return map;
}

function deriveActiveEdges(state) {
  const set = new Set();
  for (const [k, v] of Object.entries(state.edges)) {
    if (v.active || (v.expiresAt && v.expiresAt > Date.now())) set.add(k);
  }
  return set;
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export default function useAgentEventStream() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [connected, setConnected] = useState(false);
  const sourceRef = useRef(null);
  const retryRef = useRef(0);
  const reconnectTimerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const reconcileSnapshot = async () => {
      try {
        const snap = await agentApi.getAgentState();
        if (!cancelled) dispatch({ kind: 'snapshot', snapshot: snap });
      } catch {
        // Snapshot is best-effort — keep current state if BE not reachable yet.
      }
    };

    const open = () => {
      if (cancelled) return;
      const url = agentApi.eventsUrl();
      const es = new EventSource(url);
      sourceRef.current = es;

      es.onopen = () => {
        if (cancelled) return;
        retryRef.current = 0;
        setConnected(true);
        // Snapshot after open so we re-sync if events were missed during reconnect.
        reconcileSnapshot();
      };

      es.onmessage = (e) => {
        if (cancelled) return;
        try {
          const evt = JSON.parse(e.data);
          if (evt.type === 'snapshot') dispatch({ kind: 'snapshot', snapshot: evt });
          else dispatch({ kind: 'event', event: evt });
        } catch {
          // Malformed frame — ignore.
        }
      };

      es.onerror = () => {
        if (cancelled) return;
        setConnected(false);
        es.close();
        sourceRef.current = null;
        const delay = RECONNECT_BACKOFF[Math.min(retryRef.current, RECONNECT_BACKOFF.length - 1)];
        retryRef.current += 1;
        reconnectTimerRef.current = setTimeout(open, delay);
      };
    };

    open();

    const tick = setInterval(() => dispatch({ kind: 'tick' }), TICK_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(tick);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (sourceRef.current) sourceRef.current.close();
      sourceRef.current = null;
    };
  }, []);

  return {
    agentStatusMap: deriveAgentStatusMap(state),
    activeEdges: deriveActiveEdges(state),
    connected,
    taskCount: state.taskCount
  };
}
