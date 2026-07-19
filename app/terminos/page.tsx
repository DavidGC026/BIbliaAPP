import type { Metadata } from 'next'
import { LEGAL_CONTACT_EMAIL, LegalPage } from '@/components/legal/legal-page'

export const metadata: Metadata = {
  title: 'Términos y condiciones — BibliaAPP',
  description:
    'Términos y condiciones de uso de BibliaAPP (web y aplicación móvil).',
}

export default function TerminosPage() {
  return (
    <LegalPage title="Términos y condiciones de uso">
      <section>
        <h2>1. Aceptación de los términos</h2>
        <p>
          Estos términos regulan el uso de <strong>BibliaAPP</strong>, disponible como
          aplicación web en <a href="https://biblia2.dvguzman.com">biblia2.dvguzman.com</a> y
          como aplicación móvil para Android e iOS (en conjunto, el «Servicio»). Al crear una
          cuenta o utilizar el Servicio aceptas estos términos y el{' '}
          <a href="/privacidad">Aviso de privacidad</a>. Si no estás de acuerdo, no utilices el
          Servicio.
        </p>
      </section>

      <section>
        <h2>2. Descripción del Servicio</h2>
        <p>
          BibliaAPP es una aplicación cristiana <strong>sin fines de lucro</strong> creada para
          facilitar la lectura, el estudio y la reflexión de las Escrituras. Ofrece, entre otras
          funciones: lectura de traducciones bíblicas, versículo del día, notas y cuadernos de
          estudio, resaltados, favoritos, planes de lectura, diccionario, creación de imágenes
          con versículos y, para congregaciones, grupos, peticiones de oración, calendario de
          eventos y comunidad.
        </p>
        <p>
          El Servicio es gratuito. No vende el texto bíblico ni condiciona su lectura a pagos, y
          no muestra publicidad de terceros.
        </p>
      </section>

      <section>
        <h2>3. Cuentas de usuario</h2>
        <ul>
          <li>
            Algunas funciones (notas, resaltados, favoritos, grupos, comunidad) requieren una
            cuenta. La lectura bíblica básica y el versículo del día son públicos.
          </li>
          <li>
            Debes proporcionar información veraz al registrarte y mantener la confidencialidad
            de tu contraseña. Eres responsable de la actividad realizada desde tu cuenta.
          </li>
          <li>
            El registro puede realizarse con correo y contraseña o mediante tu cuenta de Google.
          </li>
          <li>
            Debes tener la edad mínima requerida en tu país para aceptar estos términos o contar
            con el consentimiento de tu madre, padre o tutor.
          </li>
          <li>
            Puedes solicitar la eliminación de tu cuenta en cualquier momento (ver sección de
            eliminación en el <a href="/privacidad">Aviso de privacidad</a>).
          </li>
        </ul>
      </section>

      <section>
        <h2>4. Conducta y uso aceptable</h2>
        <p>Al usar el Servicio te comprometes a no:</p>
        <ul>
          <li>
            Publicar contenido ilegal, difamatorio, amenazante, discriminatorio, sexualmente
            explícito, violento o que incite al odio.
          </li>
          <li>Suplantar a otras personas, congregaciones u organizaciones.</li>
          <li>Acosar, intimidar o dañar a otros usuarios.</li>
          <li>
            Difundir spam, malware, o intentar acceder sin autorización a cuentas ajenas o a la
            infraestructura del Servicio.
          </li>
          <li>
            Extraer, copiar o redistribuir de forma masiva el contenido del Servicio (incluido
            el texto bíblico) fuera de los usos permitidos por su licencia.
          </li>
        </ul>
        <p>
          El incumplimiento puede dar lugar a la eliminación de contenido, la suspensión o la
          cancelación de la cuenta, según la gravedad del caso.
        </p>
      </section>

      <section>
        <h2>5. Contenido publicado por los usuarios</h2>
        <ul>
          <li>
            Conservas la titularidad del contenido que creas (notas, publicaciones, imágenes,
            peticiones de oración, comentarios).
          </li>
          <li>
            Al publicar contenido visible para otros (comunidad, grupos), otorgas a BibliaAPP
            una licencia no exclusiva, gratuita y revocable para almacenarlo y mostrarlo dentro
            del Servicio, con el único fin de operar las funciones correspondientes.
          </li>
          <li>
            Tus notas, cuadernos, resaltados y favoritos personales son privados; solo se
            comparten si tú decides hacerlo.
          </li>
          <li>
            Solo debes subir imágenes y archivos sobre los que tengas derechos suficientes.
          </li>
        </ul>
      </section>

      <section>
        <h2>6. Moderación</h2>
        <p>
          En los espacios comunitarios (feed, grupos), los administradores pueden revisar,
          ocultar o eliminar contenido que infrinja estos términos o las{' '}
          <a href="/normas-comunidad">Normas de la comunidad</a>, así como suspender cuentas
          reincidentes. Puedes reportar contenido o conductas
          inapropiadas escribiendo a{' '}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>.
        </p>
      </section>

      <section>
        <h2>7. Texto bíblico y propiedad intelectual</h2>
        <ul>
          <li>
            Las traducciones bíblicas disponibles pertenecen a sus respectivos titulares y se
            distribuyen conforme a sus licencias. La atribución, el copyright y la licencia de
            cada traducción pueden consultarse dentro de la aplicación (sección «Información
            legal») .
          </li>
          <li>
            Algunas traducciones pueden tener restricciones de copia, descarga sin conexión,
            compartición o creación de imágenes; la aplicación aplica esas restricciones según
            la licencia de cada versión, y una traducción puede dejar de estar disponible si su
            licencia lo exige.
          </li>
          <li>
            El software, el diseño y los elementos gráficos propios de BibliaAPP pertenecen a
            sus autores. No se otorga ningún derecho sobre ellos más allá del uso personal del
            Servicio.
          </li>
          <li>
            Si consideras que algún contenido infringe tus derechos de autor, escríbenos a{' '}
            <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a> indicando el
            contenido afectado y la acreditación de tus derechos.
          </li>
        </ul>
      </section>

      <section>
        <h2>8. Disponibilidad y garantías</h2>
        <p>
          El Servicio se ofrece «tal cual» y «según disponibilidad», sin garantías de
          funcionamiento ininterrumpido o libre de errores. Al ser un proyecto sin fines de
          lucro, podemos modificar, suspender o descontinuar funciones (o el Servicio completo)
          en cualquier momento, procurando avisar con antelación razonable cuando afecte a tus
          datos.
        </p>
        <p>
          Te recomendamos conservar copias propias de la información importante. Cuando sea
          posible, facilitaremos mecanismos de exportación de tus notas.
        </p>
      </section>

      <section>
        <h2>9. Limitación de responsabilidad</h2>
        <p>
          En la máxima medida permitida por la ley, BibliaAPP y sus colaboradores no serán
          responsables de daños indirectos, pérdida de datos o perjuicios derivados del uso o
          la imposibilidad de uso del Servicio. Nada en estos términos limita responsabilidades
          que no puedan excluirse legalmente.
        </p>
      </section>

      <section>
        <h2>10. Suspensión y terminación</h2>
        <p>
          Podemos suspender o cancelar cuentas que incumplan estos términos. Tú puedes dejar de
          usar el Servicio y solicitar la eliminación de tu cuenta en cualquier momento. Tras la
          eliminación, tus datos se tratarán según lo descrito en el{' '}
          <a href="/privacidad">Aviso de privacidad</a>.
        </p>
      </section>

      <section>
        <h2>11. Cambios a estos términos</h2>
        <p>
          Podemos actualizar estos términos para reflejar cambios en el Servicio o en la ley.
          Publicaremos la versión vigente en esta página con su fecha de actualización; los
          cambios relevantes se anunciarán dentro de la aplicación. El uso continuado del
          Servicio tras la publicación implica la aceptación de los nuevos términos.
        </p>
      </section>

      <section>
        <h2>12. Ley aplicable y contacto</h2>
        <p>
          Estos términos se rigen por las leyes de los Estados Unidos Mexicanos. Cualquier
          controversia se someterá a los tribunales competentes de dicho país, salvo que la
          normativa de tu lugar de residencia disponga otra cosa de forma imperativa.
        </p>
        <p>
          Dudas o comentarios:{' '}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>.
        </p>
      </section>
    </LegalPage>
  )
}
