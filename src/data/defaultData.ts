import { OptionCard, RoutePlan } from '../types';

export const DEFAULT_OPTION_CARDS: OptionCard[] = [
  { id: 'c1', title: '看塔: 土城' },
  { id: 'c2', title: '看塔: 三峽' },
  { id: 'c3', title: '看塔: 五城' },
  { id: 'c4', title: '除戶' },
  { id: 'c5', title: '申請塔位' },
  { id: 'c6', title: '保留塔位' },
  { id: 'c7', title: '健保退費' },
  { id: 'c8', title: '退勞保、健保' },
];

export const DEFAULT_ROUTES: RoutePlan[] = [
  {
    id: 'r1',
    title: '路線A: 把塔看完',
    steps: [
      { id: 's1-1', cardId: 'c1' },
      { id: 's1-2', cardId: 'c2' },
      { id: 's1-3', cardId: 'c3' },
    ],
  },
  {
    id: 'r2',
    title: '路線B: 開始除戶申請塔位',
    steps: [
      { id: 's2-1', cardId: 'c4' },
      { id: 's2-2', cardId: 'c5' },
      { id: 's2-3', cardId: 'c8' },
    ],
  },
  {
    id: 'r3',
    title: '路線C: 卡位後去除戶',
    steps: [
      { id: 's3-1', cardId: 'c1' },
      { id: 's3-2', cardId: 'c6' },
      { id: 's3-3', cardId: 'c4' },
      { id: 's3-4', cardId: 'c7' },
    ],
  },
];
