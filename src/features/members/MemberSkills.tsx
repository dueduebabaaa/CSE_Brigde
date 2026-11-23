import { SkillTag } from '../../components/ui';
import { skillLevels, type PublicProfile } from './memberDiscovery';

export function MemberSkills({ profile }: { profile: PublicProfile }) {
  return <div className="flex flex-wrap gap-1.5">
    {profile.tech_stacks?.map((skill) => {
      const proficiency = profile.tech_proficiency?.[skill];
      return <SkillTag key={skill} skill={skill} level={proficiency ? skillLevels[proficiency] : undefined} className="max-w-full break-all !whitespace-normal" />;
    })}
  </div>;
}
