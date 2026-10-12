import designIntentContract from '../../contracts/ui-ux-design-intent-v1.json';
import pageProfileContract from '../../contracts/ui-ux-page-profiles-v1.json';
import proMaxLock from '../../contracts/ui-ux-pro-max-lock.json';

type PageProfile = (typeof pageProfileContract.profiles)[number];
type DesignIntentRule = (typeof designIntentContract.rules)[number];

const globToRegExp = (pattern: string) => {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const expression = escaped
    .replace(/\*\*/g, '\u0000')
    .replace(/\*/g, '[^/]*')
    .replace(/\u0000/g, '.*');
  return new RegExp(`^${expression}$`);
};

const componentFile = (componentId: string) => componentId.split('#', 1)[0].replace(/\\/g, '/');

export const resolveDesignIntent = (componentId: string) => {
  const file = componentFile(componentId);
  const profile = (pageProfileContract.profiles as PageProfile[]).find((candidate) => (
    candidate.match.some((pattern) => globToRegExp(pattern).test(file))
  ));
  const profileId = profile?.id ?? pageProfileContract.masterProfile.id;
  const rules = (designIntentContract.rules as DesignIntentRule[]).filter((rule) => (
    rule.profiles.includes('*') || rule.profiles.includes(profileId)
  ));
  return {
    profileId,
    profile,
    ruleIds: rules.map((rule) => rule.id),
    rules,
    stackGuidance: {
      reactProjectVersion: proMaxLock.projectStack.react,
      reactRecommendationVersion: proMaxLock.reactRecommendationVersion,
      applicability: proMaxLock.guidanceApplicability.react,
    },
  };
};
