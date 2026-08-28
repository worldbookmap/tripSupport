'use client';

import { useEffect, useMemo, useState } from 'react';
import { Background, Controls, MiniMap, ReactFlow, type Edge, type Node, type NodeMouseHandler } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { HistoricalEvent, MindmapEdge, MindmapNode } from '@/lib/types';
import { LocationModal } from '@/components/map/LocationModal';
import { EventModal } from '@/components/timeline/EventModal';
import { BookPanel } from './BookPanel';
import { AuthorPanel } from './AuthorPanel';

const TYPE_COLORS: Record<MindmapNode['type'], string> = {
  author: '#7c3aed',
  book: '#059669',
  location: '#2563eb',
  event: '#d97706',
};

const COLUMN_ORDER: MindmapNode['type'][] = ['author', 'book', 'location', 'event'];
const COLUMN_X: Record<MindmapNode['type'], number> = { author: 0, book: 280, location: 560, event: 840 };

function layout(nodes: MindmapNode[]): Node[] {
  const byType: Record<MindmapNode['type'], MindmapNode[]> = { author: [], book: [], location: [], event: [] };
  nodes.forEach((n) => byType[n.type].push(n));

  const result: Node[] = [];
  COLUMN_ORDER.forEach((type) => {
    byType[type].forEach((n, i) => {
      result.push({
        id: n.id,
        position: { x: COLUMN_X[type], y: i * 90 },
        data: { label: n.label },
        style: {
          background: TYPE_COLORS[type],
          color: 'white',
          borderRadius: 8,
          padding: 8,
          fontSize: 12,
          border: 'none',
        },
      });
    });
  });
  return result;
}

type ActiveNode = { type: MindmapNode['type']; id: string };

export function MindmapView() {
  const [rawNodes, setRawNodes] = useState<MindmapNode[]>([]);
  const [rawEdges, setRawEdges] = useState<MindmapEdge[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeNode, setActiveNode] = useState<ActiveNode | null>(null);
  const [activeEvent, setActiveEvent] = useState<HistoricalEvent | null>(null);

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

  const nodes = useMemo(() => {
    const laidOut = layout(rawNodes);
    const term = search.trim().toLowerCase();
    if (!term) return laidOut;
    return laidOut.map((n) => {
      const original = rawNodes.find((r) => r.id === n.id);
      const matches = original?.label.toLowerCase().includes(term) ?? false;
      return { ...n, style: { ...n.style, opacity: matches ? 1 : 0.15 } };
    });
  }, [rawNodes, search]);

  const edges: Edge[] = useMemo(
    () => rawEdges.map((e) => ({ id: e.id, source: e.source, target: e.target, style: { stroke: '#94a3b8' } })),
    [rawEdges]
  );

  const handleNodeClick: NodeMouseHandler = async (_event, node) => {
    const [type, rawId] = node.id.split(':') as [MindmapNode['type'], string];
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

  return (
    <div className="relative flex-1">
      <div className="absolute left-4 top-4 z-10">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="작가, 책, 사건, 지역 검색"
          className="w-64 rounded border border-black/20 bg-white px-3 py-2 text-sm shadow dark:border-white/20 dark:bg-zinc-900"
        />
      </div>

      <div className="absolute inset-0">
        <ReactFlow nodes={nodes} edges={edges} onNodeClick={handleNodeClick} fitView>
          <Background />
          <Controls />
          <MiniMap />
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
