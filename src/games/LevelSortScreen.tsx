import { useCallback, useMemo, useState } from 'react';
import { LevelSelect } from '../components/LevelSelect';
import { LoadingScreen } from '../components/LoadingScreen';
import { WithOverlay } from '../components/WithOverlay';
import type { DealCache } from './dealCache';
import type { Rods } from './hoops/logic';
import { RodSortGame, type SortRules } from './hoops/RodSortGame';
import { useProgress } from './useProgress';

type Props<T> = {
  game: string;
  title: string;
  deals: DealCache<T>;
  rules: (level: number) => SortRules;
  start: (deal: T) => Rods;
  onBack: () => void;
};

export function LevelSortScreen<T>({ game, title, deals, rules, start, onBack }: Props<T>) {
  const { level, unlocked, goTo, complete, loaded } = useProgress(game);
  const [picking, setPicking] = useState(false);
  const { deal, prepare } = deals.useDeal(loaded ? level : null);
  const levelRules = useMemo(() => rules(level), [rules, level]);
  const prepareNext = useCallback(() => prepare(level + 1), [prepare, level]);
  if (!deal) return <LoadingScreen title={title} onBack={onBack} />;
  const levels = picking && (
    <LevelSelect
      title={title}
      count={unlocked}
      unlocked={unlocked}
      current={level}
      onPick={(picked) => {
        goTo(picked);
        setPicking(false);
      }}
      onBack={() => setPicking(false)}
    />
  );
  return (
    <WithOverlay overlay={levels}>
      <RodSortGame
        key={level}
        start={start(deal)}
        rules={levelRules}
        title={title}
        label={`Level ${level}`}
        onBack={onBack}
        onLevels={() => setPicking(true)}
        nextLabel="Next level"
        onNext={() => goTo(level + 1)}
        onWin={() => complete(level + 1)}
        onWinShown={prepareNext}
      />
    </WithOverlay>
  );
}
