import { createHmac } from 'node:crypto';

export async function notifyPaymentToFeishu(event: {
  eventType: string;
  eventId: string;
  data: Record<string, any>;
}) {
  const endpoint = process.env.FEISHU_PAYMENT_WEBHOOK;
  if (!endpoint) return;
  const url = new URL(endpoint);
  if (
    url.protocol !== 'https:' ||
    url.hostname !== 'open.feishu.cn' ||
    !url.pathname.startsWith('/open-apis/bot/v2/hook/')
  ) {
    throw new Error('invalid_feishu_webhook');
  }
  const labels: Record<string, string> = {
    'order.completed': '付款成功',
    'subscription.activated': '订阅已开通',
    'subscription.payment_succeeded': '订阅付款成功',
    'subscription.canceling': '订阅将在到期后取消',
    'subscription.uncanceled': '订阅已恢复',
    'subscription.canceled': '订阅已取消',
    'subscription.past_due': '订阅付款逾期',
    'refund.succeeded': '退款成功',
  };
  if (!labels[event.eventType]) return;
  const data = event.data;
  const body: Record<string, unknown> = {
    msg_type: 'text',
    content: {
      text: [
        `Qwen Image · ${labels[event.eventType]}`,
        `订单：${data.orderMerchantExternalId || data.orderMetadata?.orderNo || data.orderId || event.eventId}`,
        `事件：${event.eventType}`,
        `时间：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`,
      ].join('\n'),
    },
  };
  const secret = process.env.FEISHU_PAYMENT_SECRET;
  if (secret) {
    const timestamp = String(Math.floor(Date.now() / 1000));
    body.timestamp = timestamp;
    body.sign = createHmac('sha256', `${timestamp}\n${secret}`)
      .update('')
      .digest('base64');
  }
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
    redirect: 'error',
  });
  const result = await response.json();
  if (!response.ok || (result.code ?? result.StatusCode ?? -1) !== 0)
    throw new Error('feishu_notification_failed');
}
