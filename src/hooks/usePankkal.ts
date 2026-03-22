'use client';

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

export interface PankkalBoard {
  id: string;
  title: string;
  parent_id: string | null;
}

export interface PankkalCard {
  id: string;
  title: string;
  content: string;
  type: 'note' | 'todo' | 'column' | 'unknown';
  x?: number;
  y?: number;
  w?: number;
  h?: number;
}

export interface PankkalRelationship {
  fromId: string;
  fromTitle: string;
  toId: string;
  toTitle: string;
  label: string;
}

export interface PankkalGroup {
  columnId: string;
  columnTitle: string;
  cards: PankkalCard[];
}

export interface PankkalBoardData {
  groups: PankkalGroup[];
  relationships: PankkalRelationship[];
  allCards: PankkalCard[];
}

function stripHtml(html: string): string {
  return html?.replace(/<[^>]*>/g, '').trim() || '';
}

export function usePankkal() {
  const { user } = useAuthStore();
  const [boards, setBoards] = useState<PankkalBoard[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchBoards = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await (supabase.from('boards') as any)
        .select('id, title, parent_id')
        .eq('user_id', user.id);
      
      console.log('[PanKKal] boards:', data, 'error:', error);
      
      if (error) throw error;
      setBoards(data || []);
    } catch (err) {
      console.error('Pankkal boards fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const fetchCardsFromBoard = useCallback(async (boardId: string): Promise<PankkalBoardData> => {
    if (!user) return { groups: [], relationships: [], allCards: [] };
    try {
      const { data, error } = await (supabase.from('board_snapshots') as any)
        .select('tldraw_snapshot')
        .eq('board_id', boardId)
        .eq('user_id', user.id)
        .single();

      if (error || !data) return { groups: [], relationships: [], allCards: [] };
      
      const snapshot = data.tldraw_snapshot;
      const store = snapshot?.document?.store || snapshot?.store || {};
      const allRecords = Object.values(store);
      
      const shapes: any[] = allRecords.filter((item: any) => item?.typeName === 'shape');
      const bindings: any[] = allRecords.filter((item: any) => item?.typeName === 'binding');

      const allItems: PankkalCard[] = shapes
        .filter((s: any) => 
          ['pankkal-note', 'pankkal-todo', 'pankkal-column'].includes(s.type)
        )
        .map((s: any) => {
          let rawContent = '';
          let type: PankkalCard['type'] = 'unknown';
          
          if (s.type === 'pankkal-note') {
            rawContent = s.props?.text || '';
            type = 'note';
          } else if (s.type === 'pankkal-todo') {
            rawContent = s.props?.text || '';
            type = 'todo';
          } else if (s.type === 'pankkal-column') {
            rawContent = s.props?.title || '';
            type = 'column';
          }

          const content = stripHtml(rawContent);
          const rawTitle = s.props?.title || s.props?.name || content.slice(0, 10) || '제목 없음';

          return {
            id: s.id,
            title: stripHtml(rawTitle),
            content,
            type,
            x: s.x || 0,
            y: s.y || 0,
            w: s.props?.w || s.width || 0,
            h: s.props?.h || s.height || 0,
          };
        });

      const columns = allItems.filter(i => i.type === 'column');
      const cards = allItems.filter(i => i.type !== 'column' && i.content.trim().length > 0);

      // Grouping logic (spatial containment)
      const groups: PankkalGroup[] = columns.map(col => {
        const containedCards = cards.filter(card => {
          const cx = card.x! + card.w! / 2;
          const cy = card.y! + card.h! / 2;
          return (
            cx >= col.x! && 
            cx <= col.x! + col.w! && 
            cy >= col.y! && 
            cy <= col.y! + col.h!
          );
        });
        return {
          columnId: col.id,
          columnTitle: col.title,
          cards: containedCards,
        };
      });

      // Cards not in any column -> "Others"
      const groupedCardIds = new Set(groups.flatMap(g => g.cards.map(c => c.id)));
      const otherCards = cards.filter(c => !groupedCardIds.has(c.id));
      if (otherCards.length > 0) {
        groups.push({
          columnId: 'others',
          columnTitle: '기타',
          cards: otherCards,
        });
      }

      // Arrow Relationship logic
      const arrowShapes = shapes.filter(s => s.type === 'arrow');
      const relationships: PankkalRelationship[] = arrowShapes.map(arrow => {
        const startBinding = bindings.find(b => b.fromId === arrow.id && b.props?.terminal === 'start');
        const endBinding = bindings.find(b => b.fromId === arrow.id && b.props?.terminal === 'end');
        
        const fromId = startBinding?.toId || arrow.props?.start?.boundShapeId;
        const toId = endBinding?.toId || arrow.props?.end?.boundShapeId;
        
        if (!fromId || !toId) return null;
        
        const fromCard = cards.find(c => c.id === fromId);
        const toCard = cards.find(c => c.id === toId);
        
        if (!fromCard || !toCard) return null;
        
        return {
          fromId: fromCard.id,
          fromTitle: fromCard.title,
          toId: toCard.id,
          toTitle: toCard.title,
          label: stripHtml(arrow.props?.text || '') || '연결됨',
        };
      }).filter((r): r is PankkalRelationship => r !== null);

      return {
        groups: groups.filter(g => g.cards.length > 0),
        relationships,
        allCards: cards,
      };
    } catch (err) {
      console.error('Pankkal cards fetch error:', err);
      return { groups: [], relationships: [], allCards: [] };
    }
  }, [user]);

  return {
    boards,
    isLoading,
    fetchBoards,
    fetchCardsFromBoard,
  };
}
