import type { Metadata } from 'next'
import { LEGAL_CONTACT_EMAIL, LegalPage } from '@/components/legal/legal-page'

export const metadata: Metadata = {
  title: 'Aviso de privacidad — BibliaAPP',
  description:
    'Aviso de privacidad de BibliaAPP: qué datos recopilamos, cómo los usamos y cómo eliminar tu cuenta.',
}

export default function PrivacidadPage() {
  return (
    <LegalPage title="Aviso de privacidad">
      <section>
        <h2>1. Responsable y alcance</h2>
        <p>
          Este aviso describe cómo <strong>BibliaAPP</strong> —aplicación cristiana sin fines de
          lucro disponible en <a href="https://biblia2.dvguzman.com">biblia2.dvguzman.com</a> y
          como app móvil para Android e iOS— recopila, usa y protege tus datos personales.
          Aplica tanto a la versión web como a la aplicación móvil, que comparten la misma
          cuenta y los mismos datos.
        </p>
        <p>
          Contacto para temas de privacidad:{' '}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>.
        </p>
      </section>

      <section>
        <h2>2. Datos que recopilamos</h2>
        <h3>Datos de cuenta</h3>
        <ul>
          <li>Nombre, correo electrónico, nombre de usuario y rol dentro de la plataforma.</li>
          <li>
            Contraseña, almacenada únicamente como hash criptográfico (scrypt); nunca en texto
            plano.
          </li>
          <li>Foto de perfil o avatar, si decides subir una.</li>
          <li>
            Si inicias sesión con Google: el nombre, correo y foto de perfil que Google nos
            entrega. No recibimos tu contraseña de Google.
          </li>
        </ul>
        <h3>Contenido que creas</h3>
        <ul>
          <li>Notas, cuadernos, resaltados, favoritos y progreso en planes de lectura.</li>
          <li>
            Publicaciones en la comunidad, peticiones de oración, participación en grupos y
            eventos, y comentarios.
          </li>
          <li>Imágenes y archivos que subas (por ejemplo, imágenes insertadas en notas).</li>
        </ul>
        <h3>Datos técnicos</h3>
        <ul>
          <li>Token de sesión (cookie en la web; almacén seguro del sistema en el móvil).</li>
          <li>
            Token de notificaciones push (Expo) si activas las notificaciones en el móvil.
          </li>
          <li>
            Registros técnicos del servidor (fecha, dirección IP, ruta solicitada) usados solo
            para seguridad y diagnóstico.
          </li>
        </ul>
        <p>
          No recopilamos tu ubicación, contactos, ni datos de otras aplicaciones. No usamos tus
          datos para publicidad ni los vendemos a terceros.
        </p>
      </section>

      <section>
        <h2>3. Para qué usamos tus datos</h2>
        <ul>
          <li>Crear y mantener tu cuenta, e iniciar sesión en web y móvil.</li>
          <li>
            Sincronizar entre dispositivos tus notas, resaltados, favoritos, planes y demás
            contenido.
          </li>
          <li>Mostrar tus publicaciones y actividad en los espacios comunitarios que uses.</li>
          <li>
            Enviarte correos transaccionales (verificación de cuenta, restablecimiento de
            contraseña) y notificaciones que hayas activado.
          </li>
          <li>Proteger el Servicio frente a abusos y resolver problemas técnicos.</li>
        </ul>
      </section>

      <section>
        <h2>4. Almacenamiento local en tus dispositivos</h2>
        <ul>
          <li>
            <strong>Web:</strong> cookie de sesión y preferencias (por ejemplo, tema visual) en
            el navegador.
          </li>
          <li>
            <strong>Móvil:</strong> el token de sesión se guarda en el almacén seguro del
            sistema (Keychain en iOS, EncryptedSharedPreferences en Android). Los capítulos
            bíblicos descargados para lectura sin conexión se guardan en una base de datos
            SQLite local, solo cuando la licencia de la traducción lo permite.
          </li>
          <li>
            La app móvil usa el selector de fotos del sistema para elegir imágenes puntuales; no
            accede a toda tu galería.
          </li>
        </ul>
      </section>

      <section>
        <h2>5. Terceros que intervienen en el Servicio</h2>
        <p>
          No compartimos tus datos con terceros para sus propios fines. Los siguientes
          proveedores procesan datos únicamente para operar funciones del Servicio:
        </p>
        <ul>
          <li>
            <strong>Google</strong> — inicio de sesión con Google (OAuth), si eliges usarlo.
          </li>
          <li>
            <strong>Expo</strong> — entrega de notificaciones push en el móvil, si las activas.
          </li>
          <li>
            <strong>Resend</strong> — envío de correos transaccionales (verificación,
            restablecimiento de contraseña).
          </li>
          <li>
            <strong>Unsplash</strong> — búsqueda de imágenes de fondo; solo se envía el término
            de búsqueda, nunca tus datos de cuenta.
          </li>
        </ul>
        <p>
          Los datos del Servicio se alojan en infraestructura propia administrada por el equipo
          de BibliaAPP.
        </p>
      </section>

      <section>
        <h2>6. Seguridad</h2>
        <ul>
          <li>Todas las comunicaciones viajan cifradas mediante HTTPS.</li>
          <li>Las contraseñas se almacenan con hash scrypt y sal aleatoria.</li>
          <li>Los tokens de sesión están cifrados (AES-256) y expiran a los 7 días.</li>
          <li>
            El acceso a los datos está limitado por roles; tus notas y cuadernos personales solo
            son visibles para ti salvo que decidas compartirlos.
          </li>
        </ul>
        <p>
          Ningún sistema es infalible; si detectamos un incidente de seguridad que afecte tus
          datos, te lo notificaremos por los medios disponibles.
        </p>
      </section>

      <section>
        <h2>7. Retención de datos</h2>
        <ul>
          <li>
            Los datos de tu cuenta y tu contenido se conservan mientras la cuenta esté activa.
          </li>
          <li>
            Los registros técnicos del servidor se conservan por un periodo breve con fines de
            seguridad y diagnóstico.
          </li>
          <li>
            Al eliminarse la cuenta, los datos personales se eliminan o anonimizan en un plazo
            máximo de 30 días, salvo obligación legal de conservación.
          </li>
        </ul>
      </section>

      <section>
        <h2>8. Eliminación de cuenta y datos</h2>
        <p>Para eliminar tu cuenta y los datos asociados:</p>
        <ul>
          <li>
            Envía un correo a{' '}
            <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a> desde la
            dirección registrada en tu cuenta, con el asunto «Eliminación de cuenta».
          </li>
          <li>
            Confirmaremos la solicitud y eliminaremos tu cuenta, notas, resaltados, favoritos,
            publicaciones, archivos subidos, tokens de sesión y tokens de notificaciones.
          </li>
          <li>
            El proceso se completa en un máximo de 30 días; recibirás confirmación al finalizar.
          </li>
        </ul>
        <p>
          La eliminación es irreversible. Si solo quieres dejar de recibir notificaciones,
          puedes desactivarlas desde tu perfil sin eliminar la cuenta.
        </p>
      </section>

      <section>
        <h2>9. Tus derechos</h2>
        <p>
          Puedes ejercer en cualquier momento tus derechos de acceso, rectificación, cancelación
          y oposición (ARCO), así como retirar tu consentimiento, escribiendo a{' '}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>. Buena parte de
          tus datos (nombre, avatar, notas, contenido) también puedes consultarlos, editarlos o
          eliminarlos directamente desde la aplicación.
        </p>
      </section>

      <section>
        <h2>10. Menores de edad</h2>
        <p>
          El Servicio no está dirigido a menores sin supervisión. Si eres madre, padre o tutor y
          crees que un menor nos ha proporcionado datos sin tu consentimiento, contáctanos para
          eliminarlos.
        </p>
      </section>

      <section>
        <h2>11. Cambios a este aviso</h2>
        <p>
          Publicaremos aquí cualquier actualización de este aviso con su fecha de vigencia. Los
          cambios significativos se anunciarán dentro de la aplicación antes de entrar en vigor.
        </p>
      </section>
    </LegalPage>
  )
}
