'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  applyNodeChanges,
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeChange,
  type NodeMouseHandler,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from '@dagrejs/dagre';
import { BookOpen, Building2, Flag, Landmark, MapPin, Search, User, Waypoints } from 'lucide-react';
import type { HistoricalEvent, MindmapEdge, MindmapNode } from '@/lib/types';
import { LocationModal } from '@/components/map/LocationModal';
import { EventModal } from '@/components/timeline/EventModal';
import { BookPanel } from './BookPanel';
import { AuthorPanel } from './AuthorPanel';

const NODE_STYLE: Record<MindmapNode['type'], { icon: typeof User; color: string; ring: string; bg: string }> = {
  country: { icon: Flag, color: '#fdba74', ring: 'rgba(253,186,116,0.35)', bg: 'rgba(249,115,22,0.1)' },
  city: { icon: Building2, color: '#fca5a5', ring: 'rgba(252,165,165,0.35)', bg: 'rgba(244,63,94,0.1)' },
  author: { icon: User, color: '#c4b5fd', ring: 'rgba(196,181,253,0.35)', bg: 'rgba(139,92,246,0.12)' },
  book: { icon: BookOpen, color: '#6ee7b7', ring: 'rgba(110,231,183,0.3)', bg: 'rgba(16,185,129,0.1)' },
  location: { icon: MapPin, color: '#a5b4fc', ring: 'rgba(165,180,252,0.35)', bg: 'rgba(139,139,249,0.12)' },
  event: { icon: Landmark, color: '#e6c98a', ring: 'rgba(212,176,106,0.35)', bg: 'rgba(212,176,106,0.1)' },
};

function MindmapNodeCard({ data }: NodeProps) {
  const nodeData = data as unknown as { label: string; type: MindmapNode['type']; dimmed: boolean };
  const { icon: Icon, color, ring, bg } = NODE_STYLE[nodeData.type];
  return (
    <div
      className="flex max-w-[220px] items-center gap-2 rounded-xl border px-3 py-2 shadow-lg backdrop-blur-sm transition-opacity duration-200"
      style={{
        background: bg,
        borderColor: ring,
        opacity: nodeData.dimmed ? 0.15 : 1,
        boxShadow: `0 4px 20px -4px rgba(0,0,0,0.5)`,
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: color, border: 'none', width: 6, height: 6 }} />
      <Icon className="h-3.5 w-3.5 shrink-0" style={{ color }} strokeWidth={2.25} />
      <span className="truncate text-[12px] font-medium text-zinc-100">{nodeData.label}</span>
      <Handle type="source" position={Position.Right} style={{ background: color, border: 'none', width: 6, height: 6 }} />
    </div>
  );
}

const nodeTypes = { mindmap: MindmapNodeCard };

const NODE_W = 220;
const NODE_H = 40;

// 실제 연결 관계(나라→도시→지역→책/사건, 작가→책)를 기준으로 자동 배치합니다.
// 고정된 열 배치 대신 그래프 구조로 정렬하면, 무관한 노드들이 시각적으로 겹쳐서
// 마치 연결된 것처럼 보이는 착시를 줄일 수 있습니다.
function layout(nodes: MindmapNode[], edges: MindmapEdge[]): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'LR', nodesep: 28, ranksep: 120 });

  nodes.forEach((n) => g.setNode(n.id, { width: NODE_W, height: NODE_H }));
  edges.forEach((e) => {
    if (g.hasNode(e.source) && g.hasNode(e.target)) g.setEdge(e.source, e.target);
  });

  dagre.layout(g);

  return nodes.map((n) => {
    const pos = g.node(n.id);
    return {
      id: n.id,
      type: 'mindmap',
      position: { x: pos.x - NODE_W / 2, y: pos.y - NODE_H / 2 },
      data: { label: n.label, type: n.type, dimmed: false },
    };
  });
}

type ActiveNode = { type: MindmapNode['type']; id: string };

