import type { Metadata } from 'next'
import { LEGAL_CONTACT_EMAIL, LegalPage } from '@/components/legal/legal-page'

export const metadata: Metadata = {
  title: 'Normas de la comunidad — BibliaAPP',
  description:
    'Normas de la comunidad de BibliaAPP: qué contenido está permitido, qué está prohibido y cómo reportar abusos.',
}

export default function NormasComunidadPage() {
  return (
    <LegalPage title="Normas de la comunidad">
      <section>
        <h2>1. Propósito de la comunidad</h2>
        <p>
          Los espacios comunitarios de <strong>BibliaAPP</strong> (feed, grupos, peticiones de
          oración, comentarios y eventos) existen para <strong>edificar</strong>: compartir la
          Palabra, orar unos por otros, animar y acompañar. Estas normas aplican a todo lo que
          publiques —texto, imágenes y archivos— y complementan los{' '}
          <a href="/terminos">Términos y condiciones</a>.
        </p>
        <p>
          <strong>Regla general:</strong> si dudas de que algo edifique o de que tengas derecho
          a publicarlo, no lo publiques.
        </p>
      </section>

      <section>
        <h2>2. Contenido permitido</h2>
        <ul>
          <li>Versículos, reflexiones, devocionales y testimonios personales.</li>
          <li>Peticiones de oración y palabras de ánimo.</li>
          <li>Anuncios y actividades de tu congregación o grupo.</li>
          <li>
            Imágenes propias o con licencia que acompañen lo anterior (por ejemplo, imágenes de
            versículos creadas con la propia aplicación).
          </li>
          <li>Preguntas y conversaciones respetuosas sobre las Escrituras.</li>
        </ul>
      </section>

      <section>
        <h2>3. Contenido estrictamente prohibido</h2>
        <p>
          Lo siguiente se elimina sin previo aviso y puede causar la suspensión inmediata y
          definitiva de la cuenta:
        </p>
        <ul>
          <li>
            <strong>Contenido sexual o desnudez</strong> en cualquier grado, incluido el
            sugerente. Tolerancia cero con cualquier contenido que involucre a menores: además
            de la expulsión, se denunciará a las autoridades competentes.
          </li>
          <li>
            <strong>Violencia</strong>: imágenes o textos violentos, gore, autolesiones,
            amenazas o apología de la violencia.
          </li>
          <li>
            <strong>Odio y discriminación</strong> por origen, etnia, nacionalidad, sexo,
            discapacidad, condición social o religión, incluso disfrazados de «debate».
          </li>
          <li>
            <strong>Acoso</strong>: insultos, burlas, humillaciones, hostigamiento o exposición
            de conversaciones privadas.
          </li>
          <li>
            <strong>Datos personales de terceros</strong> (teléfonos, direcciones, fotos de
            otras personas) publicados sin su consentimiento. Esto incluye fotos donde
            aparezcan menores sin autorización de sus tutores.
          </li>
          <li>
            <strong>Material con derechos de autor</strong> que no te pertenece: libros,
            estudios, música, videos o imágenes sin licencia para compartirlos. Citar con
            atribución breve está bien; subir la obra, no.
          </li>
          <li>
            <strong>Suplantación</strong> de personas, pastores, congregaciones u
            organizaciones.
          </li>
          <li>
            <strong>Spam y fraude</strong>: publicidad, ventas, cadenas, sorteos, enlaces
            engañosos, esquemas de dinero o peticiones de dinero personales no verificadas.
          </li>
          <li>
            <strong>Contenido ilegal</strong> de cualquier tipo, incluida la promoción de
            drogas, armas o actividades delictivas.
          </li>
          <li>
            <strong>Desinformación peligrosa</strong>, por ejemplo consejos que sustituyan
            atención médica o profesional («deja tu tratamiento y solo ora»).
          </li>
        </ul>
      </section>

      <section>
        <h2>4. Reglas sobre imágenes y archivos subidos</h2>
        <p>Sé especialmente cuidadoso con lo que subes al servidor:</p>
        <ul>
          <li>Sube únicamente imágenes que tú creaste o que tienen licencia de uso.</li>
          <li>Nada de capturas de conversaciones privadas ni documentos de terceros.</li>
          <li>
            No subas fotos de otras personas sin su permiso; con menores, nunca sin permiso
            expreso de sus tutores.
          </li>
          <li>No uses la plataforma como almacén de archivos ajenos a su propósito.</li>
          <li>
            Los administradores pueden eliminar cualquier archivo que incumpla estas normas,
            sin previo aviso.
          </li>
        </ul>
      </section>

      <section>
        <h2>5. Convivencia y desacuerdos doctrinales</h2>
        <ul>
          <li>Trata a los demás con el respeto que enseñan las Escrituras.</li>
          <li>
            Los desacuerdos doctrinales se conversan con humildad; no se permiten ataques,
            descalificaciones ni campañas contra otras denominaciones, congregaciones o
            creyentes.
          </li>
          <li>Las peticiones de oración de otros son confidenciales: no las difundas fuera.</li>
        </ul>
      </section>

      <section>
        <h2>6. Moderación y consecuencias</h2>
        <ul>
          <li>
            Los administradores y moderadores pueden ocultar o eliminar contenido y restringir
            cuentas que incumplan estas normas.
          </li>
          <li>
            Según la gravedad: aviso → eliminación de contenido → suspensión temporal →
            expulsión definitiva. Las infracciones de la sección 3 pueden implicar expulsión
            inmediata sin aviso previo.
          </li>
          <li>Evadir una suspensión con otra cuenta implica el cierre de ambas.</li>
          <li>Las decisiones de moderación quedan registradas.</li>
        </ul>
      </section>

      <section>
        <h2>7. Cómo reportar</h2>
        <p>
          Si ves contenido o conductas que incumplen estas normas, repórtalo escribiendo a{' '}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a> con una captura o
          enlace de lo sucedido. Revisamos todos los reportes y actuamos a la brevedad posible.
          Los reportes son confidenciales.
        </p>
      </section>

      <section>
        <h2>8. Cambios a estas normas</h2>
        <p>
          Podemos actualizar estas normas cuando sea necesario; la versión vigente estará
          siempre publicada en esta página con su fecha de actualización.
        </p>
      </section>
    </LegalPage>
  )
}
