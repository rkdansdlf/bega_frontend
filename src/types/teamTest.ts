export interface TeamScore {
  [key: string]: number;
}

export interface Answer {
  label: string;
  teams: TeamScore;
}

export interface Question {
  id: number;
  question: string;
  description?: string;
  answers: Answer[];
}

export interface TeamTestInitialState {
  currentQuestion?: number;
  currentQuestionSelections?: Array<number | null>;
  direction?: number;
  questionTeamScores?: Array<TeamScore | null>;
  recommendedTeam?: string;
  selectedAnswer?: number | null;
  showResult?: boolean;
}

export interface TeamRecommendationTestProps {
  initialState?: TeamTestInitialState;
  isOpen: boolean;
  onClose: () => void;
  onSelectTeam: (team: string) => void;
}
