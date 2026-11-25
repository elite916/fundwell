'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { BoardLegend } from '@/components/studio/grid/board-legend';
import { ManageBoard } from '@/components/studio/grid/manage-board';
import { type GridScore, winnersOf } from '@/components/studio/grid/model';
import { ManageSquare, ManageSquareModal } from '@/features/contests/components/manage-square-modal';
import { ContestStatusType } from '@/features/contests/constants';
import { useRealtimeSquares } from '@/hooks/use-realtime-squares';

import css from './run.module.css';

interface DashboardGridClientProps {
  squares: ManageSquare[];
  rowTeamName: string;
  colTeamName: string;
  contestId: string;
  contestStatus: ContestStatusType;
  squarePrice: number;
  rowNumbers?: number[] | null;
  colNumbers?: number[] | null;
  scores?: GridScore[];
}

export function DashboardGridClient({
  squares,
  rowTeamName,
  colTeamName,
  contestId,
  contestStatus,
  squarePrice,
  rowNumbers,
  colNumbers,
  scores = [],
}: DashboardGridClientProps) {
  const router = useRouter();
  const [selectedSquare, setSelectedSquare] = useState<ManageSquare | null>(null);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const realtimeSquares = useRealtimeSquares(contestId, squares);

  const { latestId, quartersById } = winnersOf(scores);

  const handleSquareClick = (square: ManageSquare) => {
    setSelectedSquare(square);
    setIsManageModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsManageModalOpen(false);
    setSelectedSquare(null);
  };

  const handleSuccess = () => {
    // Refresh the page data
    router.refresh();
  };

  return (
    <>
      <p aria-hidden='true' className={css.top}>
        {colTeamName}
      </p>
      <div className={css.board}>
        <span aria-hidden='true' className={css.down}>
          {rowTeamName}
        </span>
        <ManageBoard
          squares={realtimeSquares as ManageSquare[]}
          rowTeamName={rowTeamName}
          colTeamName={colTeamName}
          rowNumbers={rowNumbers}
          colNumbers={colNumbers}
          scores={scores}
          onSelect={handleSquareClick}
        />
      </div>
      <BoardLegend
        className={css.legend}
        hasWinner={quartersById.size > 0}
        hasEarlierWinner={quartersById.size > (latestId ? 1 : 0)}
      />

      <ManageSquareModal
        isOpen={isManageModalOpen}
        onClose={handleCloseModal}
        square={selectedSquare}
        contestId={contestId}
        contestStatus={contestStatus}
        squarePrice={squarePrice}
        onSuccess={handleSuccess}
      />
    </>
  );
}
