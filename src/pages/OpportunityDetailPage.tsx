import { useLocation, useParams } from 'react-router-dom';
import { OpportunityDetail } from '../components/opportunities/OpportunityDetail';
import { useOpportunitySource } from '../components/opportunities/useOpportunitySource';

export function OpportunityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { search } = useLocation();
  const source = useOpportunitySource();
  const opportunity = source.opportunities?.find((item) => item.id === id) ?? (source.opportunities ? null : undefined);
  return <OpportunityDetail {...source} opportunity={opportunity} backTo={'/opportunities' + search} />;
}
