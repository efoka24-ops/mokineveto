import { api } from './api';

export type PaymentMethod = 'ORANGE_MONEY' | 'MTN_MOMO' | 'CARD';

export interface PaymentResult {
  success: boolean;
  reference: string;
  message: string;
}

export interface PaymentInitResponse {
  success: boolean;
  data: {
    paymentId: string;
    paymentRequired: {
      amount: number;
      method: PaymentMethod;
      reference: string;
    };
  };
}

export interface PaymentCheckResponse {
  success: boolean;
  data: {
    id: string;
    status: 'PENDING' | 'SUCCEEDED' | 'FAILED';
    amount: number;
    method: PaymentMethod;
    createdAt: string;
  };
}

export async function initAppointmentPayment(params: {
  appointmentId: string;
  amount: number;
  method: PaymentMethod;
  phone?: string;
}): Promise<PaymentInitResponse> {
  return api.post<PaymentInitResponse>(
    '/payments/init-appointment',
    {
      appointmentId: params.appointmentId,
      method: params.method,
      phone: params.phone,
    },
    true
  );
}

export async function initFicheUnlockPayment(params: {
  ficheId: string;
  method: PaymentMethod;
  phone?: string;
}): Promise<PaymentInitResponse> {
  return api.post<PaymentInitResponse>(
    '/payments/init-fiche-unlock',
    {
      ficheId: params.ficheId,
      method: params.method,
      phone: params.phone,
    },
    true
  );
}

export async function initOrderPayment(params: {
  orderId: string;
  method: PaymentMethod;
  phone?: string;
}): Promise<PaymentInitResponse> {
  return api.post<PaymentInitResponse>(
    '/payments/init-order',
    {
      orderId: params.orderId,
      method: params.method,
      phone: params.phone,
    },
    true
  );
}

export async function checkPaymentStatus(paymentId: string): Promise<PaymentCheckResponse> {
  return api.get<PaymentCheckResponse>(`/payments/status/${paymentId}`, true);
}

export async function pay(params: {
  amount: number;
  method: PaymentMethod;
  phone?: string;
}): Promise<PaymentResult> {
  try {
    const result = await initAppointmentPayment({
      appointmentId: 'legacy-payment',
      amount: params.amount,
      method: params.method,
      phone: params.phone,
    });

    if (result.success) {
      return {
        success: true,
        reference: result.data.paymentRequired.reference,
        message: 'Paiement initié',
      };
    }
    return {
      success: false,
      reference: '',
      message: 'Échec du paiement',
    };
  } catch (_err) {
    return {
      success: false,
      reference: '',
      message: 'Erreur de paiement',
    };
  }
}

export const METHOD_LABEL: Record<PaymentMethod, string> = {
  CARD: 'Carte bancaire',
  ORANGE_MONEY: 'Orange Money',
  MTN_MOMO: 'MTN MoMo',
};
