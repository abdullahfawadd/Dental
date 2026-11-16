export const referenceOrigin = 'https://aventuradentalarts.com';
export const localOrigin = 'http://127.0.0.1:4173';

export const routes = [
  '/',
  '/about',
  '/service/esthetic-dentistry',
  '/service/restorative-dentistry',
  '/service/preventive-care',
  '/service/beyond-the-smile',
  '/technology',
  '/contact',
  '/faq',
  '/laboratory',
  '/esthetic-dentistry/smile-makeovers',
  '/esthetic-dentistry/esthetic-bonding-and-contouring',
  '/esthetic-dentistry/teeth-whitening',
  '/esthetic-dentistry/porcelain-veneers',
  '/restorative-dentistry/implant-restoration',
  '/restorative-dentistry/crowns-and-bridges',
  '/restorative-dentistry/full-mouth-rehabilitation',
  '/restorative-dentistry/tooth-colored-fillings',
  '/preventive-care/oral-cancer-screenings',
  '/preventive-care/comprehensive-exams',
  '/preventive-care/deep-cleanings',
  '/preventive-care/fluoride-treatments',
  '/preventive-care/prophies',
  '/beyond-the-smile/botox-aesthetic-and-tmj-relief',
  '/beyond-the-smile/dermal-fillers',
  '/beyond-the-smile/custom-nightguards',
  '/beyond-the-smile/oral-appliance-therapy-for-sleep-apnea',
  '/technology/i-tero-digital-impressions',
  '/technology/solea-laser',
  '/technology/intra-oral-camera',
  '/technology/digital-imaging',
  '/technology/cad-cam-restorations',
  '/technology/3d-cat-scan',
];

export const viewports = [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
  { width: 768, height: 1024 },
  { width: 1920, height: 1080 },
  { width: 1024, height: 768 },
  { width: 320, height: 700 },
  { width: 1280, height: 800 },
  { width: 360, height: 800 },
  { width: 375, height: 812 },
  { width: 430, height: 932 },
];

export const screenshotTypes = ['viewport', 'full'];

export function caseId(route, viewport) {
  const page = route === '/' ? 'home' : route.slice(1).replaceAll('/', '--');
  return `${page}/${viewport.width}x${viewport.height}`;
}

export function pageUrl(origin, route) {
  return `${origin.replace(/\/$/, '')}${route}`;
}
