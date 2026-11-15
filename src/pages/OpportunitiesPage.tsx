import { OpportunityExplorer } from '../components/opportunities/OpportunityExplorer';
import { useOpportunitySource } from '../components/opportunities/useOpportunitySource';

export function OpportunitiesPage() {
  const source = useOpportunitySource();
  return <OpportunityExplorer {...source} />;
}
