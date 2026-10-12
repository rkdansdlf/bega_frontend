import PredictionRuntime from './prediction/PredictionRuntime';
import type { ReactNode } from 'react';

export type PredictionPageProps = {
  runtimeOverride?: ReactNode;
};

export default function Prediction({ runtimeOverride }: PredictionPageProps = {}) {
  return runtimeOverride !== undefined ? runtimeOverride : <PredictionRuntime />;
}
