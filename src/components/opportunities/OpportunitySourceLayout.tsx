import { createContext, useContext } from 'react';
import { Outlet } from 'react-router-dom';
import type { OpportunitySource } from './opportunityModel';
import { useOpportunitySource } from './useOpportunitySource';

const OpportunitySourceContext = createContext<OpportunitySource | null>(null);

export function OpportunitySourceLayout() {
  const source = useOpportunitySource();
  return <OpportunitySourceContext.Provider value={source}><Outlet /></OpportunitySourceContext.Provider>;
}

export function useSharedOpportunitySource() {
  const source = useContext(OpportunitySourceContext);
  if (!source) throw new Error('OpportunitySourceLayout is required.');
  return source;
}
