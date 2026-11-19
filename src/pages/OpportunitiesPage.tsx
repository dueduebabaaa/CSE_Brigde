import { OpportunityExplorer } from '../components/opportunities/OpportunityExplorer';
import { useSharedOpportunitySource } from '../components/opportunities/OpportunitySourceLayout';

export function OpportunitiesPage() {
  const source = useSharedOpportunitySource();
  return <OpportunityExplorer {...source} />;
}