export function MindmapView() {
  const [rawNodes, setRawNodes] = useState<MindmapNode[]>([]);
  const [rawEdges, setRawEdges] = useState<MindmapEdge[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeNode, setActiveNode] = useState<ActiveNode | null>(null);
  const [activeEvent, setActiveEvent] = useState<HistoricalEvent | null>(null);

  const [positionedNodes, setPositionedNodes] = useState<Node[]>([]);

  async function refetchMindmap() {
    const res = await fetch('/api/mindmap');
    if (res.ok) {
      const data = await res.json();
      setRawNodes(data.nodes ?? []);
      setRawEdges(data.edges ?? []);
    }
  }

  useEffect(() => {
    refetchMindmap().finally(() => setLoading(false));
  }, []);

  // 데이터가 바뀔 때만 자동 배치를 다시 계산합니다. 드래그로 옮긴 위치는
  // onNodesChange가 반영하며, 여기서 매번 새로 계산하지 않습니다.
  useEffect(() => {
    setPositionedNodes(layout(rawNodes, rawEdges));
  }, [rawNodes, rawEdges]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setPositionedNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  const nodes = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return positionedNodes;
    return positionedNodes.map((n) => {
      const original = rawNodes.find((r) => r.id === n.id);
      const matches = original?.label.toLowerCase().includes(term) ?? false;
      return { ...n, data: { ...n.data, dimmed: !matches } };
    });
  }, [positionedNodes, rawNodes, search]);

  const edges: Edge[] = useMemo(
    () =>
      rawEdges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        style: { stroke: 'rgba(255,255,255,0.15)', strokeWidth: 1.5 },
      })),
    [rawEdges]
  );

  const handleNodeClick: NodeMouseHandler = async (_event, node) => {
    const sep = node.id.indexOf(':');
    const type = node.id.slice(0, sep) as MindmapNode['type'];
    const rawId = node.id.slice(sep + 1);
    if (type === 'country' || type === 'city') return;
    if (type === 'event') {
      const res = await fetch(`/api/events/${rawId}`);
      if (res.ok) {
        setActiveEvent(await res.json());
        setActiveNode({ type, id: rawId });
      }
      return;
    }
    setActiveNode({ type, id: rawId });
  };

  function closePanel() {
    setActiveNode(null);
    setActiveEvent(null);
  }

  if (loading) {
    return <p className="p-6 text-sm text-zinc-500">불러오는 중...</p>;
  }

  const isEmpty = rawNodes.length === 0;

  return (
    <div className="relative flex-1">
      <div className="absolute left-3 right-3 top-3 z-10 sm:left-4 sm:right-auto sm:top-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" strokeWidth={2.25} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="작가, 책, 사건, 지역 검색"
            className="w-full rounded-xl border border-white/[0.08] bg-surface/90 py-2 pl-9 pr-3 text-[13px] text-zinc-100 shadow-lg shadow-black/30 outline-none backdrop-blur-md transition-colors placeholder:text-zinc-500 focus:border-accent/50 focus:ring-2 focus:ring-accent/20 sm:w-64"
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(Object.keys(NODE_STYLE) as MindmapNode['type'][]).map((type) => {
            const { icon: Icon, color } = NODE_STYLE[type];
            const labelMap: Record<MindmapNode['type'], string> = {
              author: '작가',
              book: '책',
              country: '나라',
              city: '도시',
              location: '지역',
              event: '사건',
            };
            return (
              <span
                key={type}
                className="flex items-center gap-1 rounded-full border border-white/[0.06] bg-surface/70 px-2 py-1 text-[11px] font-medium text-zinc-400 backdrop-blur-sm"
              >
                <Icon className="h-3 w-3" style={{ color }} strokeWidth={2.25} />
                {labelMap[type]}
              </span>
            );
          })}
        </div>
      </div>

      {isEmpty && (
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 text-center">
          <Waypoints className="h-8 w-8 text-zinc-700" strokeWidth={1.5} />
          <p className="text-sm text-zinc-500">아직 연결된 데이터가 없습니다.</p>
        </div>
      )}

      <div className="absolute inset-0">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onNodeClick={handleNodeClick}
          colorMode="dark"
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background color="rgba(255,255,255,0.08)" gap={28} size={1.5} />
          <Controls showInteractive={false} />
          <MiniMap
            pannable
            zoomable
            maskColor="rgba(10,10,13,0.75)"
            nodeColor={(n) => NODE_STYLE[(n.data as { type: MindmapNode['type'] }).type]?.color ?? '#666'}
          />
        </ReactFlow>
      </div>

      {activeNode?.type === 'location' && (
        <LocationModal
          locationId={activeNode.id}
          onClose={closePanel}
          onSaved={refetchMindmap}
          onDeleted={() => {
            refetchMindmap();
            closePanel();
          }}
        />
      )}

      {activeNode?.type === 'event' && activeEvent && (
        <EventModal
          event={activeEvent}
          onClose={closePanel}
          onSaved={() => {
            refetchMindmap();
            closePanel();
          }}
        />
      )}

      {activeNode?.type === 'book' && (
        <BookPanel bookId={activeNode.id} onClose={closePanel} onChanged={refetchMindmap} />
      )}

      {activeNode?.type === 'author' && (
        <AuthorPanel authorId={activeNode.id} onClose={closePanel} onChanged={refetchMindmap} />
      )}
    </div>
  );
}
