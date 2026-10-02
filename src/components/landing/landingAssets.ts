import begaLogo from '../../assets/d8ca714d95aedcc16fe63c80cbc299c6e3858c70.png';
import begaMascot from '../../assets/27f7b8ac0aacea2470847e809062c7bbf0e4163f.webp';
import begaMascotAvatar from '../../assets/images/bega_mascot_avatar.webp';
import stadium from '../../assets/images/stadium_bg.webp';
import lgLogo from '../../assets/202a55c2e2083b7f096b21380d22d1769e56d762.png';
import doosanLogo from '../../assets/560639a3d1481dca02309d52b06d0efe43f355f7.png';
import kiaLogo from '../../assets/5162bdc3599041e7b7b1da494d7d0dcc490e5893.png';
import samsungLogo from '../../assets/24a312517fb1be189f3fae2611b33f19a72d9401.png';
import ssgLogo from '../../assets/b414fb1229152a89657a33002953975be2a9217b.png';
import lotteLogo from '../../assets/9e7d58fab40f3e586f2a0aaf6ee3c59993bcf101.png';
import ktLogo from '../../assets/bb63ace90c2b7b74e708cae2f562fbca654538ec.png';
import ncLogo from '../../assets/51e88fde588eb7cf7d5390b0fce1bb07ff440d2e.png';
import hanwhaLogo from '../../assets/d94cd6cb1a915d591b57bbca900f8268281068e3.png';
import kiwoomLogo from '../../assets/d97539563d3c93f568cb7a4331c9e607cfafe914.png';

export type TeamKey = 'lg' | 'doosan' | 'kia' | 'samsung' | 'ssg' | 'lotte' | 'kt' | 'nc' | 'hanwha' | 'kiwoom';

export const BEGA_LOGO_ASSET = begaLogo;
export const BEGA_MASCOT_ASSET = begaMascot;
// 24px 아바타 전용 소형 파생본. 큰 마스코트 원본(BEGA_MASCOT_ASSET)은 닫기 섹션 지연 로드 전용이라
// 첫 로드 경로(폰 목업)에서 참조하면 안 된다 (landing-first-load 감사 계약).
export const BEGA_MASCOT_AVATAR_ASSET = begaMascotAvatar;
export const STADIUM_ASSET = stadium;

export const TEAM_ASSETS: Record<TeamKey, string> = {
  lg: lgLogo,
  doosan: doosanLogo,
  kia: kiaLogo,
  samsung: samsungLogo,
  ssg: ssgLogo,
  lotte: lotteLogo,
  kt: ktLogo,
  nc: ncLogo,
  hanwha: hanwhaLogo,
  kiwoom: kiwoomLogo,
};
