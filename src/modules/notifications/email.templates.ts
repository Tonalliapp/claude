const APP_URL = process.env.APP_BASE_URL || 'https://tonalli.app';

function wrap(content: string): string {
  return `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #e5e5e5; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #b8860b, #daa520); padding: 32px; text-align: center;">
        <h1 style="margin: 0; color: #0a0a0a; font-size: 28px; font-weight: 700;">Tonalli</h1>
        <p style="margin: 8px 0 0; color: #1a1a1a; font-size: 14px;">Plataforma de gestion para restaurantes</p>
      </div>
      <div style="padding: 32px;">
        ${content}
        <hr style="border: none; border-top: 1px solid #333; margin: 24px 0;">
        <p style="color: #666; font-size: 12px; text-align: center;">
          &copy; ${new Date().getFullYear()} Tonalli — tonalli.app
        </p>
      </div>
    </div>
  `;
}

function button(text: string, url: string): string {
  return `
    <div style="text-align: center; margin: 32px 0;">
      <a href="${url}" style="background: linear-gradient(135deg, #b8860b, #daa520); color: #0a0a0a; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block;">
        ${text}
      </a>
    </div>
  `;
}

export function suspensionWarning(restaurantName: string): { subject: string; html: string } {
  return {
    subject: `Aviso: Tu cuenta sera suspendida — Tonalli`,
    html: wrap(`
      <h2 style="color: #daa520; margin: 0 0 16px;">Aviso importante</h2>
      <p style="line-height: 1.6;">
        Tu restaurante <strong>${restaurantName}</strong> tiene pagos pendientes.
        Si no se regulariza en los proximos dias, tu cuenta sera suspendida y tus clientes no podran acceder al menu digital.
      </p>
      ${button('Actualizar pago', `${APP_URL}/settings`)}
      <p style="line-height: 1.6; color: #888; font-size: 14px;">
        Si ya realizaste el pago, puedes ignorar este correo.
      </p>
    `),
  };
}

export function planUpgradeConfirmation(restaurantName: string, newPlan: string): { subject: string; html: string } {
  return {
    subject: `Plan actualizado a ${newPlan} — Tonalli`,
    html: wrap(`
      <h2 style="color: #daa520; margin: 0 0 16px;">Plan actualizado</h2>
      <p style="line-height: 1.6;">
        Tu restaurante <strong>${restaurantName}</strong> ahora tiene el plan <strong style="color: #daa520;">${newPlan}</strong>.
        Ya puedes disfrutar de todas las nuevas funcionalidades incluidas.
      </p>
      ${button('Ir al Dashboard', `${APP_URL}/dashboard`)}
    `),
  };
}

export function trialEndingReminder(restaurantName: string, daysLeft: number): { subject: string; html: string } {
  return {
    subject: `Tu prueba gratuita termina en ${daysLeft} dias — Tonalli`,
    html: wrap(`
      <h2 style="color: #daa520; margin: 0 0 16px;">Tu prueba esta por terminar</h2>
      <p style="line-height: 1.6;">
        La prueba gratuita de <strong>${restaurantName}</strong> termina en <strong style="color: #daa520;">${daysLeft} dias</strong>.
        Suscribete a un plan para mantener acceso a todas las funcionalidades.
      </p>
      ${button('Ver planes', `${APP_URL}/settings`)}
      <p style="line-height: 1.6; color: #888; font-size: 14px;">
        Si no te suscribes, tu cuenta sera limitada al plan basico.
      </p>
    `),
  };
}

export function paymentFailed(restaurantName: string): { subject: string; html: string } {
  return {
    subject: `Error en el pago de tu suscripcion — Tonalli`,
    html: wrap(`
      <h2 style="color: #daa520; margin: 0 0 16px;">Pago fallido</h2>
      <p style="line-height: 1.6;">
        No pudimos procesar el pago de la suscripcion de <strong>${restaurantName}</strong>.
        Verifica tu metodo de pago para evitar la suspension de tu cuenta.
      </p>
      ${button('Actualizar metodo de pago', `${APP_URL}/settings`)}
      <p style="line-height: 1.6; color: #888; font-size: 14px;">
        Stripe reintentara el cobro automaticamente. Si el problema persiste, contactanos.
      </p>
    `),
  };
}

export function lowStockAlert(
  restaurantName: string,
  items: { name: string; current: number; min: number; unit: string }[],
): { subject: string; html: string } {
  const rows = items
    .map(
      (i) =>
        `<tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #333;">${i.name}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #333; color: #e74c3c; font-weight: 600;">${i.current} ${i.unit}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #333; color: #888;">${i.min} ${i.unit}</td>
        </tr>`,
    )
    .join('');

  return {
    subject: `Alerta: ${items.length} ingrediente(s) con stock bajo — Tonalli`,
    html: wrap(`
      <h2 style="color: #daa520; margin: 0 0 16px;">Stock bajo detectado</h2>
      <p style="line-height: 1.6;">
        <strong>${restaurantName}</strong> tiene <strong style="color: #e74c3c;">${items.length} ingrediente(s)</strong> por debajo del minimo configurado:
      </p>
      <table style="width: 100%; border-collapse: collapse; background: #1a1a1a; border-radius: 8px; overflow: hidden; margin: 20px 0;">
        <thead>
          <tr style="background: #222;">
            <th style="padding: 10px 12px; text-align: left; color: #888; font-size: 12px;">Ingrediente</th>
            <th style="padding: 10px 12px; text-align: left; color: #888; font-size: 12px;">Actual</th>
            <th style="padding: 10px 12px; text-align: left; color: #888; font-size: 12px;">Minimo</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      ${button('Ver inventario', `${APP_URL}/dashboard/inventory`)}
    `),
  };
}

export function weeklyActivityDigest(
  restaurantName: string,
  stats: { orders: number; revenue: number; topProduct: string },
): { subject: string; html: string } {
  return {
    subject: `Resumen semanal de ${restaurantName} — Tonalli`,
    html: wrap(`
      <h2 style="color: #daa520; margin: 0 0 16px;">Resumen semanal</h2>
      <p style="line-height: 1.6;">Aqui esta el resumen de actividad de <strong>${restaurantName}</strong> esta semana:</p>
      <div style="background: #1a1a1a; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
          <span style="color: #888;">Pedidos</span>
          <strong style="color: #daa520;">${stats.orders}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
          <span style="color: #888;">Ingresos</span>
          <strong style="color: #4A8C6F;">$${stats.revenue.toLocaleString()}</strong>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #888;">Producto mas vendido</span>
          <strong style="color: #e5e5e5;">${stats.topProduct}</strong>
        </div>
      </div>
      ${button('Ver reportes completos', `${APP_URL}/dashboard/reports`)}
    `),
  };
}
