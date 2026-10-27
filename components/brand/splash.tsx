import { APP_NAME } from '@/lib/brand'

/**
 * Animation d'ouverture, reprise de l'icône de l'appli : les trois zones (cuisine,
 * nutrition, sport) se rejoignent, puis le médaillon et ses feuilles poussent.
 *
 * - 1,6 s au total, une seule fois par lancement (sessionStorage) : jamais en changeant de page.
 * - Ne bloque rien : la page se charge derrière et l'animation laisse passer les appuis.
 * - Ignorée si le téléphone demande de réduire les animations.
 * - Pour la revoir pendant les tests : ajouter ?intro=1 à l'adresse.
 * Affichage piloté par la classe « splash-on » posée sur <html> (voir SPLASH_SCRIPT).
 */
export const SPLASH_SCRIPT = `(function(){try{var e=document.documentElement;var force=/[?&]intro=1/.test(location.search);if(!force&&(window.matchMedia('(prefers-reduced-motion: reduce)').matches||sessionStorage.getItem('eq-splash')))return;sessionStorage.setItem('eq-splash','1');e.classList.add('splash-on');setTimeout(function(){e.classList.remove('splash-on')},2000)}catch(_){}})()`

export function Splash() {
  return (
    <div className="splash" aria-hidden="true">
      <div className="splash-inner">
        <svg className="splash-mark" viewBox="0 0 200 200">
          <defs>
            <clipPath id="splash-clip"><rect x="4" y="4" width="192" height="192" rx="46" /></clipPath>
            <linearGradient id="splash-g" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#8DBB4C" /><stop offset="1" stopColor="#4C8A2F" /></linearGradient>
            <linearGradient id="splash-b" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#3FA3D4" /><stop offset="1" stopColor="#1C6FA0" /></linearGradient>
            <linearGradient id="splash-o" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#FAA040" /><stop offset="1" stopColor="#E35E1E" /></linearGradient>
          </defs>
          <g clipPath="url(#splash-clip)">
            <path className="splash-part splash-green" fill="url(#splash-g)"
              d="M0 0H108C96 35 106 70 100 100C70 112 35 118 0 142Z" />
            <path className="splash-part splash-blue" fill="url(#splash-b)"
              d="M108 0H200V118C165 108 130 104 100 100C106 70 96 35 108 0Z" />
            <path className="splash-part splash-orange" fill="url(#splash-o)"
              d="M0 142C35 118 70 112 100 100C130 104 165 108 200 118V200H0Z" />
            <path className="splash-seams" fill="none" stroke="#FFF9F1" strokeWidth="5" strokeLinecap="round"
              d="M108 0C96 35 106 70 100 100M0 142C35 118 70 112 100 100C130 104 165 108 200 118" />
          </g>
          <g className="splash-medal">
            <circle cx="100" cy="100" r="31" fill="#FFF9F1" stroke="#5F7D50" strokeWidth="4" />
            <path className="splash-leaf splash-leaf-l" d="M98 113C80 110 77 95 80 88C93 90 101 100 98 113Z" fill="#5F7D50" />
            <path className="splash-leaf splash-leaf-r" d="M102 113C101 97 112 87 121 88C121 102 113 111 102 113Z" fill="#8DBB4C" />
          </g>
        </svg>
        <p className="splash-name">{APP_NAME}</p>
        <p className="splash-tag">Mieux manger, bouger, se sentir bien</p>
      </div>
    </div>
  )
}
