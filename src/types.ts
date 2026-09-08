export interface OptionCard {
  id: string;
  title: string;
}

export interface RouteStep {
  id: string;
  cardId: string;
}

export interface RoutePlan {
  id: string;
  title: string;
  steps: RouteStep[];
}
